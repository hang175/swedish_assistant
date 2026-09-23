/** Swedish text-to-speech through the browser's built-in Web Speech API. */
import { useEffect, useState } from 'react';
import { getState } from './store';

const synth: SpeechSynthesis | undefined = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export function swedishVoices(): SpeechSynthesisVoice[] {
  if (!synth) return [];
  return synth
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('sv'))
    .sort((a, b) => score(b) - score(a));
}
// "Natural"/online voices (Edge) sound much better than the classic local ones
const score = (v: SpeechSynthesisVoice) => (/natural|online/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);

/** undefined while the browser is still loading its voice list */
export function useSwedishVoices(): SpeechSynthesisVoice[] | undefined {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | undefined>(undefined);
  useEffect(() => {
    if (!synth) {
      setVoices([]);
      return;
    }
    const update = () => setVoices(swedishVoices());
    if (synth.getVoices().length) update();
    synth.addEventListener('voiceschanged', update);
    // some browsers never fire voiceschanged when the list is empty
    const t = setTimeout(update, 1500);
    return () => {
      synth.removeEventListener('voiceschanged', update);
      clearTimeout(t);
    };
  }, []);
  return voices;
}

/**
 * Speak Swedish text. If the browser has no Swedish voice we stay silent on purpose:
 * the fallback would be an English voice reading Swedish spelling, which teaches the wrong sounds.
 */
export function speak(text: string, attempt = 0): void {
  if (currentClip) stopAll();
  if (!synth || !text) return;
  const { rate, voiceURI } = getState().settings;
  const voices = swedishVoices();
  if (!voices.length) {
    // the voice list loads asynchronously – give it a moment right after page load
    if (attempt < 3) setTimeout(() => speak(text, attempt + 1), 400);
    return;
  }
  const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0];
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice.lang;
  u.voice = voice;
  u.rate = rate;
  synth.speak(u);
}

/** What to read aloud for a word: nouns get their article, verbs their infinitive marker is left out. */
export const spokenForm = (w: { w: string; g?: string }) => (w.g === 'en' || w.g === 'ett' ? `${w.g} ${w.w}` : w.w);

/** Speak one text and resolve when it has finished (or was cancelled / no voice available). */
export function speakAsync(text: string, rateOverride?: number): Promise<void> {
  return new Promise((resolve) => {
    if (currentClip) stopAll();
    if (!synth || !text) return resolve();
    const { rate, voiceURI } = getState().settings;
    const voices = swedishVoices();
    if (!voices.length) return resolve();
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0];
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice.lang;
    u.voice = voice;
    u.rate = rateOverride ?? rate;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // safety net: some browsers never fire onend after cancel()
    setTimeout(finish, 1000 + text.length * 250);
    synth.speak(u);
  });
}
export const stopSpeaking = () => stopAll();

/* ---- pre-generated clips: one player, so "stop" always works and clips never overlap */
let currentClip: HTMLAudioElement | null = null;

export function stopAll(): void {
  synth?.cancel();
  if (currentClip) {
    currentClip.pause();
    currentClip.src = '';
    currentClip = null;
  }
}

/** Play an mp3 (relative to public/) and resolve when it ends or is stopped. Falls back to the browser voice if the file fails. */
export function playClipAsync(audio: string, fallbackText: string, rate = 1): Promise<void> {
  stopAll();
  return new Promise((resolve) => {
    const a = new Audio(import.meta.env.BASE_URL + audio);
    currentClip = a;
    a.playbackRate = rate;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (currentClip === a) currentClip = null;
      resolve();
    };
    a.onended = finish;
    a.onpause = finish;
    a.onerror = () => {
      finish();
      void speakAsync(fallbackText, rate);
    };
    a.play().catch(() => {
      finish();
      void speakAsync(fallbackText, rate);
    });
  });
}
