import { describe, expect, it } from 'vitest';
import { mergeStates, sameState } from './merge';
import { DEFAULT_SETTINGS } from './srs';
import type { AppState } from './store';

const base = (over: Partial<AppState> = {}): AppState => ({ v: 1, settings: { ...DEFAULT_SETTINGS }, cards: {}, days: {}, ...over });

describe('mergeStates', () => {
  it('keeps cards that exist on only one side', () => {
    const m = mergeStates(base({ cards: { 1: { b: 2, d: 5, s: 1, t: 100 } } }), base({ cards: { 2: { b: 1, d: 6, s: 0, t: 90 } } }));
    expect(Object.keys(m.cards)).toEqual(['1', '2']);
  });
  it('takes the more recently changed card, even if it is in a lower box', () => {
    const phone = base({ cards: { 1: { b: 1, d: 11, s: 0, t: 200 } } });
    const laptop = base({ cards: { 1: { b: 4, d: 15, s: 3, t: 100 } } });
    expect(mergeStates(phone, laptop).cards[1]).toEqual({ b: 1, d: 11, s: 0, t: 200 });
    expect(mergeStates(laptop, phone).cards[1]).toEqual({ b: 1, d: 11, s: 0, t: 200 });
  });
  it('falls back to the card that is further along when there are no timestamps', () => {
    const m = mergeStates(base({ cards: { 1: { b: 2, d: 5, s: 1 } } }), base({ cards: { 1: { b: 3, d: 9, s: 2 } } }));
    expect(m.cards[1].b).toBe(3);
  });
  it('merges day logs with max counts and keeps a completed day completed', () => {
    const m = mergeStates(base({ days: { 10: { n: 20, r: 3, done: 1 } } }), base({ days: { 10: { n: 5, r: 9 }, 11: { n: 1, r: 0 } } }));
    expect(m.days).toEqual({ 10: { n: 20, r: 9, done: 1 }, 11: { n: 1, r: 0 } });
  });
  it('uses the most recently changed settings', () => {
    const a = base({ settings: { ...DEFAULT_SETTINGS, newPerDay: 10 }, st: 50 });
    const b = base({ settings: { ...DEFAULT_SETTINGS, newPerDay: 30 }, st: 70 });
    expect(mergeStates(a, b).settings.newPerDay).toBe(30);
    expect(mergeStates(b, a).settings.newPerDay).toBe(30);
  });
  it('does not resurrect a card that was removed later, but keeps one that was re-added after the removal', () => {
    const removedHere = base({ gone: { 1: 300 } });
    const cloud = base({ cards: { 1: { b: 6, d: 9999999, s: 0, k: 1, t: 200 } } });
    expect(mergeStates(removedHere, cloud).cards[1]).toBeUndefined();
    const readded = base({ cards: { 1: { b: 1, d: 12, s: 1, t: 400 } } });
    const m = mergeStates(removedHere, readded);
    expect(m.cards[1]?.t).toBe(400);
    expect(m.gone).toBeUndefined();
  });
  it('merges lesson progress and wanted words', () => {
    const a = base({ want: { 5: 10, 6: 4 }, lessons: { l1: { p: 2, t: 100 } } });
    const b = base({ cards: { 6: { b: 1, d: 3, s: 1, t: 8 } }, want: { 5: 12 }, lessons: { l1: { p: 1, d: 1, t: 90 }, l2: { p: 1, t: 50 } } });
    const m = mergeStates(a, b);
    expect(m.want).toEqual({ 5: 12 });
    expect(m.lessons).toEqual({ l1: { p: 2, d: 1, t: 100 }, l2: { p: 1, t: 50 } });
  });
  it('is idempotent and symmetric in content', () => {
    const a = base({ cards: { 1: { b: 2, d: 5, s: 1, t: 10 }, 2: { b: 1, d: 3, s: 0, t: 5 } }, days: { 1: { n: 2, r: 0 } }, st: 3 });
    const b = base({ cards: { 2: { b: 3, d: 8, s: 2, t: 9 } }, days: { 1: { n: 1, r: 4, done: 1 } }, st: 1 });
    const ab = mergeStates(a, b);
    expect(sameState(ab, mergeStates(b, a))).toBe(true);
    expect(sameState(ab, mergeStates(ab, b))).toBe(true);
  });
});
