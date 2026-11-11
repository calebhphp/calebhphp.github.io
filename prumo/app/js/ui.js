import { t } from './i18n.js';
import { esc } from './format.js';

export const icon = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

const live = () => document.getElementById('live');

export function announce(msg) {
  const el = live();
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

export function toast(msg, xp, silent = false) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('aria-hidden', 'true'); // the live region already speaks it
  const span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
  if (xp) { const chip = document.createElement('span'); chip.className = 'xp-chip'; chip.textContent = '+' + xp + ' XP'; el.appendChild(chip); }
  box.appendChild(el);
  if (!silent) announce(xp ? `${msg}. ${t('game.gained', { xp })}` : msg);
  setTimeout(() => el.remove(), 3600);
}

// Native <dialog>: focus trap, Esc and inert background come for free.
export function openDialog({ title, body, submit, onSubmit, onOpen }) {
  const dlg = document.getElementById('dlg');
  dlg.innerHTML = `
    <form method="dialog" id="dlg-form">
      <div class="dlg-head"><h2 id="dlg-title">${title}</h2>
        <button type="button" class="btn btn-ghost icon-btn" data-close>${icon('i-x')}<span class="sr-only">${t('common.close')}</span></button></div>
      <div class="dlg-body">${body}</div>
      <div class="dlg-foot">
        <button type="button" class="btn" data-close>${t('common.cancel')}</button>
        <button type="submit" class="btn btn-primary" value="ok">${submit}</button>
      </div>
    </form>`;
  const opener = document.activeElement;
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.querySelector('form').addEventListener('submit', e => {
    const fd = new FormData(e.target);
    const ok = onSubmit(Object.fromEntries(fd.entries()));
    if (ok === false) e.preventDefault();
  });
  dlg.addEventListener('close', () => opener && opener.focus && opener.focus(), { once: true });
  dlg.showModal();
  onOpen && onOpen(dlg);
  const first = dlg.querySelector('.dlg-body input, .dlg-body select, .dlg-body button');
  first && first.focus();
}

export function confirmLevelUp(level, reward) {
  const wrap = document.createElement('div');
  wrap.className = 'level-up';
  wrap.setAttribute('role', 'alertdialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-labelledby', 'lvl-title');
  wrap.innerHTML = `<div class="card card-hero">
      <div class="ring" style="--p:100;width:84px;height:84px;margin:0 auto 12px"><span style="width:68px;height:68px;font-size:1.6rem">${level}</span></div>
      <h2 id="lvl-title" style="margin:0 0 6px">${t('game.levelUp', { level })}</h2>
      <p class="muted" style="margin:0 0 18px">${reward ? t('game.rewardUnlocked', { reward: esc(reward) }) : t('game.keepGoing')}</p>
      <button class="btn btn-primary" type="button">${t('common.continue')}</button></div>`;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector('button');
  const opener = document.activeElement;
  const close = () => { wrap.remove(); opener && opener.focus && opener.focus(); };
  btn.addEventListener('click', close);
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); if (e.key === 'Escape') close(); } });
  btn.focus();
  announce(t('game.levelUp', { level }));
}
