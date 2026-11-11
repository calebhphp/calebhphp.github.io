import { t } from './i18n.js';
import { getPrefs, setPref } from './prefs.js';
// AI and voice. Inside a Claude artifact the page borrows the viewer's own
// Claude (sample), dictation and voice. Anywhere else it falls back to the
// browser's speech APIs and a local rule engine, so the demo never breaks.

const caps = {};
const ready = (async () => {
  const c = window.claude;
  if (!c || typeof c.use !== 'function') return;
  const get = name => c.use(name).then(v => { caps[name] = v; }).catch(() => {});
  await Promise.all(['sample', 'dictation', 'tts'].map(get));
  document.dispatchEvent(new CustomEvent('prumo:ai-ready'));
})();

export const aiReady = () => ready;
export const hasAI = () => !!caps.sample;

export async function askAI(input, { onText, signal, json = false, quick = false } = {}) {
  if (!caps.sample) throw { code: 'unavailable' };
  const opts = { onText, signal, cache: false, modelTier: quick ? 'quick' : 'default' };
  return json ? caps.sample.json(input, { signal, modelTier: 'quick' }) : caps.sample(input, opts);
}

// --- Voice in -------------------------------------------------------------
// Returns a stop function. onText gets the running transcript.
export function listen({ lang, onText, onEnd }) {
  if (caps.dictation) {
    const d = caps.dictation;
    let text = '';
    const offs = [
      d.onFinal(e => { text += e.text; onText(text.trim(), false); }),
      d.onPartial(e => { if (e.text) onText((text + ' ' + e.text).trim(), true); }),
      d.onState(e => { if (e.state === 'idle') { offs.forEach(f => f()); onEnd(e.reason); } }),
    ];
    d.start({ language: lang }).catch(e => { offs.forEach(f => f()); onEnd(e.code); });
    return () => d.stop();
  }
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
export const canListen = () => !!(caps.dictation || window.SpeechRecognition || window.webkitSpeechRecognition);

// --- Voice out ------------------------------------------------------------
export async function speak(text, lang) {
  if (caps.tts) {
    try { await caps.tts.speak(text, { language: lang === 'pt-BR' ? 'pt-BR' : lang.slice(0, 2) }); return; } catch (e) { /* fall through */ }
  }
  if (!('speechSynthesis' in window)) throw new Error('no-speech');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  speechSynthesis.speak(u);
}
