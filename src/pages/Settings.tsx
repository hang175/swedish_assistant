import { useRef, useState } from 'react';
import { LEVELS, type Level } from '../types';
import { loadMeta, useAsync } from '../lib/data';
import { exportBackup, importBackup, resetAll, updateSettings, useAppState, validate, type AppState } from '../lib/store';
import { speak, useSwedishVoices } from '../lib/speech';
import { VoiceNotice } from './Today';
import Account from '../components/Account';
import { overwriteCloud } from '../lib/sync';

export default function Settings() {
  const { settings, cards, days } = useAppState();
  const voices = useSwedishVoices();
  const { data: meta } = useAsync(loadMeta, []);
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const num = (key: 'newPerDay' | 'reviewLimit', max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, Math.min(max, Math.round(Number(e.target.value) || 0)));
    updateSettings({ [key]: v });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setMessage('');
    try {
      setPending(validate(JSON.parse(await f.text())));
    } catch (err) {
      setPending(null);
      setMessage(err instanceof SyntaxError ? 'Not a valid backup file: it is not JSON.' : String((err as Error).message));
    }
  };

  return (
    <div className="stack narrow">
      <h1>Settings</h1>

      <Account />

      <section className="card">
        <h2>Daily task</h2>
        <label className="field">
          <span>New words per day</span>
          <input type="number" min={0} max={200} value={settings.newPerDay} onChange={num('newPerDay', 200)} />
        </label>
        <label className="field">
          <span>Maximum reviews per day</span>
          <input type="number" min={0} max={1000} value={settings.reviewLimit} onChange={num('reviewLimit', 1000)} />
        </label>
        <label className="field">
          <span>
            Start new words from level
            <small className="muted"> – lower levels are skipped, not marked as known</small>
          </span>
          <select value={settings.startLevel} onChange={(e) => updateSettings({ startLevel: e.target.value as Level })}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>
            Ask “en or ett?” for nouns
            <small className="muted"> – a wrong article counts as a wrong answer</small>
          </span>
          <input type="checkbox" checked={settings.askGender} onChange={(e) => updateSettings({ askGender: e.target.checked })} />
        </label>
      </section>

      <section className="card">
        <h2>Lessons</h2>
        <label className="field">
          <span>Explanations under each line</span>
          <select value={settings.lessonLang} onChange={(e) => updateSettings({ lessonLang: e.target.value as 'en' | 'zh' | 'both' })}>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="both">English + 中文</option>
          </select>
        </label>
      </section>

      <section className="card">
        <h2>Pronunciation</h2>
        <VoiceNotice />
        <label className="field">
          <span>Read each word aloud automatically</span>
          <input type="checkbox" checked={settings.autoSpeak} onChange={(e) => updateSettings({ autoSpeak: e.target.checked })} />
        </label>
        <label className="field">
          <span>Speed: {settings.rate.toFixed(2)}×</span>
          <input type="range" min={0.5} max={1.5} step={0.05} value={settings.rate} onChange={(e) => updateSettings({ rate: Number(e.target.value) })} />
        </label>
        <label className="field">
          <span>Voice</span>
          <select value={settings.voiceURI} onChange={(e) => updateSettings({ voiceURI: e.target.value })} disabled={!voices?.length}>
            <option value="">Automatic (best available)</option>
            {voices?.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">
          {voices?.length
            ? `Swedish voices found: ${voices.length}. Using: ${(voices.find((v) => v.voiceURI === settings.voiceURI) ?? voices[0]).name}`
            : 'Swedish voices found: 0'}
        </p>
        <button disabled={!voices?.length} onClick={() => speak('Hej! Jag heter Anna och jag bor i Sverige. Sju sjösjuka sjömän.')}>Test the voice</button>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted small">
          Without an account, progress lives only in this browser ({Object.keys(cards).length} words, {Object.keys(days).length} study days). Export a backup now and then, and use it
          to move to another browser or computer.
        </p>
        <div className="row wrap">
          <button onClick={exportBackup}>Export backup (JSON)</button>
          <button onClick={() => file.current?.click()}>Import backup…</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        {message && <p className="error">{message}</p>}
        {pending && (
          <div className="notice">
            <p>
              The backup contains <b>{Object.keys(pending.cards).length}</b> words and <b>{Object.keys(pending.days).length}</b> study days. Importing{' '}
              <b>replaces</b> everything currently stored in this browser.
            </p>
            <div className="row">
              <button
                className="danger"
                onClick={() => {
                  importBackup(pending);
                  void overwriteCloud();
                  setPending(null);
                  setMessage('');
                }}
              >
                Replace my current progress
              </button>
              <button onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
        <hr />
        {confirmReset ? (
          <div className="row wrap">
            <span>Delete all progress and settings – in this browser and, if you are signed in, in your account?</span>
            <button
              className="danger"
              onClick={() => {
                resetAll();
                void overwriteCloud();
                setConfirmReset(false);
              }}
            >
              Yes, delete everything
            </button>
            <button onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)}>Reset all progress…</button>
        )}
      </section>

      <section className="card credits" id="credits">
        <h2>Credits &amp; licences</h2>
        <p>The word bank {meta ? `(built ${meta.built}) ` : ''}is generated by a script from three open data sources. Thank you to everyone behind them.</p>
        <ul>
          <li>
            <b>Swedish Kelly list</b> – word selection, frequency, CEFR level, word class and en/ett. Språkbanken Text, University of Gothenburg.{' '}
            <a href="https://spraakbanken.gu.se/en/resources/kelly" target="_blank" rel="noreferrer">
              spraakbanken.gu.se/en/resources/kelly
            </a>
            . Licence: CC BY-SA 3.0 / LGPL 3.0. Reference: Volodina, E. &amp; Johansson Kokkinakis, S. (2012). <i>Introducing the Swedish Kelly-list, a new
            lexical e-resource for Swedish.</i> LREC 2012.
          </li>
          <li>
            <b>Folkets lexikon</b> – English glosses, inflections, phonetic transcriptions and some example sentences. KTH Royal Institute of Technology.{' '}
            <a href="https://folkets-lexikon.csc.kth.se/folkets/om.en.html" target="_blank" rel="noreferrer">
              folkets-lexikon.csc.kth.se
            </a>
            . Licence: CC BY-SA 2.5.
          </li>
          <li>
            <b>Tatoeba</b> – example sentences, through the sentence-pair files prepared at{' '}
            <a href="https://www.manythings.org/anki/" target="_blank" rel="noreferrer">
              manythings.org/anki
            </a>
            .{' '}
            <a href="https://tatoeba.org" target="_blank" rel="noreferrer">
              tatoeba.org
            </a>
            . Licence: CC BY 2.0 FR. Every sentence is shown with its Tatoeba number and the name of its author. Text only – no Tatoeba audio is used.
          </li>
        </ul>
        <p>
          The generated word-bank files (<code>public/data</code>) are shared under <b>CC BY-SA 4.0</b>; the application code is under the <b>MIT</b> licence. A few
          glosses for very common function words were written by hand where the dictionary had no entry. Speech is produced by your browser’s built-in voices.
          The grammar notes are original text written for this app.
        </p>
      </section>
    </div>
  );
}
