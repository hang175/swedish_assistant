# Swedish Assistant

A small, private vocabulary trainer for Swedish: four-choice quiz, Leitner spaced repetition, Swedish text-to-speech, a searchable dictionary, spelling
practice and beginner grammar notes. Pure front end (React + Vite + TypeScript) – no server, no account. Progress is stored in your browser.

## Start it (Windows)

Double-click **`start.bat`**. The first time it installs the dependencies (needs [Node.js LTS](https://nodejs.org)); after that it opens the app in your
browser. For the best Swedish voice, open the address it shows (`http://localhost:5173`) in **Microsoft Edge**.

Or from a terminal:

```
npm install
npm run dev
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | start the app locally |
| `npm run build:data` | rebuild the word bank in `public/data/` and the lessons in `public/lessons/`; writes `build-report.md` |
| `npm run build:lessons` | rebuild only the lessons (after editing `lessons/*.json`) |
| `npm test` | unit tests for the spaced-repetition logic |
| `npm run build` | type-check and produce the static site in `dist/` |

## Rebuilding the word bank

The generated word bank is already in `public/data/`, so this is only needed when the raw data or the script changes. Put these three files in `data/raw/`
(or leave them in the project root) and run `npm run build:data`:

- `Swedish-Kelly_M3_CEFR.xls` – Kelly list
- `folkets_sv_en_public.xml` – Folkets lexikon, Swedish→English
- `swe.txt` – Tatoeba sentence pairs from manythings.org/anki (`swe-eng.zip`)

Never edit the JSON files by hand; change the script and rebuild. `build-report.md` shows coverage per level and lists every skipped word.

## How studying works

- Boxes 1–6 with review intervals of 1 / 2 / 4 / 8 / 16 / 32 days. Correct → up one box; wrong → back to box 1, and the word returns later in the same
  session until you get it right. Box 5 and above count as *mastered*.
- A study day starts at 04:00 local time. Finishing all of the day's new words and reviews checks the day in and extends the streak.
- New words are introduced from the chosen start level upwards, most frequent first. *Mark as known* in the Dictionary skips a word for good.
- Spelling practice only uses words you have already met and never changes your review schedule.
- Keyboard in Study: `1`–`4` answer, `Space`/`Enter` next, `R` replay the audio.
- Settings → Backup exports/imports all progress as one JSON file.

## Lessons (dialogues)

`lessons/*.json` holds short everyday dialogues, one file per lesson: every line is `[speaker, Swedish, English, Chinese, note-en?, note-zh?]`
plus a small glossary of phrases that are not in the word bank. `npm run build:lessons` links every Swedish word to the word bank through its
inflected forms and writes `public/lessons/`. In the app a lesson can be played line by line or as a whole (browser voice, adjustable speed,
loop, "hide Swedish" for listen-first practice); clicking a word shows its entry and can queue it as one of the next new words in Study.

Pre-recorded audio: a line may be written as `{ "l": [...], "audio": "audio/<lesson>/<n>.mp3" }`; a file placed under `public/audio/` is then
played instead of the browser voice, so lessons can be upgraded to studio or neural-TTS audio without touching the app.

## Accounts, sync and deployment

The app is local-first: progress always lives in the browser and everything works signed out or offline. If the two build-time variables
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, a Supabase e-mail + password account section appears in Settings and the progress object is
stored in one row per user (`supabase/schema.sql`, protected by row level security). Copies from several devices are merged card by card – the most
recently answered copy of each word wins (`src/lib/merge.ts`, unit-tested).

Step-by-step instructions for Supabase + GitHub + Vercel (in Chinese): **`部署指南.md`**. In short: run `supabase/schema.sql` in the Supabase SQL editor,
import the GitHub repository in Vercel, add the two environment variables, deploy, then put the Vercel URL into Supabase → Authentication → URL
Configuration.

## Data sources and licences

| Source | Used for | Licence |
|---|---|---|
| [Swedish Kelly list](https://spraakbanken.gu.se/en/resources/kelly), Språkbanken Text – Volodina & Johansson Kokkinakis (2012) | word list, frequency, CEFR, word class, en/ett | CC BY-SA 3.0 / LGPL 3.0 |
| [Folkets lexikon](https://folkets-lexikon.csc.kth.se/folkets/om.en.html), KTH | glosses, inflections, phonetics, some examples | CC BY-SA 2.5 |
| [Tatoeba](https://tatoeba.org) via [manythings.org/anki](https://www.manythings.org/anki/) | example sentences (text only, with sentence number and author) | CC BY 2.0 FR |

Application code and grammar notes: MIT (`LICENSE`). Generated word bank in `public/data/`: CC BY-SA 4.0 (`LICENSE-DATA`). The grammar notes are original
text; no textbook or reference-grammar content is included.
