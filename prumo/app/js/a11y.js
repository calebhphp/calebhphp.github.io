// Accessibility panel: theme, contrast, text size, motion, language, Libras.
import { getPrefs, setPref } from './prefs.js';
import { t } from './i18n.js';
import { announce } from './ui.js';

const seg = (key, opts) => `<div class="seg" role="group" aria-labelledby="lbl-${key}">${opts.map(([v, label]) =>
  `<button type="button" data-pref="${key}" data-v="${v}" aria-pressed="${String(getPrefs()[key]) === String(v)}">${label}</button>`).join('')}</div>`;

export function renderPanel(panel) {
  const p = getPrefs();
  panel.innerHTML = `
    <h2 id="a11y-title">${t('a11y.title')}</h2>
    <div class="field"><span class="field-l" id="lbl-theme"><strong>${t('a11y.theme')}</strong></span>
      ${seg('theme', [['auto', t('a11y.auto')], ['light', t('a11y.light')], ['dark', t('a11y.dark')]])}</div>
    <div class="field"><span id="lbl-font"><strong>${t('a11y.text')}</strong></span>
      ${seg('font', [[90, 'A−'], [100, 'A'], [115, 'A+'], [130, 'A++']])}</div>
    <div class="field"><span id="lbl-lang"><strong>${t('a11y.lang')}</strong></span>
      ${seg('lang', [['pt-BR', 'Português'], ['en', 'English'], ['es', 'Español']])}</div>
    <div class="field"><span id="lbl-currency"><strong>${t('a11y.currency')}</strong></span>
      ${seg('currency', [['BRL', 'R$'], ['USD', 'US$'], ['EUR', '€']])}</div>
    <div class="toggle-row"><span id="sw-contrast">${t('a11y.contrast')}</span>
      <button type="button" class="switch" role="switch" aria-labelledby="sw-contrast" aria-checked="${p.contrast}" data-toggle="contrast"></button></div>
    <div class="toggle-row"><span id="sw-motion">${t('a11y.motion')}</span>
      <button type="button" class="switch" role="switch" aria-labelledby="sw-motion" aria-checked="${p.motion === 'off'}" data-toggle="motion"></button></div>
    <div class="toggle-row"><span id="sw-libras">${t('a11y.libras')}<br><small class="muted">${t('a11y.librasHint')}</small></span>
      <button type="button" class="switch" role="switch" aria-labelledby="sw-libras" aria-checked="${p.libras}" data-toggle="libras"></button></div>`;
}

export function bindPanel(btn, panel, onChange) {
  const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => {
    const open = panel.hidden;
    if (open) renderPanel(panel);
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('button')?.focus();
  });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); btn.focus(); } });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pref) {
      const k = b.dataset.pref; const v = k === 'font' ? +b.dataset.v : b.dataset.v;
      setPref(k, v);
    } else if (b.dataset.toggle) {
      const k = b.dataset.toggle;
      if (k === 'contrast') setPref('contrast', !getPrefs().contrast);
      if (k === 'motion') setPref('motion', getPrefs().motion === 'off' ? 'auto' : 'off');
      if (k === 'libras') { setPref('libras', !getPrefs().libras); if (getPrefs().libras) loadLibras(); else location.reload(); }
    } else return;
    const sel = `[data-pref="${b.dataset.pref}"][data-v="${b.dataset.v}"], [data-toggle="${b.dataset.toggle}"]`;
    renderPanel(panel);
    panel.querySelector(sel)?.focus();
    announce(t('a11y.updated'));
    onChange && onChange();
  });
}

// VLibras: official Brazilian government widget that signs page text in Libras.
let librasLoaded = false;
export function loadLibras() {
  if (librasLoaded) return;
  librasLoaded = true;
  const box = document.createElement('div');
  box.setAttribute('vw', ''); box.className = 'enabled';
  box.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
  document.body.appendChild(box);
  const s = document.createElement('script');
  s.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
  s.onload = () => { try { new window.VLibras.Widget('https://vlibras.gov.br/app'); window.onload && window.onload(); } catch (e) { /* offline */ } };
  document.body.appendChild(s);
}
