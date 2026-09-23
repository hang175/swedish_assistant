/**
 * Lessons builder.  Run with:  npm run build:lessons   (also runs as part of build:data)
 *
 * Reads the authored dialogues in lessons/*.json, links every Swedish word to the word bank
 * (public/data) through its inflected forms, and writes public/lessons/.
 *
 * Authored line format:  [speaker, swedish, english, chinese, note_en?, note_zh?]
 * Optional per line "audio": put an object instead of an array: { "l": [...], "audio": "audio/01-hej/03.mp3" }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Word, Level } from '../src/types';
import type { Lesson, LessonLine, LessonSummary, Token } from '../src/lib/lessons';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'lessons');
const DATA = path.join(ROOT, 'public', 'data');
const OUT = path.join(ROOT, 'public', 'lessons');
const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/* word-bank lookup: form → word id (first hit wins, so lower level / higher frequency wins) */
const byForm = new Map<string, number>();
const phrases = new Map<string, number>(); // multi-word headwords like "tycka om"
for (const lv of LEVELS) {
  const file = path.join(DATA, `${lv}.json`);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file} – run npm run build:data first`);
  const words: Word[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const w of words) {
    const head = w.w.toLowerCase();
    if (head.includes(' ')) {
      if (!phrases.has(head)) phrases.set(head, w.id);
      continue;
    }
    for (const f of [head, ...(w.forms ?? []).map((x) => x.toLowerCase())]) if (!byForm.has(f)) byForm.set(f, w.id);
  }
}

const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/u;

function tokenize(sv: string, lessonVocab: Set<string>): Token[] {
  const out: Token[] = [];
  const re = new RegExp(WORD.source, WORD.flags + 'g');
  let last = 0;
  const words: { text: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sv))) words.push({ text: m[0], start: m.index, end: m.index + m[0].length });

  for (let i = 0; i < words.length; i++) {
    // try 3- and 2-word phrases first
    let matched = false;
    for (const n of [3, 2]) {
      if (i + n > words.length) continue;
      const phrase = words
        .slice(i, i + n)
        .map((w) => w.text.toLowerCase())
        .join(' ');
      const id = phrases.get(phrase);
      const inLesson = lessonVocab.has(phrase);
      if (id !== undefined || inLesson) {
        const start = words[i].start;
        const end = words[i + n - 1].end;
        if (start > last) out.push({ t: sv.slice(last, start) });
        out.push({ t: sv.slice(start, end), ...(id !== undefined ? { id } : {}), ...(inLesson ? { v: phrase } : {}) });
        last = end;
        i += n - 1;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const w = words[i];
    const lower = w.text.toLowerCase();
    if (w.start > last) out.push({ t: sv.slice(last, w.start) });
    const id = byForm.get(lower);
    const v = lessonVocab.has(lower) ? lower : undefined;
    out.push({ t: w.text, ...(id !== undefined ? { id } : {}), ...(v ? { v } : {}) });
    last = w.end;
  }
  if (last < sv.length) out.push({ t: sv.slice(last) });
  return out;
}

interface Authored {
  id: string;
  level: Level;
  title: { sv: string; en: string; zh: string };
  scene: { en: string; zh: string };
  vocab?: { sv: string; en: string; zh: string }[];
  lines: (string[] | { l: string[]; audio?: string })[];
}

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).sort();
const summaries: LessonSummary[] = [];
let linked = 0;
let total = 0;
const unlinked = new Map<string, number>();

for (const file of files) {
  const a: Authored = JSON.parse(fs.readFileSync(path.join(SRC, file), 'utf8'));
  const vocab = a.vocab ?? [];
  // also let inflected forms of one-word lesson vocab match loosely: "kylen" for "kylen", "stugan" for "stuga"…
  const vocabIndex = new Map<string, string>();
  for (const v of vocab) {
    const k = v.sv.toLowerCase();
    vocabIndex.set(k, k);
    if (!k.includes(' ')) for (const suf of ['en', 'et', 'n', 't', 'ar', 'er', 'or', 'na', 'arna', 'erna', 'orna', 'de', 'r']) vocabIndex.set(k + suf, k);
  }
  const lines: LessonLine[] = a.lines.map((raw) => {
    const [who, sv, en, zh, noteEn, noteZh] = Array.isArray(raw) ? raw : raw.l;
    const tokens = tokenize(sv, new Set(vocabIndex.keys())).map((t) => (t.v ? { ...t, v: vocabIndex.get(t.v) ?? t.v } : t));
    for (const t of tokens) {
      if (!WORD.test(t.t)) continue;
      total++;
      if (t.id !== undefined || t.v) linked++;
      else unlinked.set(t.t.toLowerCase(), (unlinked.get(t.t.toLowerCase()) ?? 0) + 1);
    }
    const line: LessonLine = { who, sv, en, zh, tokens };
    if (noteEn || noteZh) line.note = { en: noteEn ?? '', zh: noteZh ?? '' };
    if (!Array.isArray(raw) && raw.audio) line.audio = raw.audio;
    return line;
  });
  const lesson: Lesson = { id: a.id, level: a.level, title: a.title, scene: a.scene, vocab, lines };
  fs.writeFileSync(path.join(OUT, `${a.id}.json`), JSON.stringify(lesson));
  summaries.push({ id: a.id, level: a.level, title: a.title, lines: lines.length, wordIds: [...new Set(lines.flatMap((l) => l.tokens.map((t) => t.id).filter((x): x is number => x !== undefined)))] });
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(summaries));

const top = [...unlinked.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
console.log(`Lessons: ${files.length} | words linked to the word bank or lesson glossary: ${linked}/${total} (${Math.round((100 * linked) / total)}%)`);
console.log(`Most frequent unlinked words (names and numbers are expected): ${top.map(([w, n]) => `${w}×${n}`).join(', ')}`);
