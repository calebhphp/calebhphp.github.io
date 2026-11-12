// Viewer preferences: kept per browser, never needed for the app to work.
const KEY = 'prumo.prefs';
const DEFAULTS = { theme: 'auto', contrast: false, font: 100, motion: 'auto', lang: 'pt-BR', currency: 'BRL', libras: false, tone: 'sobrio', adult: false, accent: 'latao', hide: false };

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

// What the screen looks like right now, whether the person chose it or the phone did.
export const effectiveTheme = () => prefs.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : prefs.theme;
export const toggleTheme = () => setPref('theme', effectiveTheme() === 'dark' ? 'light' : 'dark');

export const onPrefs = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function applyPrefs() {
  const root = document.documentElement;
  if (prefs.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = prefs.theme;
  if (prefs.contrast) root.dataset.contrast = 'high'; else delete root.dataset.contrast;
  if (prefs.motion === 'off') root.dataset.motion = 'off'; else delete root.dataset.motion;
  if (prefs.accent && prefs.accent !== 'latao') root.dataset.accent = prefs.accent; else delete root.dataset.accent;
  if (prefs.hide) root.dataset.hide = '1'; else delete root.dataset.hide;
  root.style.fontSize = prefs.font === 100 ? '' : prefs.font + '%';
  root.lang = prefs.lang;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = effectiveTheme() === 'dark' ? '#0f1311' : '#eff0ec';
  document.querySelectorAll('[data-theme-toggle]').forEach(b => {
    const dark = effectiveTheme() === 'dark';
    b.setAttribute('aria-pressed', String(dark));
    b.setAttribute('aria-label', document.documentElement.lang === 'en' ? (dark ? 'Switch to light mode' : 'Switch to dark mode') : document.documentElement.lang === 'es' ? (dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro') : (dark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'));
  });
}
