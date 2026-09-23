import { useCallback, useEffect, useRef, useState } from 'react';
import type { Word } from '../types';
import { loadIndex, loadWords, useAsync } from '../lib/data';
import { loadLesson, loadLessonIndex, type LessonLine, type Token } from '../lib/lessons';
import { speakAsync, stopSpeaking } from '../lib/speech';
import { unwantWord, updateLesson, useAppState, wantWord } from '../lib/store';
import { statusOf } from '../lib/srs';
import { SpeakButton, WordDetails } from '../components/WordBits';
import { VoiceNotice } from './Today';

const lessonIdFromHash = () => window.location.hash.replace(/^#\/?lessons\/?/, '').split(/[/?]/)[0] || '';

export default function Lessons() {
  const [id, setId] = useState(lessonIdFromHash);
  useEffect(() => {
    const onHash = () => setId(lessonIdFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return id ? <LessonView id={id} key={id} /> : <LessonList />;
}

/* ------------------------------------------------------------------ list */

function LessonList() {
  const { data: list, error } = useAsync(loadLessonIndex, []);
  const { settings, lessons, cards } = useAppState();
  const zh = settings.lessonLang !== 'en';
  if (error) return <p className="error">{error}</p>;
  if (!list) return <p className="muted">Loading…</p>;
  const done = list.filter((l) => lessons?.[l.id]?.d).length;
  return (
    <div className="stack">
      <div className="row between wrap">
        <div>
          <h1>Lessons</h1>
          <p className="muted small">
            Short everyday dialogues. Listen line by line, play the whole conversation, repeat after the voice. {done} / {list.length} completed.
          </p>
        </div>
      </div>
      <VoiceNotice />
      <div className="lessonlist">
        {list.map((l, i) => {
          const p = lessons?.[l.id];
          const known = l.wordIds.filter((w) => statusOf(cards[w]) !== 'new').length;
          return (
            <a className={`card lessoncard ${p?.d ? 'done' : ''}`} href={`#/lessons/${l.id}`} key={l.id}>
              <div className="num">{i + 1}</div>
              <div className="body">
                <b lang="sv">{l.title.sv}</b>
                <div className="muted">{zh && settings.lessonLang === 'zh' ? l.title.zh : l.title.en}{settings.lessonLang === 'both' ? ` · ${l.title.zh}` : ''}</div>
                <div className="muted small">
                  <span className={`lv lv-${l.level}`}>{l.level}</span> {l.lines} lines · {known}/{l.wordIds.length} words already in your study · {p ? `played ${p.p}×` : 'not started'}
                </div>
              </div>
              {p?.d && <span className="check" title="Completed">✓</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ one lesson */

function LessonView({ id }: { id: string }) {
  const { data: lesson, error } = useAsync(() => loadLesson(id), [id]);
  const { settings, lessons, cards, want } = useAppState();
  const lang = settings.lessonLang;
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(settings.rate);
  const [hideText, setHideText] = useState(false);
  const [showTrans, setShowTrans] = useState(true);
  const [popup, setPopup] = useState<{ token: Token; word?: Word; line: LessonLine } | null>(null);
  const run = useRef(0);
  const progress = lessons?.[id];

  const stop = useCallback(() => {
    run.current++;
    stopSpeaking();
    setPlaying(false);
  }, []);
  useEffect(() => stop, [stop]);

  const playLine = useCallback(
    async (line: LessonLine, rate: number) => {
      if (line.audio) {
        await new Promise<void>((resolve) => {
          const a = new Audio(import.meta.env.BASE_URL + line.audio);
          a.playbackRate = rate;
          a.onended = () => resolve();
          a.onerror = () => resolve();
          a.play().catch(() => resolve());
        });
      } else await speakAsync(line.sv, rate);
    },
    [],
  );

  const playFrom = useCallback(
    async (start: number) => {
      if (!lesson) return;
      const token = ++run.current;
      setPlaying(true);
      let i = start;
      for (;;) {
        for (; i < lesson.lines.length; i++) {
          if (run.current !== token) return;
          setCurrent(i);
          await playLine(lesson.lines[i], speed);
          if (run.current !== token) return;
          await new Promise((r) => setTimeout(r, 650));
        }
        updateLesson(id, { p: (lessons?.[id]?.p ?? 0) + 1 });
        if (!loop) break;
        i = 0;
      }
      setPlaying(false);
      setCurrent(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson, speed, loop, id, playLine],
  );

  const playOne = useCallback(
    (i: number) => {
      stop();
      setCurrent(i);
      void playLine(lesson!.lines[i], speed);
    },
    [lesson, speed, stop, playLine],
  );

  const openToken = useCallback(
    async (token: Token, line: LessonLine) => {
      if (token.id === undefined && !token.v) return;
      setPopup({ token, line });
      if (token.id !== undefined) {
        const words = await loadWords([token.id], await loadIndex());
        setPopup((p) => (p && p.token === token ? { ...p, word: words.get(token.id!) } : p));
      }
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === ' ') {
        e.preventDefault();
        if (playing) stop();
        else void playFrom(current ?? 0);
      } else if (e.key === 'Escape') setPopup(null);
      else if (lesson && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        const n = e.key.toLowerCase() === 'r' ? (current ?? 0) : Math.min(lesson.lines.length - 1, Math.max(0, (current ?? -1) + (e.key === 'ArrowDown' ? 1 : -1)));
        playOne(n);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, current, lesson, stop, playFrom, playOne]);

  if (error) return <p className="error">{error}</p>;
  if (!lesson) return <p className="muted">Loading…</p>;

  const tr = (l: { en: string; zh: string }) => (lang === 'en' ? l.en : lang === 'zh' ? l.zh : `${l.en} · ${l.zh}`);
  const glossary = new Map(lesson.vocab.map((v) => [v.sv.toLowerCase(), v]));

  return (
    <div className="lesson">
      <VoiceNotice />
      <div className="row between wrap">
        <a href="#/lessons" className="link">
          ← All lessons
        </a>
        <span className="muted small">
          <span className={`lv lv-${lesson.level}`}>{lesson.level}</span> {progress ? `played ${progress.p}×` : ''}
        </span>
      </div>
      <h1 lang="sv">{lesson.title.sv}</h1>
      <p className="muted">{tr(lesson.title)}</p>
      <p className="scene">{tr(lesson.scene)}</p>

      <div className="card player">
        <div className="row wrap">
          {playing ? (
            <button className="primary" onClick={stop}>
              ■ Stop (Space)
            </button>
          ) : (
            <button className="primary" onClick={() => void playFrom(current !== null && current < lesson.lines.length - 1 ? current : 0)}>
              ▶ Play all (Space)
            </button>
          )}
          <label className="inline">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
          </label>
          <label className="inline">
            Speed {speed.toFixed(2)}×
            <input type="range" min={0.5} max={1.3} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </label>
          <label className="inline">
            <input type="checkbox" checked={hideText} onChange={(e) => setHideText(e.target.checked)} /> Hide Swedish (listen first)
          </label>
          <label className="inline">
            <input type="checkbox" checked={showTrans} onChange={(e) => setShowTrans(e.target.checked)} /> Translations
          </label>
        </div>
        <p className="muted small keys">Click any line to hear it · ↑ ↓ previous / next line · R repeat · click a word for its meaning</p>
      </div>

      <div className="dialogue">
        {lesson.lines.map((line, i) => {
          const speakerIndex = [...new Set(lesson.lines.map((l) => l.who))].indexOf(line.who);
          return (
            <div className={`dline s${speakerIndex % 2} ${current === i ? 'current' : ''}`} key={i}>
              <div className="who">{line.who}</div>
              <div className="bubble" onClick={() => playOne(i)}>
                <div className={`sv ${hideText && current !== i ? 'hidden' : ''}`} lang="sv">
                  {line.tokens.map((t, j) => {
                    const linkable = t.id !== undefined || !!t.v;
                    const st = t.id !== undefined ? statusOf(cards[t.id]) : undefined;
                    return linkable ? (
                      <button
                        key={j}
                        className={`tok ${st ?? 'vocab'} ${t.id !== undefined && want?.[t.id] ? 'wanted' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void openToken(t, line);
                        }}
                      >
                        {t.t}
                      </button>
                    ) : (
                      <span key={j}>{t.t}</span>
                    );
                  })}
                </div>
                {showTrans && <div className="en">{tr(line)}</div>}
                {showTrans && line.note && <div className="lnote">{tr(line.note)}</div>}
              </div>
              <SpeakButton text={line.sv} label="Play line" />
            </div>
          );
        })}
      </div>

      {lesson.vocab.length > 0 && (
        <div className="card">
          <h2>Words and phrases in this lesson</h2>
          <div className="glossary">
            {lesson.vocab.map((v) => (
              <div key={v.sv}>
                <b lang="sv">{v.sv}</b> <span className="muted">{tr(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row wrap">
        {progress?.d ? (
          <button onClick={() => updateLesson(id, { d: undefined })}>Completed ✓ (click to undo)</button>
        ) : (
          <button className="primary" onClick={() => updateLesson(id, { d: 1 })}>
            Mark lesson as completed
          </button>
        )}
        <span className="muted small">Legend: <span className="tok new">not started</span> <span className="tok learning">learning</span> <span className="tok mastered">mastered</span> <span className="tok vocab">lesson phrase</span></span>
      </div>

      {popup && (
        <div className="overlay" onClick={() => setPopup(null)}>
          <div className="card popup" onClick={(e) => e.stopPropagation()}>
            {popup.word ? (
              <>
                <WordDetails word={popup.word} />
                <div className="row between wrap">
                  <span className="muted small">
                    {cards[popup.word.id]
                      ? `In your study: box ${cards[popup.word.id].b}`
                      : want?.[popup.word.id]
                        ? 'Queued for your next new words'
                        : `Not started yet (${popup.word.lv})`}
                  </span>
                  {!cards[popup.word.id] &&
                    (want?.[popup.word.id] ? (
                      <button onClick={() => unwantWord(popup.word!.id)}>Remove from queue</button>
                    ) : (
                      <button className="primary" onClick={() => wantWord(popup.word!.id)}>
                        Learn this word next
                      </button>
                    ))}
                </div>
              </>
            ) : popup.token.v ? (
              <div className="details">
                <div className="details-head">
                  <SpeakButton text={popup.token.v} label="Play" big />
                  <div>
                    <div className="hw" lang="sv">
                      {popup.token.v}
                    </div>
                    <div className="sub">lesson phrase</div>
                  </div>
                </div>
                <p className="gloss">{glossary.get(popup.token.v) ? tr(glossary.get(popup.token.v)!) : ''}</p>
                <p className="muted small">This phrase is explained in the lesson but is not a separate entry in the word bank.</p>
              </div>
            ) : (
              <p className="muted">Loading…</p>
            )}
            <button className="wide" onClick={() => setPopup(null)}>
              Close (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
