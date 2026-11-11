import { t } from '../i18n.js';
import { totalBalance } from '../finance.js';
import { money, moneyHtml, esc, pct } from '../format.js';
import { head } from './parts.js';
import { icon } from '../ui.js';

export function render(s) {
  const total = totalBalance(s);
  const pj = s.accounts.filter(a => a.kind === 'pj').reduce((a, b) => a + b.balance, 0);
  const pf = total - pj;
  const hasPj = s.accounts.some(a => a.kind === 'pj');
  return `${head(t('nav.bancos'), t('bank.sub'),
    hasPj ? `<button class="btn btn-primary" data-action="prolabore">${icon('i-swap')}${t('bank.transfer')}</button>` : '')}
  <div class="grid">
    <section class="card card-hero span-12" aria-labelledby="tot-t">
      <p class="hero-label" id="tot-t">${t('bank.total')}</p>
      ${moneyHtml(total, 'money-xl')}
      ${hasPj ? `<div class="flow"><div class="flow-bar" role="img" aria-label="${esc(t('bank.splitAria', { pf: money(pf), pj: money(pj) }))}">
        <span style="flex:${pf};background:var(--s1)"></span><span style="flex:${pj};background:var(--s3)"></span></div>
        <ul class="flow-legend"><li><span class="k"><i class="sw" style="background:var(--s1)"></i>${t('bank.pf')}</span><span class="v">${money(pf)}<span class="pct">${pct(pf / total)}</span></span></li>
        <li><span class="k"><i class="sw" style="background:var(--s3)"></i>${t('bank.pj')}</span><span class="v">${money(pj)}<span class="pct">${pct(pj / total)}</span></span></li></ul></div>` : ''}
    </section>
    ${s.accounts.map(a => `<section class="card span-4" aria-labelledby="acc-${a.id}">
      <div class="card-head"><h2 id="acc-${a.id}">${esc(a.name)}</h2><span class="badge ${a.kind === 'pj' ? 'b-pj' : ''}">${a.kind === 'pj' ? t('bank.pjBadge') : t('bank.pfBadge')}</span></div>
      ${moneyHtml(a.balance, 'money-l')}
      <p class="card-sub" style="margin:10px 0 0">${a.kind === 'pj' ? t('bank.pjHint') : t('bank.pfHint')}</p></section>`).join('')}
    ${hasPj ? `<div class="alert alert-warn span-12">${icon('i-swap')}<div><h2>${t('bank.ruleTitle')}</h2><p>${t('bank.ruleBody')}</p></div></div>` : ''}
  </div>`;
}
