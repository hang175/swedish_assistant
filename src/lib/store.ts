/** Progress + settings, persisted in localStorage. One small object, one key. */
import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, type Card, type DayLog, type Settings } from './srs';
import { LEVELS } from '../types';

export interface AppState {
  v: 1;
  settings: Settings;
  cards: Record<number, Card>;
  days: Record<number, DayLog>;
  /** when the settings last changed (unix seconds) */
  st?: number;
  /** cards the user removed again (undo “known”): id → when. Needed so a sync does not bring them back. */
  gone?: Record<number, number>;
  /** words picked from lessons to learn next: id → when */
  want?: Record<number, number>;
  /** lesson progress: id → { p: times played through, d: marked done, t: last change } */
  lessons?: Record<string, LessonProgress>;
}

export interface LessonProgress {
  p: number;
  d?: 1;
  t: number;
}

export const nowSec = () => Math.floor(Date.now() / 1000);

const KEY = 'swedish-assistant/v1';
const empty = (): AppState => ({ v: 1, settings: { ...DEFAULT_SETTINGS }, cards: {}, days: {} });

function read(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return validate(JSON.parse(raw));
  } catch {
    /* corrupted or unavailable storage → start fresh in memory */
  }
  return empty();
}

let state: AppState = read();
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(update: (s: AppState) => AppState): void {
  state = update(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / blocked: keep working in memory */
  }
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export const updateSettings = (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch }, st: nowSec() }));

/** Throws a readable Error when the data does not look like one of our backups. */
export function validate(data: unknown): AppState {
  const fail = (why: string): never => {
    throw new Error(`Not a valid backup file: ${why}`);
  };
  if (!data || typeof data !== 'object') fail('not an object');
  const d = data as Record<string, unknown>;
  if (d.v !== 1) fail('unknown version');
  if (!d.cards || typeof d.cards !== 'object') fail('missing "cards"');
  if (!d.days || typeof d.days !== 'object') fail('missing "days"');
  const int = (x: unknown) => typeof x === 'number' && Number.isFinite(x);

  const cards: Record<number, Card> = {};
  for (const [id, c] of Object.entries(d.cards as Record<string, Record<string, unknown>>)) {
    if (!/^\d+$/.test(id) || !c || !int(c.b) || !int(c.d) || !int(c.s) || (c.b as number) < 1 || (c.b as number) > 6) fail(`bad card "${id}"`);
    cards[Number(id)] = { b: c.b as number, d: c.d as number, s: c.s as number, ...(c.k ? { k: 1 as const } : {}), ...(int(c.t) ? { t: c.t as number } : {}) };
  }
  const days: Record<number, DayLog> = {};
  for (const [day, l] of Object.entries(d.days as Record<string, Record<string, unknown>>)) {
    if (!/^\d+$/.test(day) || !l || !int(l.n) || !int(l.r)) fail(`bad day "${day}"`);
    days[Number(day)] = { n: l.n as number, r: l.r as number, ...(l.done ? { done: 1 as const } : {}) };
  }
  const s = (d.settings ?? {}) as Partial<Settings>;
  const clamp = (x: unknown, lo: number, hi: number, def: number) => (int(x) ? Math.min(hi, Math.max(lo, x as number)) : def);
  const settings: Settings = {
    newPerDay: Math.round(clamp(s.newPerDay, 0, 200, DEFAULT_SETTINGS.newPerDay)),
    reviewLimit: Math.round(clamp(s.reviewLimit, 0, 1000, DEFAULT_SETTINGS.reviewLimit)),
    startLevel: LEVELS.includes(s.startLevel as never) ? s.startLevel! : DEFAULT_SETTINGS.startLevel,
    autoSpeak: typeof s.autoSpeak === 'boolean' ? s.autoSpeak : DEFAULT_SETTINGS.autoSpeak,
    rate: clamp(s.rate, 0.5, 1.5, DEFAULT_SETTINGS.rate),
    voiceURI: typeof s.voiceURI === 'string' ? s.voiceURI : '',
    askGender: typeof s.askGender === 'boolean' ? s.askGender : DEFAULT_SETTINGS.askGender,
    lessonLang: s.lessonLang === 'zh' || s.lessonLang === 'both' ? s.lessonLang : 'en',
  };
  const gone: Record<number, number> = {};
  if (d.gone && typeof d.gone === 'object') for (const [id, t] of Object.entries(d.gone as Record<string, unknown>)) if (/^\d+$/.test(id) && int(t)) gone[Number(id)] = t as number;
  const want: Record<number, number> = {};
  if (d.want && typeof d.want === 'object') for (const [id, t] of Object.entries(d.want as Record<string, unknown>)) if (/^\d+$/.test(id) && int(t)) want[Number(id)] = t as number;
  const lessons: Record<string, LessonProgress> = {};
  if (d.lessons && typeof d.lessons === 'object')
    for (const [id, l] of Object.entries(d.lessons as Record<string, Record<string, unknown>>))
      if (l && int(l.p) && int(l.t) && /^[\w-]+$/.test(id)) lessons[id] = { p: l.p as number, t: l.t as number, ...(l.d ? { d: 1 as const } : {}) };
  return {
    v: 1,
    settings,
    cards,
    days,
    ...(int(d.st) ? { st: d.st as number } : {}),
    ...(Object.keys(gone).length ? { gone } : {}),
    ...(Object.keys(want).length ? { want } : {}),
    ...(Object.keys(lessons).length ? { lessons } : {}),
  };
}

export function exportBackup(): void {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `swedish-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function importBackup(next: AppState): void {
  setState(() => next);
}

export function resetAll(): void {
  setState(() => empty());
}

/** Queue a word from a lesson for today's new words (no effect if it is already being learned). */
export function wantWord(id: number): void {
  setState((s) => (s.cards[id] ? s : { ...s, want: { ...s.want, [id]: nowSec() } }));
}
export function unwantWord(id: number): void {
  setState((s) => {
    const want = { ...s.want };
    delete want[id];
    return { ...s, want };
  });
}
export function updateLesson(id: string, patch: Partial<LessonProgress>): void {
  setState((s) => {
    const cur = s.lessons?.[id] ?? { p: 0, t: 0 };
    return { ...s, lessons: { ...s.lessons, [id]: { ...cur, ...patch, t: nowSec() } } };
  });
}
