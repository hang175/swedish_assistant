/** Lazy loading of the generated word bank (public/data). */
import { useEffect, useState } from 'react';
import { LEVELS, type Level, type Meta, type Word } from '../types';
import type { WordRef } from './srs';

const base = import.meta.env.BASE_URL + 'data/';
const cache = new Map<string, Promise<unknown>>();

function load<T>(file: string): Promise<T> {
  let p = cache.get(file);
  if (!p) {
    p = fetch(base + file).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${file} (${r.status}). Has the word bank been built?  Run: npm run build:data`);
      return r.json();
    });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p as Promise<T>;
}

export const loadMeta = () => load<Meta>('meta.json');
export const loadLevel = (lv: Level) => load<Word[]>(`${lv}.json`);
export const loadIndex = () => load<[number, number, number][]>('index.json').then((rows) => rows.map(([id, l, rank]): WordRef => ({ id, lv: LEVELS[l], rank })));
export const loadAll = () => Promise.all(LEVELS.map(loadLevel)).then((parts) => parts.flat());

/** Load full entries for a set of ids, touching only the level files that are needed. */
export async function loadWords(ids: number[], index: WordRef[]): Promise<Map<number, Word>> {
  const levelOf = new Map(index.map((w) => [w.id, w.lv]));
  const levels = [...new Set(ids.map((id) => levelOf.get(id)).filter((l): l is Level => !!l))];
  const out = new Map<number, Word>();
  const want = new Set(ids);
  for (const words of await Promise.all(levels.map(loadLevel))) for (const w of words) if (want.has(w.id)) out.set(w.id, w);
  return out;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data?: T; error?: string } {
  const [res, setRes] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    let alive = true;
    setRes({});
    fn().then(
      (data) => alive && setRes({ data }),
      (e: unknown) => alive && setRes({ error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return res;
}
