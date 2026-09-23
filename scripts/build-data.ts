/**
 * Word-bank builder.  Run with:  npm run build:data
 *
 * Inputs  (data/raw/, not committed):
 *   Swedish-Kelly_M3_CEFR.xls   – Kelly list (backbone: frequency, CEFR, POS, en/ett)
 *   folkets_sv_en_public.xml    – Folkets lexikon sv→en (glosses, inflections, IPA-ish phonetics, examples)
 *   swe.txt                     – Tatoeba sentence pairs from manythings.org/anki
 * Outputs (public/data/, committed):
 *   A1.json … C2.json, meta.json       and  build-report.md in the project root
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { Example, Word, Level, Meta } from '../src/types';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw');
const OUT = path.join(ROOT, 'public', 'data');
const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function findRaw(names: string[]): string {
  for (const dir of [RAW, ROOT, path.join(ROOT, 'swe-eng')]) {
    for (const n of names) {
      const p = path.join(dir, n);
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error(`Missing input file: ${names.join(' or ')} (looked in data/raw/ and the project root)`);
}

/* ------------------------------------------------------------------ Folkets */

interface FEntry {
  word: string;
  cls: string;
  translations: string[];
  inflections: string[];
  phonetic?: string;
  examples: { sv: string; en: string }[];
  synonyms: string[];
}

function decode(s: string): string {
  let r = s;
  for (let i = 0; i < 2; i++) {
    r = r
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  return r.trim();
}
const attr = (tag: string, name: string): string | undefined => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
};

function parseFolkets(file: string): Map<string, FEntry[]> {
  const xml = fs.readFileSync(file, 'utf8');
  const index = new Map<string, FEntry[]>();
  const chunks = xml.split('<word ').slice(1);
  for (const chunk of chunks) {
    const headEnd = chunk.indexOf('>');
    const head = chunk.slice(0, headEnd);
    const body = chunk.slice(headEnd + 1);
    const word = (attr(head, 'value') ?? '').replace(/\|/g, '');
    if (!word) continue;
    const e: FEntry = {
      word,
      cls: attr(head, 'class') ?? '',
      translations: [],
      inflections: [],
      examples: [],
      synonyms: [],
    };
    // top-level translations are the ones that appear before any nested element closes;
    // nested ones (inside example/idiom/definition/compound…) follow their parent tag directly.
    const tagRe = /<(\/?)([a-z]+)\b([^>]*?)(\/?)>/g;
    let m: RegExpExecArray | null;
    const stack: string[] = [];
    let pendingExample: { sv: string; en: string } | null = null;
    while ((m = tagRe.exec(body))) {
      const [, closing, name, attrs, selfClose] = m;
      if (closing) {
        const top = stack.pop();
        if (top === 'example' && pendingExample) {
          if (pendingExample.en) e.examples.push(pendingExample);
          pendingExample = null;
        }
        continue;
      }
      const parent = stack[stack.length - 1];
      if (name === 'translation') {
        const v = attr(attrs, 'value');
        if (v) {
          if (!parent) e.translations.push(v);
          else if (parent === 'example' && pendingExample && !pendingExample.en) pendingExample.en = v;
        }
      } else if (name === 'inflection' && parent === 'paradigm') {
        const v = attr(attrs, 'value');
        if (v) e.inflections.push(v);
      } else if (name === 'phonetic' && !parent) {
        e.phonetic = attr(attrs, 'value');
      } else if (name === 'synonym' && !parent) {
        const v = attr(attrs, 'value');
        if (v) e.synonyms.push(v.toLowerCase());
      } else if (name === 'example' && !parent) {
        pendingExample = { sv: attr(attrs, 'value') ?? '', en: '' };
      }
      if (!selfClose) stack.push(name);
    }
    const key = word.toLowerCase();
    const list = index.get(key);
    if (list) list.push(e);
    else index.set(key, [e]);
  }
  return index;
}

/* -------------------------------------------------------------------- Kelly */

