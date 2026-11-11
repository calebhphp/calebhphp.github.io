// AI and voice. Answers come from the Prumo advisor service (a Supabase function, signed-in users only);
// without a session, or when the service fails, the app falls back to local rules over the person's own
// numbers, so it never breaks. Voice uses the browser's speech APIs.
import { t } from './i18n.js';
import { getPrefs, setPref } from './prefs.js';
import * as cloud from './cloud.js';
import { ADVISOR_ON } from './config.js';

export const aiReady = () => Promise.resolve();
export const hasAI = () => ADVISOR_ON && cloud.enabled() && cloud.hasSession();

export async function askAI(messages, { system, json = false, signal } = {}) {
  if (!hasAI()) throw { code: 'unavailable' };
  try {
    return await cloud.advise({ system, messages, json }, signal);
  } catch (e) {
    throw { code: e && e.status === 429 ? 'slow_down' : 'unavailable' };
  }
}

// --- Voice in -------------------------------------------------------------
// Returns a stop function. onText gets the running transcript.
export function listen({ lang, onText, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onEnd('unavailable'); return () => {}; }
  if (!getPrefs().micOk) {
    if (!window.confirm(t('mic.consent'))) { onEnd('denied'); return () => {}; }
    setPref('micOk', true);
  }
  const r = new SR();
  r.lang = lang; r.interimResults = true; r.continuous = true;
  let final = '';
  r.onresult = ev => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) final += ev.results[i][0].transcript + ' ';
      else interim += ev.results[i][0].transcript;
    }
    onText((final + interim).trim(), !!interim);
  };
  r.onerror = e => onEnd(e.error);
  r.onend = () => onEnd('stopped');
  try { r.start(); } catch (e) { onEnd('unavailable'); }
  return () => r.stop();
}
export const canListen = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// --- Voice out ------------------------------------------------------------
export async function speak(text, lang) {
  if (!('speechSynthesis' in window)) throw new Error('no-speech');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  speechSynthesis.speak(u);
}
