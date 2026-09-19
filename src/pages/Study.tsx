import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Word } from '../types';
import { loadIndex, loadWords } from '../lib/data';
import { answerCard, buildQueue, dayNumber, requeue, type QueueItem } from '../lib/srs';
import { getState, nowSec, setState } from '../lib/store';
import { speak, spokenForm } from '../lib/speech';
import { ExampleLine, headword, posLabel, WordDetails } from '../components/WordBits';
import { VoiceNotice } from './Today';

interface Session {
  queue: QueueItem[];
  words: Map<number, Word>;
  total: number;
  done: number;
}

function shuffle<T>(a: T[]): T[] {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function startSession(extraNew = 0): Promise<Session> {
  const index = await loadIndex();
  const s = getState();
  const today = dayNumber(new Date());
  const log = s.days[today];
  const settings = extraNew ? { ...s.settings, newPerDay: (log?.n ?? 0) + extraNew } : s.settings;
  const queue = buildQueue({ words: index, cards: s.cards, today, settings, log });
  const words = await loadWords(queue.map((q) => q.id), index);
  const usable = queue.filter((q) => words.has(q.id));
  return { queue: usable, words, total: usable.length, done: 0 };
}

export default function Study() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [turn, setTurn] = useState(0);
  const [article, setArticle] = useState<'en' | 'ett' | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const begin = useCallback((extra = 0) => {
    setSession(null);
    setPicked(null);
    setArticle(null);
    startSession(extra).then(setSession, (e) => setError(String(e.message ?? e)));
  }, []);
  useEffect(() => begin(), [begin]);

  const item = session?.queue[0];
  const word = item ? session!.words.get(item.id) : undefined;

  // nouns: first "en or ett?", then the meaning. The article stays hidden (and unspoken) until it is answered.
  const needsArticle = !!word && (word.g === 'en' || word.g === 'ett') && getState().settings.askGender;
  const articlePending = needsArticle && article === null;
  const articleOk = !needsArticle || article === word!.g;

  const options = useMemo(() => {
    if (!word) return [];
    const wrong = shuffle(word.dx.filter((d) => d !== word.def)).slice(0, 3);
    return shuffle([word.def, ...wrong]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, turn]);

  useEffect(() => {
    if (word && getState().settings.autoSpeak) speak(needsArticle ? word.w : spokenForm(word));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id, turn]);

  const choose = useCallback(
    (i: number) => {
      if (!session || !item || !word || picked !== null || articlePending || i >= options.length) return;
      setPicked(i);
      const correct = options[i] === word.def && articleOk;
      if (!item.retry) {
        const today = dayNumber(new Date());
        setState((s) => {
          const log = s.days[today] ?? { n: 0, r: 0 };
          return {
            ...s,
            cards: { ...s.cards, [item.id]: answerCard(s.cards[item.id], correct, today, nowSec()) },
            days: { ...s.days, [today]: item.kind === 'new' ? { ...log, n: log.n + 1 } : { ...log, r: log.r + 1 } },
          };
        });
      }
      setTimeout(() => nextRef.current?.focus(), 0);
    },
    [session, item, word, picked, options, articlePending, articleOk],
  );

  const chooseArticle = useCallback(
    (a: 'en' | 'ett') => {
      if (!word || !articlePending) return;
      setArticle(a);
      if (getState().settings.autoSpeak) speak(spokenForm(word));
    },
    [word, articlePending],
  );

  const next = useCallback(() => {
    if (!session || !item || !word || picked === null) return;
    const correct = options[picked] === word.def && articleOk;
    const rest = session.queue.slice(1);
    const queue = correct ? rest : requeue(rest, item);
    if (!queue.length) {
      const today = dayNumber(new Date());
      setState((s) => ({ ...s, days: { ...s.days, [today]: { ...(s.days[today] ?? { n: 0, r: 0 }), done: 1 } } }));
    }
    setSession({ ...session, queue, done: session.done + (correct ? 1 : 0) });
    setPicked(null);
    setArticle(null);
    setTurn((t) => t + 1);
  }, [session, item, word, picked, options, articleOk]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (articlePending) {
        if (e.key === '1' || e.key.toLowerCase() === 'e') chooseArticle('en');
        else if (e.key === '2' || e.key.toLowerCase() === 't') chooseArticle('ett');
        else if (e.key.toLowerCase() === 'r' && word) speak(word.w);
        return;
      }
      if (e.key >= '1' && e.key <= '4') choose(Number(e.key) - 1);
      else if (e.key === ' ' || e.key === 'Enter') {
        if (picked !== null) {
          e.preventDefault();
          next();
        }
      } else if (e.key.toLowerCase() === 'r' && word) speak(spokenForm(word));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, chooseArticle, articlePending, next, picked, word]);

  if (error) return <p className="error">{error}</p>;
  if (!session) return <p className="muted">Loading…</p>;

  if (!item || !word) {
    const log = getState().days[dayNumber(new Date())];
    const didSomething = !!log && log.n + log.r > 0;
    return (
      <div className="card center">
        <h1>{didSomething ? 'Done for today' : 'Nothing to study right now'}</h1>
        <p className="muted">
          {didSomething ? `Today: ${log!.n} new words, ${log!.r} reviews.` : 'No reviews are due and the daily new-word quota is used up (or set to 0 in Settings).'}
        </p>
        <div className="row center">
          <button className="primary" onClick={() => begin(10)}>
            Learn 10 more new words
          </button>
          <a className="button" href="#/today">
            Back to Today
          </a>
        </div>
      </div>
    );
  }

  const answered = picked !== null;
  const meaningOk = answered && options[picked] === word.def;
  const correct = meaningOk && articleOk;
  const question = word.ex[0];

  return (
    <div className="study">
      <VoiceNotice />
      <div className="progress" aria-label="Session progress">
        <div style={{ width: `${(100 * session.done) / Math.max(1, session.total)}%` }} />
      </div>
      <div className="muted small row between">
        <span>
          {session.done} / {session.total} done · {item.retry ? 'again' : item.kind === 'new' ? 'new word' : 'review'}
        </span>
        <span className="keys">1–4 answer (1/2 for en/ett) · Space next · R replay</span>
      </div>

      <div className="card">
        <div className="question">
          <div className="hw big" lang="sv">
            {articlePending ? (
              <>
                <span className="blank">___</span> {word.w}
              </>
            ) : needsArticle ? (
              <>
                <span className={articleOk ? 'art ok' : 'art bad'}>{word.g}</span> {word.w}
              </>
            ) : (
              headword(word)
            )}
          </div>
          <div className="sub">
            {posLabel(word.pos)} · <span className={`lv lv-${word.lv}`}>{word.lv}</span>
            <button className="link" onClick={() => speak(articlePending ? word.w : spokenForm(word))}>
              ▶ listen (R)
            </button>
          </div>
          {question && !answered && <ExampleLine ex={question} showEnglish={false} />}
        </div>

        {articlePending && (
          <div className="articles">
            <p className="muted center">en or ett?</p>
            <div className="grid2">
              <button className="option" onClick={() => chooseArticle('en')}>
                <kbd>1</kbd>
                <span>en</span>
              </button>
              <button className="option" onClick={() => chooseArticle('ett')}>
                <kbd>2</kbd>
                <span>ett</span>
              </button>
            </div>
          </div>
        )}
        {needsArticle && !articlePending && !answered && (
          <p className={articleOk ? 'small center okText' : 'small center badText'}>
            {articleOk ? `Right – ${word.g} ${word.w}. Now the meaning:` : `It is “${word.g} ${word.w}”, not “${article} ${word.w}”. Now the meaning:`}
          </p>
        )}

        <div className="options" hidden={articlePending}>
          {options.map((o, i) => {
            const cls = !answered ? '' : o === word.def ? 'right' : i === picked ? 'wrong' : 'dim';
            return (
              <button key={i} className={`option ${cls}`} onClick={() => choose(i)} disabled={answered}>
                <kbd>{i + 1}</kbd>
                <span>{o}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="after">
            <div className={correct ? 'verdict ok' : 'verdict bad'}>{correct
                ? 'Correct'
                : meaningOk
                  ? `Meaning right, but it is “${word.g} ${word.w}” – this word will come back in a moment`
                  : 'Not quite – this word will come back in a moment'}</div>
            <WordDetails word={word} />
            <button ref={nextRef} className="primary wide" onClick={next}>
              Next (Space)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
