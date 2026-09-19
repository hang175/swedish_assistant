/**
 * Optional cloud sync through Supabase (email + password accounts).
 *
 * The app stays local-first: progress always lives in localStorage and everything works signed out
 * or offline. When signed in, the whole progress object is stored in one row of the `progress`
 * table (see supabase/schema.sql) and merged card-by-card with whatever is there.
 *
 * Configuration comes from two build-time variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Without them the app simply has no account section.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { mergeStates, sameState } from './merge';
import { getState, setState, subscribe, validate, type AppState } from './store';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloudEnabled = !!(URL_ && KEY_);

const supabase: SupabaseClient | null = cloudEnabled ? createClient(URL_!, KEY_!, { auth: { flowType: 'pkce' } }) : null;

export interface SyncStatus {
  email: string | null;
  phase: 'signedOut' | 'syncing' | 'synced' | 'error';
  error: string;
  lastSync: number | null;
  /** the user arrived through a password-reset e-mail and must choose a new password */
  recovery: boolean;
}

let status: SyncStatus = { email: null, phase: 'signedOut', error: '', lastSync: null, recovery: false };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
  );
}

/* ------------------------------------------------------------------ sync engine */

const OWNER_KEY = 'swedish-assistant/owner';
const PUSH_DELAY = 8000;
let userId: string | null = null;
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let lastPushed: AppState | null = null;
let busy: Promise<void> = Promise.resolve();

const owner = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};
const setOwner = (id: string) => {
  try {
    localStorage.setItem(OWNER_KEY, id);
  } catch {
    /* ignore */
  }
};

/** run sync jobs one after another */
function enqueue(job: () => Promise<void>): Promise<void> {
  busy = busy.then(job).catch((e: unknown) => {
    setStatus({ phase: 'error', error: e instanceof Error ? e.message : String(e) });
  });
  return busy;
}

async function fetchRemote(): Promise<AppState | null> {
  const { data, error } = await supabase!.from('progress').select('data').eq('user_id', userId!).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  try {
    return validate(data.data);
  } catch {
    return null; // unreadable cloud copy: treat as empty, the local copy will replace it
  }
}

async function upload(state: AppState): Promise<void> {
  const { error } = await supabase!.from('progress').upsert({ user_id: userId!, data: state, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  lastPushed = state;
  setStatus({ phase: 'synced', error: '', lastSync: Date.now() });
}

/** Download, merge with the local copy, store the result on both sides. */
function pullAndMerge(): Promise<void> {
  return enqueue(async () => {
    if (!userId) return;
    setStatus({ phase: 'syncing', error: '' });
    const remote = await fetchRemote();
    const local = getState();
    // progress left in this browser by a *different* account must not leak into this one
    const foreign = owner() !== null && owner() !== userId;
    const merged = remote ? (foreign ? remote : mergeStates(local, remote)) : foreign ? validate({ v: 1, cards: {}, days: {} }) : local;
    setOwner(userId);
    if (!sameState(merged, local)) {
      applyingRemote = true;
      try {
        setState(() => merged);
      } finally {
        applyingRemote = false;
      }
    }
    if (!remote || !sameState(merged, remote)) await upload(merged);
    else {
      lastPushed = merged;
      setStatus({ phase: 'synced', error: '', lastSync: Date.now() });
    }
  });
}

function pushNow(): Promise<void> {
  clearTimeout(pushTimer);
  return enqueue(async () => {
    if (!userId) return;
    const state = getState();
    if (lastPushed && sameState(state, lastPushed)) return;
    setStatus({ phase: 'syncing', error: '' });
    await upload(state);
  });
}

/** Replace the cloud copy with the local one without merging (after "Import backup" or "Reset"). */
export function overwriteCloud(): Promise<void> {
  clearTimeout(pushTimer);
  return enqueue(async () => {
    if (!userId) return;
    setStatus({ phase: 'syncing', error: '' });
    await upload(getState());
  });
}

export const syncNow = () => pullAndMerge();

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    // never call other supabase functions synchronously inside this callback
    setTimeout(() => {
      if (event === 'PASSWORD_RECOVERY') setStatus({ recovery: true });
      const id = session?.user.id ?? null;
      if (id === userId) return;
      userId = id;
      lastPushed = null;
      if (id) {
        setStatus({ email: session!.user.email ?? '', phase: 'syncing', error: '' });
        void pullAndMerge();
      } else {
        clearTimeout(pushTimer);
        setStatus({ email: null, phase: 'signedOut', error: '', lastSync: null });
      }
    }, 0);
  });

  // local change → upload a little later
  subscribe(() => {
    if (!userId || applyingRemote) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void pushNow(), PUSH_DELAY);
  });

  // leaving the tab: upload right away.  Coming back: fetch what another device may have done.
  document.addEventListener('visibilitychange', () => {
    if (!userId) return;
    if (document.visibilityState === 'hidden') void pushNow();
    else void pullAndMerge();
  });
  window.addEventListener('online', () => userId && void pullAndMerge());
}

/* ------------------------------------------------------------------ account actions */

const message = (e: { message: string } | null) => {
  if (!e) return '';
  if (/invalid login credentials/i.test(e.message)) return 'Wrong e-mail or password.';
  if (/email not confirmed/i.test(e.message)) return 'Please confirm your e-mail first – check your inbox for the confirmation link.';
  if (/already registered/i.test(e.message)) return 'This e-mail already has an account. Try signing in instead.';
  if (/failed to fetch|network/i.test(e.message)) return 'Could not reach the server. Are you online?';
  return e.message;
};
const here = () => window.location.origin + window.location.pathname;

/** Each action resolves to an error message ('' on success). */
export async function signIn(email: string, password: string): Promise<string> {
  const { error } = await supabase!.auth.signInWithPassword({ email, password });
  return message(error);
}

/** Returns 'confirm' when the project requires e-mail confirmation before the first sign-in. */
export async function signUp(email: string, password: string): Promise<{ error: string; confirm: boolean }> {
  const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: here() } });
  return { error: message(error), confirm: !error && !data.session };
}

export async function signOut(): Promise<void> {
  await pushNow();
  await supabase!.auth.signOut();
}

export async function sendPasswordReset(email: string): Promise<string> {
  const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: here() });
  return message(error);
}

export async function setNewPassword(password: string): Promise<string> {
  const { error } = await supabase!.auth.updateUser({ password });
  if (!error) setStatus({ recovery: false });
  return message(error);
}

/** Remove this account's progress from the cloud (the copy in this browser stays). */
export async function deleteCloudData(): Promise<string> {
  clearTimeout(pushTimer);
  const { error } = await supabase!.from('progress').delete().eq('user_id', userId!);
  if (!error) {
    lastPushed = null;
    await supabase!.auth.signOut();
  }
  return message(error);
}
