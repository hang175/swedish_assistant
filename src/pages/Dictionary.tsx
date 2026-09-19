import { useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, type Level, type Word } from '../types';
import { loadAll, useAsync } from '../lib/data';
import { knownCard, statusOf, type Status } from '../lib/srs';
import { nowSec, setState, useAppState } from '../lib/store';
import { headword, WordDetails } from '../components/WordBits';

const ROW = 44;
/** English words of a gloss, so that searching "hus" does not hit "thus" */
const englishCache = new WeakMap<Word, string[]>();
function english(w: Word): string[] {
  let e = englishCache.get(w);
  if (!e) englishCache.set(w, (e = [w.def, ...w.tr].join(' ').toLowerCase().split(/[^a-z'-]+/).filter(Boolean)));
  return e;
}
type Row = { kind: 'head'; lv: Level; count: number } | { kind: 'word'; word: Word };

export default function Dictionary() {
  const state = useAppState();
  const { data: all, error } = useAsync(loadAll, []);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [selected, setSelected] = useState<Word | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!all) return [];
    const q = query.trim().toLowerCase();
    const match = (w: Word) =>
      (level === 'all' || w.lv === level) &&
      (status === 'all' || statusOf(state.cards[w.id]) === status) &&
      (!q || w.w.toLowerCase().includes(q) || english(w).some((t) => t.startsWith(q)));
    const out: Row[] = [];
    for (const lv of LEVELS) {
      let words = all.filter((w) => w.lv === lv && match(w));
      if (q) {
        // exact and prefix hits first
        const score = (w: Word) => (w.w.toLowerCase() === q ? 0 : w.w.toLowerCase().startsWith(q) ? 1 : 2);
        words = words.slice().sort((a, b) => score(a) - score(b) || a.rank - b.rank);
      }
      if (!words.length) continue;
      out.push({ kind: 'head', lv, count: words.length });
      for (const word of words) out.push({ kind: 'word', word });
    }
    return out;
  }, [all, query, level, status, state.cards]);

  // virtual scrolling: only rows inside the viewport (plus a margin) are rendered
  const box = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [all]);
  useEffect(() => {
    box.current?.scrollTo({ top: 0 });
    setScroll(0);
  }, [query, level, status]);
  const first = Math.max(0, Math.floor(scroll / ROW) - 8);
  const last = Math.min(rows.length, Math.ceil((scroll + height) / ROW) + 8);

  if (error) return <p className="error">{error}</p>;
  if (!all) return <p className="muted">Loading the word bank…</p>;

  const card = selected ? state.cards[selected.id] : undefined;
  const markKnown = (w: Word) => setState((s) => ({ ...s, cards: { ...s.cards, [w.id]: knownCard(nowSec()) } }));
  const unmark = (w: Word) =>
    setState((s) => {
      const cards = { ...s.cards };
      delete cards[w.id];
      return { ...s, cards, gone: { ...s.gone, [w.id]: nowSec() } };
    });

  return (
    <div className="dict">
      <div className="dict-list">
        <div className="filters">
          <input type="search" placeholder="Search Swedish or English…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
          <select value={level} onChange={(e) => setLevel(e.target.value as Level | 'all')} aria-label="Level">
            <option value="all">All levels</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status | 'all')} aria-label="Status">
            <option value="all">Any status</option>
            <option value="new">Not started</option>
            <option value="learning">Learning</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>
        <div className="muted small">{rows.filter((r) => r.kind === 'word').length} words</div>
        <div className="vlist" ref={box} onScroll={(e) => setScroll(e.currentTarget.scrollTop)}>
          <div style={{ height: rows.length * ROW, position: 'relative' }}>
            {rows.slice(first, last).map((r, i) => {
              const top = (first + i) * ROW;
              if (r.kind === 'head')
                return (
                  <div className="vhead" key={`h-${r.lv}`} style={{ top, height: ROW }}>
                    <span className={`lv lv-${r.lv}`}>{r.lv}</span> {r.count} words
                  </div>
                );
              const st = statusOf(state.cards[r.word.id]);
              return (
                <button
                  key={r.word.id}
                  className={selected?.id === r.word.id ? 'vrow active' : 'vrow'}
                  style={{ top, height: ROW }}
                  onClick={() => setSelected(r.word)}
                >
                  <span className={`dot ${st}`} title={st} />
                  <b lang="sv">{headword(r.word)}</b>
                  <span className="def">{r.word.def}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dict-detail">
        {selected ? (
          <div className="card">
            <WordDetails word={selected} />
            <div className="row between wrap">
              <span className="muted small">
                {!card ? 'Not started yet' : card.k ? 'Marked as known – will not be asked' : `Box ${card.b} of 6${card.b >= 5 ? ' · mastered' : ''}`}
              </span>
              {card?.k ? (
                <button onClick={() => unmark(selected)}>Undo “known”</button>
              ) : (
                <button onClick={() => markKnown(selected)} title="Skip this word in Study and count it as mastered">
                  Mark as known
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card muted center">Select a word to see its details.</div>
        )}
      </div>
    </div>
  );
}
