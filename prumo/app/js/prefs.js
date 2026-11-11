// Viewer preferences: kept per browser, never needed for the app to work.
const KEY = 'prumo.prefs';
const DEFAULTS = { theme: 'auto', contrast: false, font: 100, motion: 'auto', lang: 'pt-BR', currency: 'BRL', libras: false, tone: 'sobrio', adult: false };

let prefs = { ...DEFAULTS };
try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* private mode */ }

const listeners = new Set();

export const getPrefs = () => prefs;

export function setPref(key, value) {
  prefs = { ...prefs, [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  applyPrefs();
  listeners.forEach(fn => fn(prefs, key));
}

export const onPrefs = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function applyPrefs() {
  const root = document.documentElement;
  if (prefs.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = prefs.theme;
  if (prefs.contrast) root.dataset.contrast = 'high'; else delete root.dataset.contrast;
  if (prefs.motion === 'off') root.dataset.motion = 'off'; else delete root.dataset.motion;
  root.style.fontSize = prefs.font === 100 ? '' : prefs.font + '%';
  root.lang = prefs.lang;
}
