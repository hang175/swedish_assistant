import type { Level } from '../types';

export interface Token {
  t: string;
  /** word-bank id when the token (or phrase) is in the word bank */
  id?: number;
  /** key into the lesson's own glossary */
  v?: string;
}

export interface LessonLine {
  who: string;
  sv: string;
  en: string;
  zh: string;
  note?: { en: string; zh: string };
  tokens: Token[];
  /** optional pre-recorded audio, relative to public/ – used instead of the browser voice when present */
  audio?: string;
}

export interface Lesson {
  id: string;
  level: Level;
  title: { sv: string; en: string; zh: string };
  scene: { en: string; zh: string };
  vocab: { sv: string; en: string; zh: string }[];
  lines: LessonLine[];
}

export interface LessonSummary {
  id: string;
  level: Level;
  title: Lesson['title'];
  lines: number;
  wordIds: number[];
}

const base = import.meta.env.BASE_URL + 'lessons/';
const cache = new Map<string, Promise<unknown>>();
function load<T>(file: string): Promise<T> {
  let p = cache.get(file);
  if (!p) {
    p = fetch(base + file).then((r) => {
      if (!r.ok) throw new Error(`Could not load lesson ${file} (${r.status}). Run: npm run build:lessons`);
      return r.json();
    });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p as Promise<T>;
}
export const loadLessonIndex = () => load<LessonSummary[]>('index.json');
export const loadLesson = (id: string) => load<Lesson>(`${id}.json`);