interface KRow {
  id: number;
  wpm: number;
  /** 0 = real corpus frequency (SweWaC), 1 = T2 (added from other Kelly lists), 2 = manual / placeholder frequency */
  tier: number;
  level: Level;
  gram: string;
  raw: string;
  head: string;
  note?: string;
  pos: string;
}

function cleanHeadword(raw: string): { head: string; note?: string } {
  const notes: string[] = [];
  let head = raw.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    notes.push(inner.trim());
    return ' ';
  });
  head = head.replace(/\s+/g, ' ').replace(/\s+([,;])/g, '$1').trim();
  // "word, other" → keep first alternative
  if (head.includes(',')) {
    const [first, ...rest] = head.split(',');
    head = first.trim();
    notes.push(...rest.map((r) => r.trim()).filter(Boolean));
  }
  return { head, note: notes.length ? notes.join('; ') : undefined };
}

function parseKelly(file: string): KRow[] {
  const wb = XLSX.readFile(file);
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets['Swedish_M3_CEFR'], { header: 1 });
  const out: KRow[] = [];
  for (const r of rows.slice(1)) {
    const level = String(r[3] ?? '').trim() as Level;
    const raw = String(r[6] ?? '').trim();
    if (!raw || !LEVELS.includes(level)) continue;
    const wpm = Number(r[2]) || 0;
    const src = String(r[4] ?? '').trim();
    const { head, note } = cleanHeadword(raw);
    out.push({
      id: Number(r[0]),
      wpm,
      tier: wpm >= 999_999 || wpm <= 0 || src === 'manual' ? 2 : src === 'T2' ? 1 : 0,
      level,
      gram: String(r[5] ?? '').trim(),
      raw,
      head,
      note,
      pos: String(r[7] ?? '').trim(),
    });
  }
  return out;
}

const POS_MAP: Record<string, string[]> = {
  'noun-en': ['nn'],
  'noun-ett': ['nn'],
  'noun-en/-ett': ['nn'],
  noun: ['nn'],
  verb: ['vb'],
  'aux verb': ['vb'],
  adjective: ['jj'],
  particip: ['jj'],
  adverb: ['ab'],
  prep: ['pp'],
  pronoun: ['pn', 'hp', 'ps'],
  det: ['pn', 'article', 'jj'],
  conj: ['kn'],
  subj: ['sn', 'kn'],
  numeral: ['rg', 'nn', 'jj'],
  interj: ['in'],
  particle: ['ab', 'pp'],
  'proper name': ['pm'],
};

/**
 * A few core function words are missing (or only present with an unrelated sense) in Folkets.
 * These tiny hand-written glosses fill the gap.  Key: "headword|Kelly word class".
 */
const SUPPLEMENT: Record<string, { def: string; forms?: string[] }> = {
  'de|pronoun': { def: 'they' },
  'de|det': { def: 'the (plural)' },
  'hennes|pronoun': { def: 'her, hers' },
  'skola|aux verb': { def: 'shall, will, be going to', forms: ['skulle', 'skolat', 'ska'] },
  'torde|aux verb': { def: 'probably is, should' },
  'mitt|pronoun': { def: 'my, mine (ett-form)' },
  'imorgon|adverb': { def: 'tomorrow' },
};

/** extra rows for very common words that are missing from the Kelly list itself (ids 90000+) */
const EXTRA_ROWS: { head: string; pos: string; level: Level; def: string; forms?: string[]; gram?: string }[] = [
  { head: 'finnas', pos: 'verb', level: 'A1', def: 'exist, be there (det finns = there is)', forms: ['fanns', 'funnits', 'finns', 'finnas', 'finns'] },
  { head: 'varsågod', pos: 'interj', level: 'A1', def: 'here you are; you are welcome' },
  { head: 'ses', pos: 'verb', level: 'A1', def: 'see each other, meet (vi ses = see you)', forms: ['sågs', 'setts', 'ses', 'ses', 'ses'] },
  { head: 'mer', pos: 'adverb', level: 'A1', def: 'more' },
];

