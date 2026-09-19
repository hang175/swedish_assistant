/**
 * Pure spaced-repetition logic: Leitner boxes, day boundary, daily queue, streaks.
 * No DOM, no storage, no clock access – everything is passed in, so it is easy to test.
 */
import type { Level } from '../types';
import { LEVELS } from '../types';

/** days until the next review for boxes 1…6 */
export const INTERVALS = [1, 2, 4, 8, 16, 32] as const;
export const MAX_BOX = 6;
export const MASTERED_BOX = 5;
export const DAY_START_HOUR = 4;
const KNOWN_DUE = 9_999_999;

export interface Card {
  /** box 1–6 */
  b: number;
  /** day number when the card is due */
  d: number;
  /** consecutive correct answers */
  s: number;
  /** 1 = marked as already known by the user (never scheduled) */
  k?: 1;
  /** when this card last changed (unix seconds) – used to merge progress from several devices */
  t?: number;
}

export interface DayLog {
  /** new words introduced */
  n: number;
  /** reviews answered */
  r: number;
  /** daily task completed */
  done?: 1;
}

export interface Settings {
  newPerDay: number;
  reviewLimit: number;
  startLevel: Level;
  autoSpeak: boolean;
  rate: number;
  voiceURI: string;
  /** ask "en or ett?" before the meaning for nouns; a wrong article counts as a wrong answer */
  askGender: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 20,
  reviewLimit: 100,
  startLevel: 'A1',
  autoSpeak: true,
  rate: 0.9,
  voiceURI: '',
  askGender: true,
};

/** "Study day" number in local time; a new day starts at 04:00. */
export function dayNumber(now: Date): number {
  const shifted = new Date(now.getTime() - DAY_START_HOUR * 3_600_000);
  return Math.floor(Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()) / 86_400_000);
}

export function dayLabel(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/** Result of answering a card. `card` is undefined for a brand-new word. */
export function answerCard(card: Card | undefined, correct: boolean, today: number, t?: number): Card {
  const stamp = t === undefined ? {} : { t };
  if (!card) return { b: 1, d: today + INTERVALS[0], s: correct ? 1 : 0, ...stamp };
  if (!correct) return { b: 1, d: today + INTERVALS[0], s: 0, ...stamp };
  const b = Math.min(MAX_BOX, card.b + 1);
  return { b, d: today + INTERVALS[b - 1], s: card.s + 1, ...stamp };
}

export const knownCard = (t?: number): Card => ({ b: MAX_BOX, d: KNOWN_DUE, s: 0, k: 1, ...(t === undefined ? {} : { t }) });
export const isMastered = (c: Card | undefined) => !!c && c.b >= MASTERED_BOX;
export const isDue = (c: Card, today: number) => !c.k && c.d <= today;

export type Status = 'new' | 'learning' | 'mastered';
export const statusOf = (c: Card | undefined): Status => (!c ? 'new' : isMastered(c) ? 'mastered' : 'learning');

export interface WordRef {
  id: number;
  lv: Level;
  rank: number;
}

export interface QueueItem {
  id: number;
  kind: 'review' | 'new';
  /** true when the word comes back after a wrong answer in this session (no SRS effect) */
  retry?: boolean;
}

export interface QueueInput {
  /** all loaded words */
  words: WordRef[];
  cards: Record<number, Card>;
  today: number;
  settings: Pick<Settings, 'newPerDay' | 'reviewLimit' | 'startLevel'>;
  log: DayLog | undefined;
}

/** Order for introducing new words: start level upwards, then by frequency rank. */
export function newWordOrder(words: WordRef[], startLevel: Level): WordRef[] {
  const from = LEVELS.indexOf(startLevel);
  return words
    .filter((w) => LEVELS.indexOf(w.lv) >= from)
    .sort((a, b) => LEVELS.indexOf(a.lv) - LEVELS.indexOf(b.lv) || a.rank - b.rank);
}

/** What is left to do today: due reviews (most overdue first, capped) followed by new words. */
export function buildQueue({ words, cards, today, settings, log }: QueueInput): QueueItem[] {
  const reviewsLeft = Math.max(0, settings.reviewLimit - (log?.r ?? 0));
  const newLeft = Math.max(0, settings.newPerDay - (log?.n ?? 0));
  const known = new Set(words.map((w) => w.id));

  const reviews = Object.entries(cards)
    .map(([id, c]) => ({ id: Number(id), c }))
    .filter(({ id, c }) => known.has(id) && isDue(c, today))
    .sort((a, b) => a.c.d - b.c.d || a.c.b - b.c.b || a.id - b.id)
    .slice(0, reviewsLeft)
    .map(({ id }): QueueItem => ({ id, kind: 'review' }));

  const fresh = newWordOrder(words, settings.startLevel)
    .filter((w) => !cards[w.id])
    .slice(0, newLeft)
    .map((w): QueueItem => ({ id: w.id, kind: 'new' }));

  return [...reviews, ...fresh];
}

/** Put a wrongly answered word back a few positions later (or at the end of a short queue). */
export function requeue(rest: QueueItem[], item: QueueItem, gap = 5): QueueItem[] {
  const at = Math.min(gap, rest.length);
  const copy = rest.slice();
  copy.splice(at, 0, { ...item, retry: true });
  return copy;
}

/** Consecutive completed days ending today (or yesterday, if today is not finished yet). */
export function streak(days: Record<number, DayLog>, today: number): number {
  let d = days[today]?.done ? today : today - 1;
  let n = 0;
  while (days[d]?.done) {
    n++;
    d--;
  }
  return n;
}

export function masteredByLevel(words: WordRef[], cards: Record<number, Card>): Record<Level, number> {
  const out = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 } as Record<Level, number>;
  for (const w of words) if (isMastered(cards[w.id])) out[w.lv]++;
  return out;
}

/** Compare a typed answer with the target word: ignore case and surrounding whitespace. */
export function spellingMatches(input: string, target: string): boolean {
  const norm = (s: string) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  return norm(input) === norm(target);
}
