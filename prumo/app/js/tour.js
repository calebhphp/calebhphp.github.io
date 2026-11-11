// A short guided tour: one highlighted spot at a time, Next / Back / Skip, Esc closes. Nothing is clicked for the person.
import { t } from './i18n.js';

const phone = () => matchMedia('(max-width: 900px)').matches;
const STEPS = [
  { k: 'quick', sel: () => '#home-quick' },
  { k: 'log', sel: () => phone() ? '#tabbar [data-tab="gastos"]' : '#nav a[href="#gastos"]' },
  { k: 'advisor', sel: () => phone() ? '#tabbar [data-tab="conselheiro"]' : '#nav a[href="#conselheiro"]' },
  { k: 'add', sel: () => '.top [data-action="add"]' },
  { k: 'more', sel: () => phone() ? '#tab-menu' : '.side-foot' },
];

let box = null, i = 0, opener = null;

export function startTour() {
  if (box) return;
  if (location.hash && location.hash !== '#inicio') { location.hash = '#inicio'; setTimeout(startTour, 450); return; }
  opener = document.activeElement;
  i = 0;
  box = document.createElement('div');
  box.className = 'tour';
  box.innerHTML = `<div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-d" tabindex="-1">
      <p class="tour-n"></p><h2 id="tour-t"></h2><p id="tour-d"></p>
      <div class="tour-foot"><button type="button" class="btn btn-ghost btn-sm" data-t="skip">${t('tour.skip')}</button>
        <span class="grow"></span><button type="button" class="btn btn-sm" data-t="back">${t('tour.back')}</button>
        <button type="button" class="btn btn-primary btn-sm" data-t="next"></button></div></div>`;
  document.body.appendChild(box);
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'skip') end();
    if (b.dataset.t === 'back') show(i - 1);
    if (b.dataset.t === 'next') i === STEPS.length - 1 ? end() : show(i + 1);
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    // keep the focus inside the tip
    if (e.key === 'Tab') {
      const f = [...box.querySelectorAll('button:not([disabled])')];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  addEventListener('resize', place);
  show(0);
}

function target() {
  const el = document.querySelector(STEPS[i].sel());
  return el && el.getClientRects().length ? el : null;
}

function show(n) {
  i = Math.max(0, Math.min(STEPS.length - 1, n));
  const s = STEPS[i];
  box.querySelector('.tour-n').textContent = t('tour.count', { n: i + 1, total: STEPS.length });
  box.querySelector('#tour-t').textContent = t('tour.' + s.k);
  box.querySelector('#tour-d').textContent = t('tour.' + s.k + 'Body');
  box.querySelector('[data-t="back"]').disabled = i === 0;
  box.querySelector('[data-t="next"]').textContent = t(i === STEPS.length - 1 ? 'tour.done' : 'tour.next');
  const el = target();
  if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  place();
  box.querySelector('.tour-tip').focus();
}

function place() {
  if (!box) return;
  const hole = box.querySelector('.tour-hole'), tip = box.querySelector('.tour-tip');
  const el = target();
  const vw = innerWidth, vh = innerHeight;
  if (!el) { hole.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`; tip.style.cssText = `left:${Math.max(16, vw / 2 - 170)}px;top:${vh / 2 - 90}px`; return; }
  const r = el.getBoundingClientRect(), pad = 8;
  hole.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
  const w = Math.min(340, vw - 32);
  const below = r.bottom + 16 + 190 < vh;
  const left = Math.min(vw - w - 16, Math.max(16, r.left + r.width / 2 - w / 2));
  tip.style.cssText = `width:${w}px;left:${left}px;${below ? `top:${r.bottom + pad + 12}px` : `bottom:${vh - r.top + pad + 12}px`}`;
}

function end() {
  removeEventListener('resize', place);
  box.remove(); box = null;
  opener && opener.focus && opener.focus();
}
