import { loadIndex, loadMeta, useAsync } from '../lib/data';
import { buildQueue, dayNumber, isMastered, streak } from '../lib/srs';
import { useAppState } from '../lib/store';
import { useSwedishVoices } from '../lib/speech';

export function VoiceNotice() {
  const voices = useSwedishVoices();
  if (voices === undefined || voices.length > 0) return null;
  return (
    <div className="notice">
      <b>This browser has no Swedish voice, so pronunciation is switched off.</b> (Otherwise an English voice would read the Swedish words with English
      sounds.) The fix on Windows: open this same address in <b>Microsoft Edge</b> – it has natural Swedish voices built in, nothing to install. Chrome and
      Firefox usually cannot see the Swedish voice from Windows Settings even after it is installed.
    </div>
  );
}

export default function Today() {
  const state = useAppState();
  const { data: index, error } = useAsync(loadIndex, []);
  const { data: meta } = useAsync(loadMeta, []);
  const today = dayNumber(new Date());
  const log = state.days[today] ?? { n: 0, r: 0 };
  const queue = index ? buildQueue({ words: index, cards: state.cards, today, settings: state.settings, log, want: state.want }) : [];
  const newLeft = queue.filter((q) => q.kind === 'new').length;
  const reviewsLeft = queue.filter((q) => q.kind === 'review').length;
  const newGoal = log.n + newLeft;
  const reviewGoal = log.r + reviewsLeft;
  const done = !!log.done && queue.length === 0;
  const run = streak(state.days, today);
  const cards = Object.values(state.cards);
  const total = meta ? Object.values(meta.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="stack">
      <VoiceNotice />
      {error && <p className="error">{error}</p>}
      <div className="card hero">
        <div>
          <h1>{done ? 'Today’s task is complete' : 'Today'}</h1>
          <p className="muted">
            {done
              ? 'Checked in. Come back tomorrow – the next day starts at 04:00.'
              : queue.length
                ? `${newLeft} new word${newLeft === 1 ? '' : 's'} and ${reviewsLeft} review${reviewsLeft === 1 ? '' : 's'} left. Finish them all to check in.`
                : 'Nothing is due right now.'}
          </p>
          <div className="row wrap">
            <a className="button primary" href="#/study">
              {done ? 'Study more' : log.n + log.r > 0 ? 'Continue' : 'Start studying'}
            </a>
            <a className="button" href="#/lessons">
              Lessons
            </a>
          </div>
        </div>
        <div className="streak" title="Consecutive days with the daily task completed">
          <b>{run}</b>
          <span>day streak</span>
        </div>
      </div>

      <div className="grid2">
        <Meter label="New words" value={log.n} goal={newGoal} />
        <Meter label="Reviews" value={log.r} goal={reviewGoal} />
      </div>

      <div className="grid3">
        <Tile label="Words started" value={cards.filter((c) => !c.k).length} />
        <Tile label="Mastered" value={cards.filter((c) => isMastered(c)).length} />
        <Tile label="Word bank" value={total || '…'} />
      </div>
    </div>
  );
}

function Meter({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = goal ? Math.min(100, (100 * value) / goal) : 100;
  return (
    <div className="card">
      <div className="row between">
        <span>{label}</span>
        <b>
          {value} / {goal}
        </b>
      </div>
      <div className="progress">
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card tile">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
