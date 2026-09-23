/**
 * Pre-generate lesson audio with Azure neural text-to-speech.   Run with:  npm run build:audio
 *
 * Needs two values in .env.local (see .env.example):
 *   AZURE_SPEECH_KEY=...
 *   AZURE_SPEECH_REGION=swedencentral
 *
 * Every speaker gets a voice from audio/voices.json (edit that file to recast a character).
 * Output: public/audio/<lesson-id>/<nn>.mp3 (+ intro.mp3) and public/audio/manifest.json.
 * Files are cached by a hash of text + voice settings, so re-running only generates what changed.
 * Usage:  npm run build:audio            – all lessons
 *         npm run build:audio -- s1e01   – only lessons whose id contains "s1e01"
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'lessons');
const OUT = path.join(ROOT, 'public', 'audio');
const VOICES_FILE = path.join(ROOT, 'audio', 'voices.json');

/* ---- config */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  const f = path.join(ROOT, '.env.local');
  if (fs.existsSync(f))
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  return env;
}
const env = loadEnv();
const KEY = env.AZURE_SPEECH_KEY;
const REGION = env.AZURE_SPEECH_REGION;
if (!KEY || !REGION) {
  console.error('Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION. Put them in .env.local (see .env.example).');
  process.exit(1);
}

interface VoiceSpec {
  voice: string;
  /** e.g. "-5%" or "+10%" – makes two characters on the same voice sound different */
  pitch?: string;
  rate?: string;
  /** style, only some voices support it: "chat", "cheerful"… (ignored by voices that lack it) */
  style?: string;
}
interface VoicesConfig {
  default: VoiceSpec;
  narrator: VoiceSpec;
  speakers: Record<string, VoiceSpec>;
}
const voices: VoicesConfig = JSON.parse(fs.readFileSync(VOICES_FILE, 'utf8'));
const voiceFor = (who: string): VoiceSpec => voices.speakers[who] ?? voices.default;

/* ---- synthesis */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function ssml(text: string, v: VoiceSpec): string {
  const prosody = v.pitch || v.rate ? `<prosody${v.pitch ? ` pitch="${v.pitch}"` : ''}${v.rate ? ` rate="${v.rate}"` : ''}>${esc(text)}</prosody>` : esc(text);
  const styled = v.style ? `<mstts:express-as style="${v.style}">${prosody}</mstts:express-as>` : prosody;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="sv-SE"><voice name="${v.voice}">${styled}</voice></speak>`;
}

async function synth(text: string, v: VoiceSpec, attempt = 0): Promise<Buffer> {
  const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY!,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'swedish-assistant',
    },
    body: ssml(text, v),
  });
  if (res.status === 429 && attempt < 5) {
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    return synth(text, v, attempt + 1);
  }
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

/* ---- main */
const filter = process.argv[2] ?? '';
const manifestFile = path.join(OUT, 'manifest.json');
const manifest: Record<string, string> = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
const hashOf = (text: string, v: VoiceSpec) => crypto.createHash('sha1').update(JSON.stringify([text, v])).digest('hex').slice(0, 12);

let generated = 0;
let skipped = 0;
let chars = 0;
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).sort();
for (const file of files) {
  const a = JSON.parse(fs.readFileSync(path.join(SRC, file), 'utf8'));
  if (filter && !String(a.id).includes(filter)) continue;
  const dir = path.join(OUT, a.id);
  fs.mkdirSync(dir, { recursive: true });

  const jobs: { name: string; text: string; v: VoiceSpec }[] = [];
  if (a.intro?.sv) jobs.push({ name: 'intro', text: a.intro.sv, v: voices.narrator });
  a.lines.forEach((raw: string[] | { l: string[] }, i: number) => {
    const [who, sv] = Array.isArray(raw) ? raw : raw.l;
    jobs.push({ name: String(i + 1).padStart(2, '0'), text: sv, v: voiceFor(who) });
  });

  for (const job of jobs) {
    const rel = `${a.id}/${job.name}.mp3`;
    const h = hashOf(job.text, job.v);
    const target = path.join(OUT, rel);
    if (manifest[rel] === h && fs.existsSync(target)) {
      skipped++;
      continue;
    }
    process.stdout.write(`${rel}  ${job.v.voice.replace('sv-SE-', '').replace('Neural', '')}  "${job.text.slice(0, 50)}"\n`);
    fs.writeFileSync(target, await synth(job.text, job.v));
    manifest[rel] = h;
    generated++;
    chars += job.text.length;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
    await new Promise((r) => setTimeout(r, 150)); // stay well under the free-tier rate limit
  }
}
console.log(`Done. Generated ${generated} clips (${chars} characters), ${skipped} unchanged. Now run: npm run build:lessons`);
