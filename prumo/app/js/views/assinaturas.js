import { t } from '../i18n.js';
import { subsReview } from '../finance.js';
import { money, moneyHtml } from '../format.js';
import { head, subRow } from './parts.js';
import { icon } from '../ui.js';

export function render(s) {
  const r = subsReview(s);
  return `${head(t('nav.assinaturas'), t('sub.pageSub'), `<button class="btn btn-primary" data-action="add">${icon('i-plus')}${t('add.sub')}</button>`)}
  <div class="grid">
    <section class="card card-hero span-4" aria-labelledby="st-t">
      <p class="hero-label" id="st-t">${t('sub.perMonthTitle')}</p>
      ${moneyHtml(r.total, 'money-xl')}
      <p class="card-sub" style="margin:12px 0 0">${t('sub.perYear', { v: money(r.total * 12) })}</p>
      ${r.unused ? `<p class="badge b-warn" style="margin-top:12px">${t('sub.unusedCost', { v: money(r.unused * 12) })}</p>` : ''}
      ${r.saved ? `<p class="badge b-good" style="margin-top:12px">${t('sub.savedYear', { v: money(r.saved * 12) })}</p>` : ''}
    </section>
    <section class="card span-8" aria-labelledby="sl-t">
      <div class="card-head"><h2 id="sl-t">${t('sub.question')}</h2></div>
      <ul class="rows">${s.subs.map(subRow).join('')}</ul>
    </section>
  </div>`;
}
