/** Pure merge of two copies of the progress (e.g. this browser and the cloud). */
import type { AppState } from './store';
import type { Card, DayLog } from './srs';

const stamp = (c: Card | undefined) => c?.t ?? 0;

/** Newer change wins; without timestamps the card that is further along wins. */
function newerCard(a: Card, b: Card): Card {
  if (stamp(a) !== stamp(b)) return stamp(a) > stamp(b) ? a : b;
  if (!!a.k !== !!b.k) return a.k ? a : b;
  return a.b >= b.b ? a : b;
}

export function mergeStates(a: AppState, b: AppState): AppState {
  const gone: Record<number, number> = { ...a.gone };
  for (const [id, t] of Object.entries(b.gone ?? {})) gone[Number(id)] = Math.max(gone[Number(id)] ?? 0, t);

  const cards: Record<number, Card> = {};
  for (const id of new Set([...Object.keys(a.cards), ...Object.keys(b.cards)].map(Number))) {
    const ca = a.cards[id];
    const cb = b.cards[id];
    const card = ca && cb ? newerCard(ca, cb) : (ca ?? cb)!;
    // a removal only wins over a card that was last changed before it
    if ((gone[id] ?? -1) >= stamp(card) && gone[id] !== undefined) continue;
    cards[id] = card;
    delete gone[id];
  }

  const days: Record<number, DayLog> = {};
  for (const day of new Set([...Object.keys(a.days), ...Object.keys(b.days)].map(Number))) {
    const da = a.days[day];
    const db = b.days[day];
    days[day] = { n: Math.max(da?.n ?? 0, db?.n ?? 0), r: Math.max(da?.r ?? 0, db?.r ?? 0), ...(da?.done || db?.done ? { done: 1 as const } : {}) };
  }

  const settingsFrom = (b.st ?? 0) > (a.st ?? 0) ? b : a;
  const st = Math.max(a.st ?? 0, b.st ?? 0);
  return { v: 1, settings: settingsFrom.settings, cards, days, ...(st ? { st } : {}), ...(Object.keys(gone).length ? { gone } : {}) };
}

/** Cheap equality check so we do not upload when nothing changed. */
export const sameState = (a: AppState, b: AppState) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
  return v;
}
