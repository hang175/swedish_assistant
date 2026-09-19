import { LEVELS } from '../types';
import { loadIndex, loadMeta, useAsync } from '../lib/data';
import { dayLabel, dayNumber, isMastered, masteredByLevel, streak } from '../lib/srs';
import { useAppState } from '../lib/store';
import { Tile } from './Today';

export default function Stats() {
  const state = useAppState();
  const { data: index, error } = useAsync(loadIndex, []);
  const { data: meta } = useAsync(loadMeta, []);
  const today = dayNumber(new Date());
  const mastered = index ? masteredByLevel(index, state.cards) : undefined;
  const started: Record<string, number> = {};
  if (index) for (const w of index) if (state.cards[w.id]) started[w.lv] = (started[w.lv] ?? 0) + 1;

  const cards = Object.values(state.cards);
  const boxes = [1, 2, 3, 4, 5, 6].map((b) => cards.filter((c) => !c.k && c.b === b).length);
  const maxBox = Math.max(1, ...boxes);
  const recent = Array.from({ length: 14 }, (_, i) => today - 13 + i);
  const maxDay = Math.max(1, ...recent.map((d) => (state.days[d]?.n ?? 0) + (state.days[d]?.r ?? 0)));

  return (
    <div className="stack">
      <h1>Stats</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid3">
        <Tile label="Day streak" value={streak(state.days, today)} />
        <Tile label="Days completed" value={Object.values(state.days).filter((d) => d.done).length} />
        <Tile label="Mastered words" value={cards.filter((c) => isMastered(c)).length} />
      </div>

      <div className="card">
        <h2>Mastered by CEFR level</h2>
        <p className="muted small">A word counts as mastered from box 5 (or when marked as known).</p>
        {LEVELS.map((lv) => {
          const total = meta?.counts[lv] ?? 0;
          const m = mastered?.[lv] ?? 0;
          const s = started[lv] ?? 0;
          return (
            <div className="levelrow" key={lv}>
              <span className={`lv lv-${lv}`}>{lv}</span>
              <div className="progress two">
                <div className="started" style={{ width: `${total ? (100 * s) / total : 0}%` }} />
                <div style={{ width: `${total ? (100 * m) / total : 0}%` }} />
              </div>
              <b>
                {m} / {total}
              </b>
            </div>
          );
        })}
        <p className="muted small">Light bar: started · solid bar: mastered</p>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Boxes</h2>
          <div className="bars">
            {boxes.map((n, i) => (
              <div className="bar" key={i} title={`Box ${i + 1}: ${n} words`}>
                <span>{n}</span>
                <div style={{ height: `${(100 * n) / maxBox}%` }} />
                <small>{i + 1}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Last 14 days</h2>
          <div className="bars">
            {recent.map((d) => {
              const l = state.days[d];
              const n = (l?.n ?? 0) + (l?.r ?? 0);
              return (
                <div className={l?.done ? 'bar done' : 'bar'} key={d} title={`${dayLabel(d)}: ${l?.n ?? 0} new, ${l?.r ?? 0} reviews${l?.done ? ' – completed' : ''}`}>
                  <span>{n || ''}</span>
                  <div style={{ height: `${(100 * n) / maxDay}%` }} />
                  <small>{dayLabel(d).slice(8)}</small>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
