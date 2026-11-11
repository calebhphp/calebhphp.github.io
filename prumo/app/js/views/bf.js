// Black Friday: a ceiling, the person's own price notes and a plain verdict on each discount.
import { t } from '../i18n.js';
import { blackFriday, bfCeiling, priceVerdict, wishlistStatus } from '../finance.js';
import { money } from '../format.js';
import { icon, ico3d } from '../ui.js';

export function bfCard(s, ym, link = false) {
  const bf = blackFriday();
  if (!bf.show || !s.modules.includes('cofres')) return '';
  const open = wishlistStatus(s).filter(w => w.state !== 'bought');
  const ready = open.filter(w => w.state === 'ready');
  const cap = bfCeiling(s, ym);
  const when = bf.days > 1 ? t('bf.inDays', { n: bf.days }) : bf.days === 1 ? t('bf.tomorrow') : bf.days === 0 ? t('bf.today') : t('bf.weekend');
  return `<section class="card span-12 bf" aria-labelledby="bf-t">
    ${ico3d('gift', 64, 'bf-art')}
    <div class="bf-main">
      <p class="bf-when">${when}</p>
      <h2 id="bf-t">${t('bf.title')}</h2>
      <p class="muted">${t('bf.sub')}</p>
    </div>
    <dl class="bf-nums">
      <div><dt>${t('bf.cap')}</dt><dd>${money(cap)}</dd></div>
      <div><dt>${t('bf.ready')}</dt><dd>${ready.length}<small> ${t('bf.of', { n: open.length })}</small></dd></div>
    </dl>
    ${link ? `<a class="btn btn-sm" href="#cofres">${icon('i-star')}${t('bf.open')}</a>` : ''}
  </section>`;
}

// The line under each wish: target, latest price written down and what it means.
export function priceLine(w) {
  const v = priceVerdict(w);
  const bits = [];
  if (w.target > 0) bits.push(t('bf.target', { v: money(w.target) }));
  if (v.kind !== 'none') bits.push(t('bf.last', { v: money(v.last) }));
  const badge = v.kind === 'fake' ? `<span class="badge b-bad">${t('bf.fake', { v: money(v.low) })}</span>`
    : v.kind === 'hit' ? `<span class="badge b-good">${t('bf.hit')}</span>`
    : v.kind === 'real' ? `<span class="badge b-good">${t('bf.real', { p: v.pct })}</span>` : '';
  return bits.length || badge ? `<span class="meta bf-line">${bits.join(' · ')} ${badge}</span>` : '';
}

// A wish created during the event was not on the list before it.
export function impulse(w) {
  if (!w.addedAt) return false;
  const bf = blackFriday(new Date(w.addedAt));
  return bf.on;
}
