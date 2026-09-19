import { useCallback, useEffect, useRef, useState } from 'react';
import type { Word } from '../types';
import { loadIndex, loadWords } from '../lib/data';
import { spellingMatches } from '../lib/srs';
import { getState } from '../lib/store';
import { speak } from '../lib/speech';
import { SpeakButton, WordDetails } from '../components/WordBits';

/** Dictation practice. Deliberately separate from the box system: results are not saved anywhere. */
export default function Spelling() {
  const [pool, setPool] = useState<Word[] | null>(null);
  const [error, setError] = useState('');
  const [word, setWord] = useState<Word | null>(null);
  const [input, setInput] = useState('');
  const [hint, setHint] = useState(0);
  const [result, setResult] = useState<null | boolean>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const ids = Object.entries(getState().cards)
        .filter(([, c]) => !c.k)
        .map(([id]) => Number(id));
      const words = await loadWords(ids, await loadIndex());
      setPool([...words.values()]);
    })().catch((e) => setError(String(e.message ?? e)));
  }, []);

  const pick = useCallback(() => {
    if (!pool?.length) return;
    let w = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) while (w.id === word?.id) w = pool[Math.floor(Math.random() * pool.length)];
    setWord(w);
    setInput('');
    setHint(0);
    setResult(null);
    speak(w.w);
    setTimeout(() => field.current?.focus(), 0);
  }, [pool, word]);

  useEffect(() => {
    if (pool?.length && !word) pick();
  }, [pool, word, pick]);

  if (error) return <p className="error">{error}</p>;
  if (!pool) return <p className="muted">Loading…</p>;
  if (!pool.length)
    return (
      <div className="card center">
        <h1>Spelling practice</h1>
        <p className="muted">This uses only words you have already met in Study. Learn a few words first, then come back.</p>
        <a className="button primary" href="#/study">
          Go to Study
        </a>
      </div>
    );
  if (!word) return null;

  const check = () => {
    if (result !== null || !input.trim()) return;
    const ok = spellingMatches(input, word.w);
    setResult(ok);
    setScore((s) => ({ right: s.right + (ok && hint === 0 ? 1 : 0), total: s.total + 1 }));
  };
  const addChar = (ch: string) => {
    const el = field.current;
    const at = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? at;
    setInput(input.slice(0, at) + ch + input.slice(end));
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(at + 1, at + 1);
    }, 0);
  };

  return (
    <div className="stack narrow">
      <div className="row between">
        <h1>Spelling practice</h1>
        <span className="muted small">
          {score.right} / {score.total} without hints · not saved, does not affect reviews
        </span>
      </div>
      <div className="card">
        <div className="row">
          <SpeakButton text={word.w} label="Play again" big />
          <div>
            <div className="gloss">{word.def}</div>
            <div className="muted small">Listen, then type the Swedish word{word.g ? ' (without en/ett)' : ''}.</div>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (result === null) check();
            else pick();
          }}
        >
          <div className="row">
            <input
              ref={field}
              className="spell"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              readOnly={result !== null}
              lang="sv"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Your answer"
            />
            {['å', 'ä', 'ö'].map((ch) => (
              <button type="button" key={ch} className="charkey" onClick={() => addChar(ch)} disabled={result !== null}>
                {ch}
              </button>
            ))}
          </div>
          {hint > 0 && result === null && (
            <div className="hint" lang="sv">
              {word.w.slice(0, hint)}
              <span className="muted">{word.w.slice(hint).replace(/[^ ]/g, '·')}</span>
            </div>
          )}
          <div className="row">
            {result === null ? (
              <>
                <button className="primary" type="submit">
                  Check (Enter)
                </button>
                <button type="button" onClick={() => setHint((h) => Math.min(word.w.length, h + 1))}>
                  Hint: reveal a letter
                </button>
              </>
            ) : (
              <button className="primary" type="submit" autoFocus>
                Next (Enter)
              </button>
            )}
          </div>
        </form>
        {result !== null && (
          <>
            <div className={result ? 'verdict ok' : 'verdict bad'}>{result ? 'Correct' : `Not quite – the word is “${word.w}”`}</div>
            <WordDetails word={word} />
          </>
        )}
      </div>
    </div>
  );
}
