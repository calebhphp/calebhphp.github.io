import { t } from '../i18n.js';
import { projection, incomeDrop, monthSummary } from '../finance.js';
import { projectionChart, bindChart, tableFor } from '../chart.js';
import { money, moneyHtml, esc, ymOf, moneyIn } from '../format.js';
import { head, runwayText } from './parts.js';
import { icon } from '../ui.js';

export function render(s, ctx) {
  const x = monthSummary(s, ctx.ym);
  const rows = projection(s, ctx.ym);
  const drop = incomeDrop(s, ctx.ym);
  const showTable = ctx.tables.has('proj');
  const fmt = d => new Intl.DateTimeFormat(document.documentElement.lang, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d + 'T12:00'));
  return `${head(t('nav.entradas'), t('inc.sub'), `<button class="btn btn-primary" data-action="add">${icon('i-plus')}${t('add.income')}</button>`)}
  <div class="grid">
    <section class="card card-hero span-5" aria-labelledby="inc-t">
      <p class="hero-label" id="inc-t">${t('inc.month')}</p>
      ${moneyHtml(x.income, 'money-xl')}
      <ul class="rows" style="margin-top:18px">${s.incomes.map(i => `<li>
        <span class="grow"><span class="title">${esc(i.name)}</span>
        <span class="meta"><span class="badge ${i.kind === 'pj' ? 'b-pj' : ''}">${i.kind === 'pj' ? 'PJ' : 'CLT'}</span> ${t('inc.day', { d: i.day })}${i.endsOn ? ` · <span class="badge b-warn">${t('inc.ends', { d: fmt(i.endsOn) })}</span>` : ''}</span></span>
        <span class="amt">${moneyIn(i.amount, i.cur, (s.fx || {})[i.cur])}</span></li>`).join('')}</ul>
    </section>
    <section class="card span-7" aria-labelledby="proj-t">
      <div class="card-head"><h2 id="proj-t">${t('chart.projTitle')}</h2>
        <button class="btn btn-sm" data-action="table" data-k="proj" aria-pressed="${showTable}">${t(showTable ? 'chart.showChart' : 'chart.showTable')}</button></div>
      ${showTable ? tableFor(rows) : projectionChart(rows, ymOf(new Date()))}
    </section>
    ${drop ? `<div class="alert alert-warn span-12">${icon('i-alert')}<div><h2>${t('inc.planTitle')}</h2>
      <p>${t('inc.planBody', { gap: money(drop.from - drop.to) })} <strong>${runwayText(s, ctx.ym)}</strong></p></div>
      <a class="btn btn-sm" href="#cofres">${t('inc.planCta')}</a></div>` : ''}
  </div>`;
}

export function mount(root, s, ctx) { bindChart(root, projection(s, ctx.ym)); }
