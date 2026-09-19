import { describe, expect, it } from 'vitest';
import { answerCard, buildQueue, dayNumber, INTERVALS, isMastered, knownCard, masteredByLevel, requeue, spellingMatches, streak, type Card, type WordRef } from './srs';

const words: WordRef[] = [
  { id: 1, lv: 'A1', rank: 1 },
  { id: 2, lv: 'A1', rank: 2 },
  { id: 3, lv: 'A1', rank: 3 },
  { id: 10, lv: 'A2', rank: 1 },
  { id: 11, lv: 'A2', rank: 2 },
  { id: 20, lv: 'B1', rank: 1 },
];
const settings = { newPerDay: 2, reviewLimit: 100, startLevel: 'A1' as const };

describe('dayNumber', () => {
  it('starts a new day at 04:00 local time', () => {
    const lateNight = dayNumber(new Date(2026, 8, 20, 3, 59));
    const evening = dayNumber(new Date(2026, 8, 19, 23, 0));
    const morning = dayNumber(new Date(2026, 8, 20, 4, 0));
    expect(lateNight).toBe(evening);
    expect(morning).toBe(evening + 1);
  });
  it('advances by exactly one per calendar day, across month ends and DST changes', () => {
    expect(dayNumber(new Date(2026, 9, 1, 12)) - dayNumber(new Date(2026, 8, 30, 12))).toBe(1);
    expect(dayNumber(new Date(2026, 9, 26, 12)) - dayNumber(new Date(2026, 9, 24, 12))).toBe(2); // DST ends 25 Oct in Sweden
    expect(dayNumber(new Date(2027, 2, 29, 12)) - dayNumber(new Date(2027, 2, 27, 12))).toBe(2); // DST starts 28 Mar
  });
});

describe('answerCard', () => {
  it('puts a new word in box 1, due tomorrow, whether right or wrong', () => {
    expect(answerCard(undefined, true, 100)).toEqual({ b: 1, d: 101, s: 1 });
    expect(answerCard(undefined, false, 100)).toEqual({ b: 1, d: 101, s: 0 });
  });
  it('moves up one box per correct answer with intervals 1/2/4/8/16/32', () => {
    let c: Card = answerCard(undefined, true, 0);
    const seen = [c.d];
    for (let i = 0; i < 6; i++) {
      c = answerCard(c, true, 0);
      seen.push(c.d);
    }
    expect(seen).toEqual([1, 2, 4, 8, 16, 32, 32]);
    expect(c.b).toBe(6);
    expect(INTERVALS).toEqual([1, 2, 4, 8, 16, 32]);
  });
  it('sends a wrong answer back to box 1 and resets the run', () => {
    expect(answerCard({ b: 5, d: 50, s: 7 }, false, 50)).toEqual({ b: 1, d: 51, s: 0 });
  });
  it('counts box 5 and above as mastered', () => {
    expect(isMastered({ b: 4, d: 0, s: 0 })).toBe(false);
    expect(isMastered({ b: 5, d: 0, s: 0 })).toBe(true);
    expect(isMastered(knownCard())).toBe(true);
    expect(isMastered(undefined)).toBe(false);
  });
});

describe('buildQueue', () => {
  it('introduces new words by level, then frequency', () => {
    const q = buildQueue({ words, cards: {}, today: 10, settings, log: undefined });
    expect(q).toEqual([
      { id: 1, kind: 'new' },
      { id: 2, kind: 'new' },
    ]);
  });
  it('respects the start level', () => {
    const q = buildQueue({ words, cards: {}, today: 10, settings: { ...settings, startLevel: 'A2' }, log: undefined });
    expect(q.map((i) => i.id)).toEqual([10, 11]);
  });
  it('puts due reviews first (most overdue first), skips future and known cards', () => {
    const cards: Record<number, Card> = {
      1: { b: 2, d: 10, s: 1 },
      2: { b: 1, d: 8, s: 0 },
      3: { b: 3, d: 11, s: 2 },
      10: knownCard(),
    };
    const q = buildQueue({ words, cards, today: 10, settings, log: undefined });
    expect(q).toEqual([
      { id: 2, kind: 'review' },
      { id: 1, kind: 'review' },
      { id: 11, kind: 'new' },
      { id: 20, kind: 'new' },
    ]);
  });
  it('subtracts what was already done today and honours the review cap', () => {
    const cards: Record<number, Card> = { 1: { b: 1, d: 1, s: 0 }, 2: { b: 1, d: 2, s: 0 }, 3: { b: 1, d: 3, s: 0 } };
    const q = buildQueue({ words, cards, today: 10, settings: { ...settings, reviewLimit: 3 }, log: { n: 1, r: 2 } });
    expect(q).toEqual([
      { id: 1, kind: 'review' },
      { id: 10, kind: 'new' },
    ]);
    expect(buildQueue({ words, cards: {}, today: 10, settings, log: { n: 2, r: 0 } })).toEqual([]);
  });
  it('ignores cards of words that are no longer in the word bank', () => {
    const q = buildQueue({ words, cards: { 999: { b: 1, d: 0, s: 0 } }, today: 10, settings: { ...settings, newPerDay: 0 }, log: undefined });
    expect(q).toEqual([]);
  });
});

describe('requeue', () => {
  it('re-inserts a missed word a few items later, flagged as retry', () => {
    const rest = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id, kind: 'new' as const }));
    const out = requeue(rest, { id: 99, kind: 'review' });
    expect(out[5]).toEqual({ id: 99, kind: 'review', retry: true });
    expect(out).toHaveLength(8);
  });
  it('appends when the queue is short, so the word always comes back', () => {
    expect(requeue([], { id: 99, kind: 'new' })).toEqual([{ id: 99, kind: 'new', retry: true }]);
  });
});

describe('streak', () => {
  it('counts consecutive completed days up to today', () => {
    expect(streak({ 8: { n: 1, r: 0, done: 1 }, 9: { n: 1, r: 0, done: 1 }, 10: { n: 1, r: 0, done: 1 } }, 10)).toBe(3);
  });
  it('keeps yesterday’s streak alive while today is unfinished, but breaks on a gap', () => {
    expect(streak({ 8: { n: 1, r: 0, done: 1 }, 9: { n: 1, r: 0, done: 1 }, 10: { n: 1, r: 0 } }, 10)).toBe(2);
    expect(streak({ 7: { n: 1, r: 0, done: 1 }, 8: { n: 1, r: 0, done: 1 } }, 10)).toBe(0);
  });
});

describe('stats and spelling', () => {
  it('counts mastered words per level', () => {
    const m = masteredByLevel(words, { 1: { b: 5, d: 0, s: 0 }, 2: { b: 4, d: 0, s: 0 }, 10: knownCard() });
    expect(m.A1).toBe(1);
    expect(m.A2).toBe(1);
    expect(m.B1).toBe(0);
  });
  it('compares spelling ignoring case and outer whitespace, but not diacritics', () => {
    expect(spellingMatches('  Äpple ', 'äpple')).toBe(true);
    expect(spellingMatches('apple', 'äpple')).toBe(false);
    expect(spellingMatches('tycka  om', 'tycka om')).toBe(true);
  });
});