type Group = 'noun' | 'verb' | 'adj' | 'adv' | 'func';
const groupOf = (pos: string): Group =>
  pos.startsWith('noun') ? 'noun' : pos.includes('verb') && pos !== 'adverb' ? 'verb' : pos === 'adjective' || pos === 'particip' ? 'adj' : pos === 'adverb' ? 'adv' : 'func';

/* ----------------------------------------------------------------- glossing */

const MAX_DEF = 46;

function splitParts(t: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of t) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function pickDefinition(senses: FEntry[]): { def: string; all: string[] } {
  const all: string[] = [];
  const firsts: string[] = [];
  const rest: string[] = [];
  for (const s of senses) {
    s.translations.forEach((t, i) => {
      const v = t.replace(/\s+/g, ' ').trim();
      if (!v) return;
      if (!all.includes(v)) all.push(v);
      (i === 0 ? firsts : rest).push(...splitParts(v));
    });
  }
  const chosen: string[] = [];
  let len = 0;
  const candidates = [...firsts, ...rest];
  for (const c of [...candidates.filter((c) => !c.startsWith('(')), ...candidates]) {
    if (chosen.length >= 3) break;
    if (chosen.some((x) => x.toLowerCase() === c.toLowerCase())) continue;
    const add = c.length + (chosen.length ? 2 : 0);
    if (chosen.length && len + add > MAX_DEF) continue;
    if (!chosen.length && c.length > MAX_DEF + 14) continue;
    if (chosen.length && c.startsWith('(')) continue;
    chosen.push(c);
    len += add;
  }
  if (!chosen.length && all.length) chosen.push(all[0].slice(0, MAX_DEF + 14));
  return { def: chosen.join(', '), all };
}

