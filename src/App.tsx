import { lazy, Suspense, useEffect, useState } from 'react';
import Today from './pages/Today';
import Study from './pages/Study';
import { SyncBadge } from './components/Account';

const Lessons = lazy(() => import('./pages/Lessons'));
const Dictionary = lazy(() => import('./pages/Dictionary'));
const Spelling = lazy(() => import('./pages/Spelling'));
const Stats = lazy(() => import('./pages/Stats'));
const Grammar = lazy(() => import('./pages/Grammar'));
const Settings = lazy(() => import('./pages/Settings'));

const PAGES = [
  ['today', 'Today', Today],
  ['study', 'Study', Study],
  ['lessons', 'Lessons', Lessons],
  ['dictionary', 'Dictionary', Dictionary],
  ['spelling', 'Spelling', Spelling],
  ['grammar', 'Grammar', Grammar],
  ['stats', 'Stats', Stats],
  ['settings', 'Settings', Settings],
] as const;

const current = () => window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'today';

export default function App() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onHash = () => {
      setRoute(current());
      window.speechSynthesis?.cancel();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const page = PAGES.find(([id]) => id === route) ?? PAGES[0];
  const Page = page[2];

  return (
    <>
      <header className="top">
        <a className="brand" href="#/today">
          <span className="flag" aria-hidden="true" />
          Swedish Assistant
        </a>
        <nav>
          {PAGES.map(([id, label]) => (
            <a key={id} href={`#/${id}`} className={id === page[0] ? 'active' : ''}>
              {label}
            </a>
          ))}
        </nav>
        <SyncBadge />
      </header>
      <main>
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <Page key={page[0]} />
        </Suspense>
      </main>
    </>
  );
}
