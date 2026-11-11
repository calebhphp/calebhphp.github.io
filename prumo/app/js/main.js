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
import * as cloud from './cloud.js';

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
  const valid = ['personalizar', 'comecar', 'dados'].includes(name) || s.modules.includes(name) || (name === 'admin' && cloud.user()?.role === 'admin' && store.isReal());
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
store.subscribe((s, prev, meta) => { if (!meta.reset || store.isReal()) queueSave(); render(); });
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
const DEMO = { email: 'john@doe.com', pw: 'password' };
const loginErr = msg => { const err = document.getElementById('login-error'); err.textContent = msg; err.hidden = false; };
function accepted() {
  const accept = document.getElementById('accept');
  if (!accept.checked) { loginErr(t('login.accept')); accept.focus(); return false; }
  // Keep proof of what was accepted and when, on this device.
  if ((getPrefs().terms || {}).v !== '2026-11-11') setPref('terms', { v: '2026-11-11', at: new Date().toISOString() });
  return true;
}
function enterDemo() {
  store.useDemo();
  try { sessionStorage.setItem('prumo.session', '1'); } catch (x) { /* ignore */ }
  document.documentElement.classList.add('authed');
  document.documentElement.classList.remove('real');
  if (!store.get().profile.quiz && !location.hash) location.hash = '#inicio';
  render({ focusHeading: true });
}

// Beta account: the screen shows a skeleton while the person's data comes from the server.
let saveTimer = null, saving = false;
async function enterAccount({ fresh = false } = {}) {
  if (cloud.enabled() && cloud.hasSession() && !cloud.user()) {
    try { await cloud.refreshUser(); } catch (e) { await leaveAccount(); loginErr(t('login.linkExpired')); return; }
  }
  const u = cloud.user();
  if (!u) return;
  document.documentElement.classList.add('authed', 'real');
  main.innerHTML = skeleton();
  let server = null, offline = false;
  try { server = await cloud.loadState(); } catch (e) { if (e.code === 'auth' || e.status === 401) { await leaveAccount(); loginErr(t('login.expired')); return; } offline = true; }
  if (!cloud.user()) return;
  const name = u.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40);
  store.useAccount(u.id, server, name);
  if (!server && !offline) { store.get().profile.firstLogin = true; queueSave(); }
  if (offline) toast(t('sync.offline'));
  if (fresh || !location.hash) location.hash = '#inicio';
  // Pick up role, plan and the "change your password" flag set by the admin.
  if (!offline) { try { await cloud.refreshUser(); } catch (e) { /* keep the cached one */ } }
  document.documentElement.classList.toggle('is-admin', cloud.user()?.role === 'admin');
  await render({ focusHeading: true });
  if (cloud.user()?.mustChange || cloud.fromLink().type === 'recovery' || cloud.fromLink().type === 'invite') forcePassword();
}

