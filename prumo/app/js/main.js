import * as store from './store.js';
import { applyPrefs, onPrefs, getPrefs, setPref } from './prefs.js';
import './ai.js';
import { initOverlay, repaintChat } from './advisor.js';
import { t, translateStatic } from './i18n.js';
import { actions, ctx } from './actions.js';
import { icon, confirmLevelUp, toast, openDialog } from './ui.js';
import { UNLOCK_LEVEL } from './tone.js';
import { levelInfo } from './game.js';
import { monthLabel, esc } from './format.js';
import { bindPanel, loadLibras } from './a11y.js';

const NAV = [
  { r: 'inicio', i: 'i-home' },
  { r: 'gastos', i: 'i-pen' },
  { r: 'conselheiro', i: 'i-chat' },
  { r: 'retro', i: 'i-star' },
  { r: 'cartao', i: 'i-card' },
  { r: 'contas', i: 'i-cal' },
  { r: 'bancos', i: 'i-bank' },
  { r: 'entradas', i: 'i-in' },
  { r: 'mei', i: 'i-mei' },
  { r: 'assinaturas', i: 'i-sub' },
  { r: 'cofres', i: 'i-safe' },
  { r: 'conquistas', i: 'i-trophy' },
];

const main = document.getElementById('main');
let current = null;
const viewCache = {};

const route = () => (location.hash.replace(/^#\/?/, '') || 'inicio').split('?')[0];

async function loadView(name) {
  // Each module is its own file and only loads when opened.
  if (!viewCache[name]) viewCache[name] = import(`./views/${name}.js`);
  return viewCache[name];
}

function renderChrome() {
  const s = store.get();
  const r = route();
  document.getElementById('nav').innerHTML = NAV.filter(n => s.modules.includes(n.r)).map(n =>
    `<li><a href="#${n.r}" ${n.r === r ? 'aria-current="page"' : ''}>${icon(n.i)}<span>${t('nav.' + n.r)}</span></a></li>`).join('');
  const pf = document.querySelector('.side-foot a[data-route="personalizar"]');
  if (r === 'personalizar') pf.setAttribute('aria-current', 'page'); else pf.removeAttribute('aria-current');
  const lv = levelInfo(s.game.xp);
  document.getElementById('me-chip').innerHTML =
    `<span class="ring" style="--p:${Math.round(lv.pct * 100)}" aria-hidden="true"><span>${lv.level}</span></span>
     <span><strong>${esc(s.profile.name)}</strong><small>${t('game.levelShort', { level: lv.level, xp: lv.toNext })}</small></span>`;
  document.getElementById('me-chip').setAttribute('aria-label', `${s.profile.name}. ${t('game.levelAria', { level: lv.level, xp: lv.toNext })}`);
  document.getElementById('month-label').textContent = monthLabel(ctx.ym);
}

async function render({ focusHeading = false } = {}) {
  const name = route();
  const s = store.get();
  if (!document.documentElement.classList.contains('authed')) return;
  const valid = ['personalizar', 'comecar', 'dados'].includes(name) || s.modules.includes(name);
  const target = valid ? name : 'inicio';
  renderChrome();
  // Keep focus on the control the person just used, if it survives the re-render.
  const a = document.activeElement;
  const key = a && a.dataset && a.dataset.action ? `[data-action="${a.dataset.action}"]${a.dataset.id ? `[data-id="${a.dataset.id}"]` : ''}${a.dataset.v ? `[data-v="${a.dataset.v}"]` : ''}${a.dataset.dir ? `[data-dir="${a.dataset.dir}"]` : ''}${a.dataset.k ? `[data-k="${a.dataset.k}"]` : ''}${a.dataset.day ? `[data-day="${a.dataset.day}"]` : ''}${a.dataset.m ? `[data-m="${a.dataset.m}"]` : ''}` : null;
  const inMain = a && main.contains(a);
  const idx = inMain ? [...main.querySelectorAll('[data-action]')].indexOf(a) : -1;
  const view = await loadView(target);
  current = target;
  main.innerHTML = view.render(store.get(), ctx);
  view.mount && view.mount(main, store.get(), ctx);
  document.title = `${t('nav.' + target)} | Prumo`;
  if (focusHeading) main.querySelector('h1')?.focus();
  else if (key && inMain) (main.querySelector(key) || main.querySelectorAll('[data-action]')[idx])?.focus();
}

// Global click delegation for data-action buttons.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === 'BUTTON') e.preventDefault();
  fn(el);
});

