import { useState } from 'react';
import { cloudEnabled, deleteCloudData, sendPasswordReset, setNewPassword, signIn, signOut, signUp, syncNow, useSyncStatus } from '../lib/sync';

export default function Account() {
  const status = useSyncStatus();
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!cloudEnabled)
    return (
      <section className="card">
        <h2>Account &amp; sync</h2>
        <p className="muted small">Cloud sync is not set up in this copy of the app, so progress stays in this browser only. Use the backup below to move it.</p>
      </section>
    );

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      setError(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (status.recovery)
    return (
      <section className="card">
        <h2>Choose a new password</h2>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const err = await setNewPassword(password);
              if (!err) {
                setPassword('');
                setInfo('Password changed.');
              }
              return err;
            });
          }}
        >
          <input type="password" autoComplete="new-password" minLength={8} required placeholder="New password (at least 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="primary" disabled={busy}>
            Save new password
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    );

  if (status.email !== null)
    return (
      <section className="card">
        <h2>Account &amp; sync</h2>
        <p>
          Signed in as <b>{status.email}</b>
        </p>
        <p className="muted small">
          {status.phase === 'syncing' && 'Syncing…'}
          {status.phase === 'synced' && `Progress is saved to your account – last synced ${status.lastSync ? new Date(status.lastSync).toLocaleTimeString() : ''}.`}
          {status.phase === 'error' && <span className="badText">Sync problem: {status.error}. Your progress is still safe in this browser and will be uploaded on the next try.</span>}
        </p>
        {info && <p className="okText small">{info}</p>}
        {error && <p className="error">{error}</p>}
        <div className="row wrap">
          <button onClick={() => void syncNow()} disabled={status.phase === 'syncing'}>
            Sync now
          </button>
          <button onClick={() => void run(async () => (await signOut(), ''))} disabled={busy}>
            Sign out
          </button>
          {confirmDelete ? (
            <>
              <button className="danger" disabled={busy} onClick={() => void run(deleteCloudData).then(() => setConfirmDelete(false))}>
                Yes, delete my cloud copy
              </button>
              <button onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}>Delete my cloud data…</button>
          )}
        </div>
        {confirmDelete && <p className="muted small">This removes your progress from the server and signs you out. The copy in this browser is kept.</p>}
      </section>
    );

  return (
    <section className="card">
      <h2>Account &amp; sync</h2>
      <p className="muted small">
        Optional. Sign in to keep your progress in the cloud and continue on your phone or another computer. Progress you already have in this browser is kept
        and merged into your account.
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (mode === 'in') return signIn(email, password);
            if (mode === 'forgot') {
              const err = await sendPasswordReset(email);
              if (!err) setInfo('If this e-mail has an account, a reset link is on its way. Open it on this device.');
              return err;
            }
            const res = await signUp(email, password);
            if (!res.error && res.confirm) setInfo('Almost done: open the confirmation link we sent to your e-mail, then sign in here.');
            if (!res.error && res.confirm) setMode('in');
            return res.error;
          });
        }}
      >
        <input type="email" autoComplete="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'forgot' && (
          <input
            type="password"
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
            minLength={mode === 'up' ? 8 : undefined}
            required
            placeholder={mode === 'up' ? 'Password (at least 8 characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <button className="primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}
        </button>
        {error && <p className="error">{error}</p>}
        {info && <p className="okText small">{info}</p>}
      </form>
      <div className="row wrap small">
        {mode !== 'in' && (
          <button className="link" onClick={() => setMode('in')}>
            I already have an account
          </button>
        )}
        {mode !== 'up' && (
          <button className="link" onClick={() => setMode('up')}>
            Create an account
          </button>
        )}
        {mode !== 'forgot' && (
          <button className="link" onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        )}
      </div>
    </section>
  );
}

/** Tiny indicator for the header. */
export function SyncBadge() {
  const status = useSyncStatus();
  if (!cloudEnabled) return null;
  const label = status.email === null ? 'Sign in' : status.phase === 'error' ? 'Sync problem' : status.phase === 'syncing' ? 'Syncing…' : 'Synced';
  return (
    <a className={`syncbadge ${status.email === null ? 'out' : status.phase}`} href="#/settings" title={status.email ?? 'Sign in to sync your progress'}>
      <span className="dot" />
      {label}
    </a>
  );
}