// A temporary password or an e-mail link: a new password is required before using the app.
function forcePassword() {
  openDialog({
    title: t('pw.forceTitle'), submit: t('pw.forceSave'), locked: true,
    body: `<p class="muted" style="margin:0">${t('pw.forceSub')}</p>
      <input type="email" name="u" autocomplete="username" value="${esc(cloud.user()?.email || '')}" hidden>
      <div class="field"><label for="f-pw">${t('pw.new')}</label><input id="f-pw" name="pw" type="password" autocomplete="new-password" minlength="10" required></div>
      <div class="field"><label for="f-pw2">${t('pw.again')}</label><input id="f-pw2" name="pw2" type="password" autocomplete="new-password" minlength="10" required></div>
      <p class="error" id="pw-err" role="alert" hidden></p>
      <p style="margin:0"><button type="button" class="btn btn-ghost btn-sm" data-action="logout">${t('pw.forceOut')}</button></p>`,
    onSubmit: d => {
      const err = document.getElementById('pw-err');
      const bad = d.pw.length < 10 ? t('pw.short') : d.pw !== d.pw2 ? t('pw.diff') : '';
      if (bad) { err.textContent = bad; err.hidden = false; return false; }
      const dlg = document.getElementById('dlg');
      cloud.setPassword(d.pw)
        .then(() => { dlg.close(); store.update(s => { s.profile.pwSet = true; }); toast(t('pw.done')); })
        .catch(e => { err.textContent = e.status === 422 ? t('pw.weak') : t('pw.fail'); err.hidden = false; });
      return false;
    },
  });
}
function queueSave() {
  if (!store.isReal()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 1200);
}
async function flush() {
  if (!store.isReal() || saving || !cloud.user()) return;
  saving = true;
  const st = store.get();
  const { _dirty, _at, ...clean } = st;
  try { await cloud.saveState(clean); store.markSynced(true); document.documentElement.dataset.sync = 'ok'; }
  catch (e) { store.markSynced(false); document.documentElement.dataset.sync = 'off'; }
  saving = false;
}
async function leaveAccount() {
  document.documentElement.classList.remove('is-admin');
  clearTimeout(saveTimer);
  if (store.isReal() && store.get()?._dirty) await flush();
  await cloud.signOut();
  // Shared phone or computer: the local copy goes with the session.
  if (store.isReal()) store.forgetAccount();
  store.useDemo();
  document.documentElement.classList.remove('authed', 'real');
}
addEventListener('online', () => { if (store.isReal() && store.get()?._dirty) flush(); });
addEventListener('pagehide', () => { if (saveTimer) flush(); });
const skeleton = () => `<div class="skel" aria-busy="true" aria-label="${esc(t('sync.loading'))}">
  <i class="skel-h"></i><i class="skel-l"></i>
  <div class="skel-grid"><i class="skel-card big"></i><i class="skel-card"></i><i class="skel-card"></i><i class="skel-card"></i></div></div>`;

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  document.getElementById('login-error').hidden = true;
  if (!accepted()) return;
  const email = loginForm.email.value.trim().toLowerCase();
  if (email === DEMO.email && pw.value === DEMO.pw) return enterDemo();
  if (!cloud.enabled()) { loginErr(t('login.error')); loginForm.email.focus(); return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { loginErr(t('login.badEmail')); loginForm.email.focus(); return; }
  if (!pw.value) { loginErr(t('login.noPw')); pw.focus(); return; }
  const btn = loginForm.querySelector('[type="submit"]');
  btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  try {
    await cloud.signIn(email, pw.value);
    pw.value = '';
    await enterAccount({ fresh: true });
  } catch (x) {
    loginErr(x.status === 400 ? t('login.bad') : x.status === 429 ? t('login.slow') : t('login.offline'));
    pw.focus();
  } finally { btn.disabled = false; btn.removeAttribute('aria-busy'); }
});
document.getElementById('forgot').addEventListener('click', async () => {
  const email = loginForm.email.value.trim().toLowerCase();
  if (!cloud.enabled()) { location.href = 'mailto:matheusvillanova1@gmail.com?subject=Prumo%3A%20esqueci%20a%20senha'; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { loginErr(t('login.forgotNeedEmail')); loginForm.email.focus(); return; }
  try { await cloud.recover(email); } catch (e) { if (e.status === 429) { loginErr(t('login.slow')); return; } }
  // Same answer whether the e-mail exists or not.
  const err = document.getElementById('login-error'); err.textContent = t('login.forgotSent'); err.hidden = false;
});
document.getElementById('demo-btn').addEventListener('click', () => {
  document.getElementById('login-error').hidden = true;
  if (accepted()) enterDemo();
});
document.addEventListener('prumo:signout', async () => { await leaveAccount(); document.dispatchEvent(new CustomEvent('prumo:logout')); });
document.addEventListener('prumo:save-now', () => flush());
document.addEventListener('prumo:logout', () => {
  document.documentElement.classList.remove('authed');
  document.title = 'Prumo Demo';
  document.getElementById('email').focus();
});

// Installable app that works offline. Skipped inside frames (the claude.ai preview).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {}));
  // A new version took over: reload once so every file comes from the same deploy.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !navigator.serviceWorker.controller) return; reloaded = true; if (!document.getElementById('dlg')?.open) location.reload(); });
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
// A beta session survives reloads; the demo one ends with the tab.
if (cloud.fromLink().error) { loginErr(t('login.linkExpired')); }
if (cloud.enabled() && cloud.hasSession()) enterAccount(); else { document.documentElement.classList.remove('real'); render(); }