/** normalised gloss keys, used to make sure a distractor is not also a correct answer */
function glossKeys(translations: string[]): Set<string> {
  const keys = new Set<string>();
  for (const t of translations) {
    for (let part of t.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').split(/[,;/]/)) {
      part = part
        .replace(/^\s*(to|a|an|the|be|get|become)\s+/, '')
        .replace(/[^a-z' -]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (part.length > 1) keys.add(part);
    }
  }
  return keys;
}
const overlaps = (a: Set<string>, b: Set<string>) => {
  for (const k of a) if (b.has(k)) return true;
  return false;
};

/* ------------------------------------------------------------------ Tatoeba */

interface Sentence {
  sv: string;
  en: string;
  id: string;
  by: string;
  tokens: string[];
  used: number;
}
const tokenize = (s: string) => s.toLowerCase().match(/[a-zåäöéèüáà]+(?:[-'][a-zåäöéèüáà]+)*/g) ?? [];

function parseTatoeba(file: string): { sentences: Sentence[]; byToken: Map<string, number[]> } {
  const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const seen = new Set<string>();
  const sentences: Sentence[] = [];
  for (const line of lines) {
    const [en, sv, credit] = line.split('\t');
    if (!en || !sv) continue;
    // "CC-BY 2.0 (France) Attribution: tatoeba.org #ENG_ID (eng_author) & #SWE_ID (swe_author)"
    const ids = [...(credit ?? '').matchAll(/#(\d+) \(([^)]*)\)/g)];
    const swe = ids[1] ?? ids[0];
    const id = swe ? swe[1] : '';
    const by = swe ? swe[2] : '';
    if (seen.has(sv)) continue;
    seen.add(sv);
    sentences.push({ sv, en, id, by, tokens: tokenize(sv), used: 0 });
  }
  const byToken = new Map<string, number[]>();
  sentences.forEach((s, i) => {
    for (const t of new Set(s.tokens)) {
      const l = byToken.get(t);
      if (l) l.push(i);
      else byToken.set(t, [i]);
    }
  });
  return { sentences, byToken };
}

function containsSeq(tokens: string[], seq: string[]): boolean {
  outer: for (let i = 0; i + seq.length <= tokens.length; i++) {
    for (let j = 0; j < seq.length; j++) if (tokens[i + j] !== seq[j]) continue outer;
    return true;
  }
  return false;
}

/* --------------------------------------------------------------------- main */

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function main() {
  const t0 = Date.now();
  const kelly = parseKelly(findRaw(['Swedish-Kelly_M3_CEFR.xls']));
  const folkets = parseFolkets(findRaw(['folkets_sv_en_public.xml']));
  const tatoeba = parseTatoeba(findRaw(['swe.txt']));
  console.log(`Kelly rows: ${kelly.length} | Folkets headwords: ${folkets.size} | Tatoeba sentences: ${tatoeba.sentences.length}`);

  interface Built extends Word {
    _keys: Set<string>;
    _group: Group;
    _syn: Set<string>;
    _order: number;
  }
  const built: Built[] = [];
  const skipped: Record<Level, string[]> = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };
  const duplicates: string[] = [];
  let posFallback = 0;
  let supplemented = 0;
  let viaInflection = 0;
  const inflectionIndex = new Map<string, FEntry>();
  for (const list of folkets.values())
    for (const e of list)
      if (e.translations.length) for (const f of e.inflections) if (!inflectionIndex.has(f.toLowerCase())) inflectionIndex.set(f.toLowerCase(), e);
  const seenKey = new Set<string>();

  // order inside each level: real frequency first (high → low), placeholder-frequency words last
  const ordered = [...kelly].sort((a, b) => {
    if (a.level !== b.level) return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level);
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === 2) return a.id - b.id;
    return b.wpm - a.wpm || a.id - b.id;
  });

  EXTRA_ROWS.forEach((x, i) => {
    if (kelly.some((k) => k.head.toLowerCase() === x.head && k.pos === x.pos)) return;
    ordered.push({ id: 90000 + i, wpm: 0, tier: 2, level: x.level, gram: x.gram ?? '', raw: x.head, head: x.head, pos: x.pos });
    SUPPLEMENT[`${x.head}|${x.pos}`] = { def: x.def, forms: x.forms };
  });
  for (const k of ordered) {
    const candidates = [k.head, k.head.replace(/^att /, ''), k.head.replace(/ sig$/, '')];
    let entries: FEntry[] | undefined;
    for (const c of candidates) {
      entries = folkets.get(c.toLowerCase());
      if (entries) break;
    }
    const sup = SUPPLEMENT[`${k.head.toLowerCase()}|${k.pos}`];
    if (sup) {
      entries = [{ word: k.head, cls: (POS_MAP[k.pos] ?? [''])[0], translations: [sup.def], inflections: sup.forms ?? [], examples: [], synonyms: [] }];
      supplemented++;
    }
    let formOf: string | undefined;
    if (!entries && !k.head.includes(' ')) {
      // e.g. "roligt" (adverb) → inflected form of the adjective "rolig"
      const base = inflectionIndex.get(k.head.toLowerCase());
      if (base) {
        entries = [base];
        formOf = base.word;
        viaInflection++;
      }
    }
    if (!entries) {
      skipped[k.level].push(k.raw);
      continue;
    }
    const wanted = POS_MAP[k.pos] ?? [];
    let senses = entries.filter((e) => wanted.includes(e.cls));
    if (!senses.length) {
      senses = entries;
      if (!formOf) posFallback++;
    }
    senses = senses.filter((s) => s.translations.length);
    // put the sense whose inflected forms are most common in real sentences first (är/var beats varade)
    const headLower = k.head.toLowerCase();
    const evidence = (s: FEntry) => {
      let n = 0;
      for (const f of new Set(s.inflections.map((x) => x.toLowerCase()))) if (f !== headLower) n += tatoeba.byToken.get(f)?.length ?? 0;
      return n;
    };
    const ev = new Map(senses.map((s) => [s, evidence(s)] as const));
    senses = senses.map((s, i) => ({ s, i })).sort((a, b) => ev.get(b.s)! - ev.get(a.s)! || a.i - b.i).map((x) => x.s);
    if (!senses.length) {
      skipped[k.level].push(k.raw);
      continue;
    }
    const { def, all } = pickDefinition(senses);
    if (!def) {
      skipped[k.level].push(k.raw);
      continue;
    }
    const dupKey = `${k.head.toLowerCase()}|${def.toLowerCase()}`;
    if (seenKey.has(dupKey)) {
      duplicates.push(`${k.raw} (${k.pos})`);
      continue;
    }
    seenKey.add(dupKey);

    const transLower = new Set(all.map((t) => t.toLowerCase()));
    const main = senses.find((s) => s.inflections.length) ?? senses[0];
    // keep order and repeats: the position in the paradigm tells the app which form it is
    const forms = formOf ? [] : main.inflections.filter((f) => !transLower.has(f.toLowerCase()));
    const phonetic = senses.find((s) => s.phonetic)?.phonetic;

    const fEx: Example[] = [];
    for (const s of senses) for (const ex of s.examples) if (fEx.length < 2 && ex.sv.length <= 90) fEx.push({ sv: ex.sv, en: ex.en, src: 'f' });

    const w: Built = {
      id: k.id,
      w: k.head,
      pos: k.pos,
      lv: k.level,
      rank: 0,
      def,
      tr: all.slice(0, 8),
      ex: fEx,
      dx: [],
      _keys: glossKeys(all),
      _group: groupOf(k.pos),
      _syn: new Set(senses.flatMap((s) => s.synonyms)),
      _order: built.length,
    };
    if (k.gram === 'en' || k.gram === 'ett' || k.gram === 'en/ett') w.g = k.gram;
    if (phonetic) w.ph = phonetic;
    if (forms.length) w.forms = forms;
    const note = [k.note, formOf ? `form of "${formOf}"` : undefined].filter(Boolean).join('; ');
    if (note) w.note = note;
    built.push(w);
  }

  // rank inside level
  const counters: Record<string, number> = {};
  for (const w of built) w.rank = counters[w.lv] = (counters[w.lv] ?? 0) + 1;

  /* ---- Tatoeba examples */
  for (const w of built) {
    const formSet = [w.w, ...(w.forms ?? [])].map((f) => tokenize(f)).filter((t) => t.length);
    const hits = new Set<number>();
    for (const seq of formSet) {
      const first = tatoeba.byToken.get(seq[0]!);
      if (!first) continue;
      for (const i of first) if (seq.length === 1 || containsSeq(tatoeba.sentences[i].tokens, seq)) hits.add(i);
    }
    const scored = [...hits]
      .map((i) => ({ i, s: tatoeba.sentences[i] }))
      .filter(({ s }) => s.tokens.length >= 3 && s.tokens.length <= 12)
      .sort((a, b) => Math.abs(a.s.tokens.length - 6) + 2 * a.s.used - (Math.abs(b.s.tokens.length - 6) + 2 * b.s.used) || a.i - b.i)
      .slice(0, 3);
    const tEx: Example[] = scored.map(({ s }) => {
      s.used++;
      return { sv: s.sv, en: s.en, src: 't', id: s.id, by: s.by };
    });
    w.ex = [...tEx, ...w.ex].slice(0, 5);
  }

  /* ---- distractor pools */
  const byGroup = new Map<Group, Built[]>();
  for (const w of built) {
    const l = byGroup.get(w._group);
    if (l) l.push(w);
    else byGroup.set(w._group, [w]);
  }
  const POOL = 10;
  let thinPools = 0;
  for (const w of built) {
    const rnd = seededRandom(w.id * 2654435761);
    const group = byGroup.get(w._group)!;
    const pos = group.indexOf(w);
    // nearest neighbours in frequency order within the same POS group; widen until the pool is full
    const pool: Built[] = [];
    const tryAdd = (c: Built) => {
      if (c === w || pool.length >= POOL) return;
      if (c.w.toLowerCase() === w.w.toLowerCase()) return;
      if (overlaps(c._keys, w._keys)) return;
      if (w._syn.has(c.w.toLowerCase()) || c._syn.has(w.w.toLowerCase())) return;
      if (pool.some((p) => overlaps(p._keys, c._keys))) return;
      if (Math.abs(c.def.length - w.def.length) > 30) return;
      pool.push(c);
    };
    for (let radius = 40; pool.length < POOL && radius <= group.length * 2; radius *= 2) {
      const lo = Math.max(0, pos - radius);
      const hi = Math.min(group.length, pos + radius + 1);
      const window = group.slice(lo, hi);
      for (let i = window.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [window[i], window[j]] = [window[j], window[i]];
      }
      window.forEach(tryAdd);
    }
    if (pool.length < POOL) {
      const near = built.slice(Math.max(0, w._order - 200), w._order + 200);
      near.forEach(tryAdd);
    }
    if (pool.length < 3) thinPools++;
    w.dx = pool.map((p) => p.def);
  }

  /* ---- write */
  fs.mkdirSync(OUT, { recursive: true });
  const meta: Meta = { built: new Date().toISOString().slice(0, 10), counts: {} as Meta['counts'] };
  const strip = ({ _keys, _group, _syn, _order, ...rest }: Built): Word => rest;
  for (const lv of LEVELS) {
    const words = built.filter((w) => w.lv === lv).map(strip);
    meta.counts[lv] = words.length;
    fs.writeFileSync(path.join(OUT, `${lv}.json`), JSON.stringify(words));
  }
  // compact index of every word: [id, level index, rank] – lets the app plan the day without loading all levels
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(built.map((w) => [w.id, LEVELS.indexOf(w.lv), w.rank])));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));

  /* ---- report */
  const lines: string[] = [];
  lines.push('# Word-bank build report', '', `Built: ${meta.built}`, '');
  lines.push('| Level | Kelly rows | Matched | Skipped | With example | With phonetic | With inflections |', '|---|---|---|---|---|---|---|');
  let totalM = 0;
  let totalEx = 0;
  for (const lv of LEVELS) {
    const ws = built.filter((w) => w.lv === lv);
    const total = kelly.filter((k) => k.level === lv).length;
    const withEx = ws.filter((w) => w.ex.length).length;
    totalM += ws.length;
    totalEx += withEx;
    const pct = (n: number) => `${n} (${Math.round((100 * n) / Math.max(1, ws.length))}%)`;
    lines.push(`| ${lv} | ${total} | ${ws.length} (${Math.round((100 * ws.length) / total)}%) | ${total - ws.length} | ${pct(withEx)} | ${pct(ws.filter((w) => w.ph).length)} | ${pct(ws.filter((w) => w.forms).length)} |`);
  }
  lines.push('', `Total matched: **${totalM} / ${kelly.length}**. Words with at least one example: **${totalEx}**.`);
  lines.push(`Matched by headword only (no entry with the expected part of speech): ${posFallback}.`);
  lines.push(`Matched through an inflected form (e.g. adverb "roligt" → adjective "rolig"): ${viaInflection}. Hand-written supplement glosses: ${supplemented}.`);
  lines.push(`Dropped as duplicates (same headword and same gloss as an earlier row): ${duplicates.length}.`);
  lines.push(`Words whose distractor pool has fewer than 3 entries: ${thinPools}.`, '');
  for (const lv of LEVELS) lines.push(`## Skipped – ${lv} (${skipped[lv].length})`, '', skipped[lv].join(', ') || '–', '');
  lines.push(`## Duplicates dropped`, '', duplicates.join(', ') || '–', '');
  fs.writeFileSync(path.join(ROOT, 'build-report.md'), lines.join('\n'));

  console.log(lines.slice(4, 13).join('\n'));
  console.log(`Matched ${totalM}/${kelly.length}; with examples ${totalEx}; POS fallback ${posFallback}; duplicates ${duplicates.length}; thin pools ${thinPools}`);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s → public/data/, build-report.md`);
}

main();
