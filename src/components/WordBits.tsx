import type { Example, Word } from '../types';
import { playClipAsync, speak, spokenForm } from '../lib/speech';

/** Plays a pre-generated clip when given, otherwise the browser voice. */
export function playClip(audio: string | undefined, text: string): void {
  if (!audio) return speak(text);
  void playClipAsync(audio, text);
}

export function SpeakButton({ text, label = 'Play', big, audio }: { text: string; label?: string; big?: boolean; audio?: string }) {
  return (
    <button type="button" className={big ? 'speak big' : 'speak'} title={label} aria-label={label} onClick={() => playClip(audio, text)}>
      <svg viewBox="0 0 24 24" width={big ? 22 : 16} height={big ? 22 : 16} aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

const POS_LABEL: Record<string, string> = {
  'noun-en': 'noun',
  'noun-ett': 'noun',
  'noun-en/-ett': 'noun',
  adjective: 'adjective',
  prep: 'preposition',
  conj: 'conjunction',
  subj: 'subjunction',
  det: 'determiner',
  interj: 'interjection',
  particip: 'participle',
  'aux verb': 'auxiliary verb',
};
export const posLabel = (pos: string) => POS_LABEL[pos] ?? pos;

/** Headword the way a learner should memorise it: "en bil", "ett hus", "att gå". */
export function headword(w: Pick<Word, 'w' | 'g' | 'pos'>): string {
  if (w.g === 'en' || w.g === 'ett') return `${w.g} ${w.w}`;
  if (w.g === 'en/ett') return `en/ett ${w.w}`;
  return w.w;
}

/** Folkets lists inflections without labels; label them when the paradigm has the usual shape. */
export function labelledForms(w: Pick<Word, 'pos' | 'forms'>): { label: string; form: string }[] {
  const f = w.forms ?? [];
  if (!f.length) return [];
  let labels: string[] = [];
  if (w.pos.startsWith('noun')) labels = f.length === 3 ? ['definite', 'plural', 'definite plural'] : f.length === 2 ? ['definite', 'plural'] : [];
  else if (w.pos === 'verb' || w.pos === 'aux verb') labels = f.length === 4 ? ['past', 'supine', 'imperative', 'present'] : f.length === 5 ? ['past', 'supine', 'imperative', 'infinitive', 'present'] : [];
  else if (w.pos === 'adjective') labels = f.length === 4 ? ['ett-form', 'plural / definite', 'comparative', 'superlative'] : f.length === 2 ? ['ett-form', 'plural / definite'] : [];
  if (labels.length && labels[0] === 'past') {
    // show in the order learners expect: present – past – supine – imperative
    const order = f.length === 4 ? [3, 0, 1, 2] : [4, 0, 1, 2];
    return order.map((i) => ({ label: labels[i], form: f[i] }));
  }
  return f.map((form, i) => ({ label: labels[i] ?? '', form }));
}

export function Forms({ word }: { word: Word }) {
  const forms = labelledForms(word);
  if (!forms.length) return null;
  return (
    <div className="forms">
      {forms.map(({ label, form }, i) => (
        <span className="form" key={i}>
          {label && <small>{label}</small>}
          <b>{form}</b>
        </span>
      ))}
    </div>
  );
}

export function ExampleLine({ ex, showEnglish = true }: { ex: Example; showEnglish?: boolean }) {
  return (
    <div className="example">
      <SpeakButton text={ex.sv} label="Play sentence" />
      <div>
        <div className="sv" lang="sv">
          {ex.sv}
        </div>
        {showEnglish && <div className="en">{ex.en}</div>}
        {showEnglish && (
          <div className="credit">
            {ex.src === 't' ? (
              <>
                Tatoeba{' '}
                <a href={`https://tatoeba.org/sentences/show/${ex.id}`} target="_blank" rel="noreferrer">
                  #{ex.id}
                </a>
                {ex.by ? ` by ${ex.by}` : ''} · CC BY 2.0 FR
              </>
            ) : (
              <>Folkets lexikon · CC BY-SA 2.5</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function WordDetails({ word }: { word: Word }) {
  return (
    <div className="details">
      <div className="details-head">
        <SpeakButton text={spokenForm(word)} label="Play word" big />
        <div>
          <div className="hw" lang="sv">
            {headword(word)}
          </div>
          <div className="sub">
            {word.ph && <span className="ph">[{word.ph}]</span>}
            <span>{posLabel(word.pos)}</span>
            <span className={`lv lv-${word.lv}`}>{word.lv}</span>
            <span>#{word.rank}</span>
          </div>
        </div>
      </div>
      <p className="gloss">{word.tr.join('; ')}</p>
      {word.note && <p className="note">Note: {word.note}</p>}
      <Forms word={word} />
      {word.ex.length > 0 && (
        <div className="examples">
          {word.ex.map((ex, i) => (
            <ExampleLine ex={ex} key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