// Mobile menu
const side = document.getElementById('side');
const menuBtn = document.getElementById('menu-btn');
const backdrop = document.getElementById('backdrop');
var setMenu = open => {
  side.classList.toggle('open', open); backdrop.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) side.querySelector('a')?.focus();
};
menuBtn.addEventListener('click', () => setMenu(!side.classList.contains('open')));
backdrop.addEventListener('click', () => { setMenu(false); menuBtn.focus(); });
side.addEventListener('keydown', e => { if (e.key === 'Escape' && side.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
side.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

// Changing screens cross-fades when the browser can (View Transitions); the rest just swaps.
const still = () => getPrefs().motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
window.addEventListener('hashchange', () => {
  if (document.startViewTransition && !still() && document.documentElement.classList.contains('authed')) document.startViewTransition(() => render({ focusHeading: true }));
  else render({ focusHeading: true });
});
document.addEventListener('prumo:render', () => render());
document.addEventListener('prumo:levelup', e => {
  const s = store.get();
  const reward = s.game.rewards.find(r => r.level === e.detail);
  setTimeout(() => confirmLevelUp(e.detail, reward && reward.text), 700);
  if (e.detail === UNLOCK_LEVEL) setTimeout(() => toast(t('tone.unlocked')), 1600);
});
store.subscribe((s, prev, meta) => render());
onPrefs((p, key) => { translateStatic(); render(); if (key === 'lang') document.documentElement.lang = p.lang; });

bindPanel(document.getElementById('a11y-btn'), document.getElementById('a11y-panel'));
initOverlay();
document.addEventListener('prumo:ai-ready', () => { render(); repaintChat(); });

// Demo login: fixed values, nothing leaves the browser.
const loginForm = document.getElementById('login-form');
const pw = document.getElementById('password');
const togglePw = document.getElementById('toggle-pw');
function syncLogin() {
  const ok = document.getElementById('accept'); if (ok && (getPrefs().terms || {}).v === '2026-11-11') ok.checked = true;
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === getPrefs().lang)));
  togglePw.textContent = t(pw.type === 'password' ? 'login.show' : 'login.hide');
}
togglePw.addEventListener('click', () => {
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  togglePw.setAttribute('aria-pressed', String(show));
  syncLogin();
});
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { setPref('lang', b.dataset.lang); syncLogin(); }));
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const err = document.getElementById('login-error');
  const accept = document.getElementById('accept');
  if (!accept.checked) { err.textContent = t('login.accept'); err.hidden = false; accept.focus(); return; }
  // Keep proof of what was accepted and when, on this device.
  if ((getPrefs().terms || {}).v !== '2026-11-11') setPref('terms', { v: '2026-11-11', at: new Date().toISOString() });
  const email = loginForm.email.value.trim().toLowerCase();
  if (email !== 'john@doe.com' || pw.value !== 'password') {
    err.textContent = t('login.error'); err.hidden = false;
    (email !== 'john@doe.com' ? loginForm.email : pw).focus();
    return;
  }
  try { sessionStorage.setItem('prumo.session', '1'); } catch (x) { /* ignore */ }
  document.documentElement.classList.add('authed');
  if (!store.get().profile.quiz && !location.hash) location.hash = '#inicio';
  render({ focusHeading: true });
});
document.addEventListener('prumo:logout', () => {
  document.documentElement.classList.remove('authed');
  document.title = 'Prumo Demo';
  document.getElementById('email').focus();
});

// Installable app that works offline. Skipped inside frames (the claude.ai preview).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
let installEvt = null;
const installBtn = document.getElementById('install-btn');
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const inAppBrowser = /FBAN|FBAV|Instagram|Twitter|LinkedInApp|Line\/|Snapchat|TikTok/i.test(ua);
if (standalone()) installBtn.hidden = true;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
installBtn.addEventListener('click', async () => {
  if (installEvt) {
    installEvt.prompt();
    await installEvt.userChoice;
    installEvt = null;
    return;
  }
  // iPhone and some browsers have no install prompt: show the steps for this phone.
  const key = inAppBrowser ? 'pwa.stepsInApp' : isIOS ? 'pwa.stepsIOS' : 'pwa.stepsAndroid';
  openDialog({ title: t('pwa.howTitle'), submit: t('common.continue'), body: '<div class="how-install">' + t(key) + '</div>', onSubmit: () => {} });
});
addEventListener('appinstalled', () => { installBtn.hidden = true; toast(t('pwa.installed')); });
document.getElementById('tab-menu').addEventListener('click', () => setMenu(true));
document.getElementById('tabbar').addEventListener('click', e => { if (e.target.closest('[data-tab]') && navigator.vibrate) navigator.vibrate(8); });
function markTab() {
  const r = route();
  document.querySelectorAll('#tabbar [data-tab]').forEach(el => { if (el.dataset.tab === r) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
}
window.addEventListener('hashchange', markTab);
document.addEventListener('prumo:render', markTab);
markTab();
addEventListener('offline', () => toast(t('pwa.offline')));
addEventListener('online', () => toast(t('pwa.online')));

applyPrefs();
store.load();
translateStatic();
syncLogin();
if (getPrefs().libras) loadLibras();
render();
