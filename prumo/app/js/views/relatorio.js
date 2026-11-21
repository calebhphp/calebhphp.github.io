// Month report: the numbers of the month in one page, to check or to keep (print / PDF).
// The retrospective tells the month as a story and shows no amounts; this is the page with amounts.
import { t } from '../i18n.js';
import { spending, monthSummary, vsLastMonth, monthsSpent } from '../finance.js';
import { money, pct, esc, monthLabel, monthIn, ymOf, dayLabel } from '../format.js';
import { head } from './parts.js';
import { icon } from '../ui.js';
import { getPrefs } from '../prefs.js';

const TXT = {
  pt: {
    title: 'Relatório de {m}', sub: 'Os números do mês numa página, pra conferir ou guardar.', subNow: 'O mês ainda está aberto: os números vão até hoje, dia {d}.',
    print: 'Imprimir ou salvar em PDF', csv: 'Baixar os gastos em CSV',
    empty: 'Nenhum gasto lançado em {m}. Lance o primeiro e o relatório aparece aqui.', emptyGo: 'Lançar gasto',
    sum: 'Resumo', in: 'Entrou', out: 'Gastou no dia a dia', outOf: '{p} do teto de {v}', fixed: 'Contas fixas', fixedSub: 'contas, parcelas e assinaturas', free: 'Sobra prevista', freeSub: 'depois de contas, tetos e cofres', n: '{n} lançamentos',
    vs: 'Comparado com {m}', vsNote: '{m} contado até o dia {d}, pra comparar o mesmo trecho do mês.', vsNone: 'Ainda não há gastos em {m} pra comparar.',
    cat: 'Categoria', diff: 'Diferença', total: 'Total', newCat: 'novo', sameCat: 'igual',
    top: 'Maiores gastos', weeks: 'Por semana', week: 'Dias {a} a {b}', months: 'Últimos meses', monthsNote: 'Gasto do dia a dia, mês a mês.', monthsOne: 'Quando houver mais de um mês lançado, a comparação aparece aqui.',
    caps: 'Tetos do mês', tableAria: 'Tabela. Role para o lado se não couber.', state: 'Situação', capOver: 'passou {v}', capLeft: 'sobraram {v}', capLeftNow: 'sobram {v}',
  },
  en: {
    title: '{m} report', sub: 'The month\'s numbers on one page, to check or keep.', subNow: 'The month is still open: numbers go up to today, day {d}.',
    print: 'Print or save as PDF', csv: 'Download entries as CSV',
    empty: 'Nothing logged in {m}. Log the first entry and the report shows up here.', emptyGo: 'Log spending',
    sum: 'Summary', in: 'Income', out: 'Day-to-day spending', outOf: '{p} of the {v} cap', fixed: 'Fixed bills', fixedSub: 'bills, installments and subscriptions', free: 'Expected left over', freeSub: 'after bills, caps and pots', n: '{n} entries',
    vs: 'Compared with {m}', vsNote: '{m} counted up to day {d}, to compare the same stretch of the month.', vsNone: 'No spending in {m} to compare yet.',
    cat: 'Category', diff: 'Difference', total: 'Total', newCat: 'new', sameCat: 'same',
    top: 'Largest entries', weeks: 'By week', week: 'Days {a} to {b}', months: 'Last months', monthsNote: 'Day-to-day spending, month by month.', monthsOne: 'Once more than one month is logged, the comparison shows here.',
    caps: 'Caps this month', tableAria: 'Table. Scroll sideways if it does not fit.', state: 'Status', capOver: '{v} over', capLeft: '{v} left', capLeftNow: '{v} left',
  },
};
const tx = (k, vars = {}) => (TXT[getPrefs().lang === 'en' ? 'en' : 'pt'][k] || k).replace(/\{(\w+)\}/g, (_, n) => vars[n]);

const bars = (rows, max) => `<ul class="rep-bars">${rows.map(r =>
  `<li class="${r.now ? 'is-now' : ''}"><span class="w-l">${esc(r.label)}</span><span class="w-bar"><b style="width:${max ? Math.max(r.v > 0 ? 1 : 0, (r.v / max) * 100).toFixed(1) : 0}%"></b></span><span class="w-v">${money(r.v)}</span></li>`).join('')}</ul>`;

export function render(s, ctx) {
  const ym = ctx.ym;
  const sp = spending(s, ym);
  const mLong = esc(monthIn(ym, { month: 'long', year: 'numeric' }));
  const open = ym === ymOf(new Date());
  const title = tx('title', { m: mLong });
  if (!sp.list.length) {
    return `${head(title, tx('sub'))}<div class="grid"><section class="card span-12"><p class="empty">${tx('empty', { m: esc(monthIn(ym, { month: 'long' })) })}</p>
      <a class="btn btn-primary" href="#gastos">${icon('i-plus')}${tx('emptyGo')}</a></section></div>`;
  }
  const x = monthSummary(s, ym);
  const vs = vsLastMonth(s, ym);
  const pm = esc(monthIn(vs.prev, { month: 'long' }));
  const pmCap = esc(monthLabel(vs.prev, { month: 'long' }));

  // Category table: this month, last month up to the same day, and the difference.
  const cats = [...new Set([...Object.keys(vs.cats.now), ...Object.keys(vs.cats.before)])]
    .map(c => ({ c, a: vs.cats.now[c] || 0, b: vs.cats.before[c] || 0 })).sort((p, q) => q.a - p.a);
  const diffCell = (a, b) => {
    if (!b) return `<td class="n">${a ? tx('newCat') : ''}</td>`;
    const d = a - b;
    if (Math.abs(d) < 0.005) return `<td class="n">${tx('sameCat')}</td>`;
    return `<td class="n ${d > 0 ? 'is-up' : 'is-down'}">${d > 0 ? '+' : '−'}${money(Math.abs(d))} (${pct(Math.abs(d) / b)})</td>`;
  };
  const vsTable = `<div class="table-wrap" tabindex="0" role="group" aria-label="${tx('tableAria')}"><table class="data rep-table rep-vs"><thead><tr><th scope="col">${tx('cat')}</th><th scope="col" class="n">${esc(monthLabel(ym, { month: 'long' }))}</th><th scope="col" class="n">${pmCap}</th><th scope="col" class="n">${tx('diff')}</th></tr></thead>
    <tbody>${cats.map(r => `<tr><th scope="row">${esc(t('cat.' + r.c))}</th><td class="n">${money(r.a)}</td><td class="n">${money(r.b)}</td>${diffCell(r.a, r.b)}</tr>`).join('')}</tbody>
    <tfoot><tr><th scope="row">${tx('total')}</th><td class="n">${money(vs.now)}</td><td class="n">${money(vs.before)}</td>${diffCell(vs.now, vs.before)}</tr></tfoot></table></div>
    ${vs.partial ? `<p class="rep-note">${tx('vsNote', { m: pmCap, d: vs.upto })}</p>` : ''}`;

  const top = [...sp.list].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Weeks as plain stretches of seven days, so they mean the same in every month.
  const weeks = [];
  for (let a = 1; a <= sp.days; a += 7) {
    const b = Math.min(sp.days, a + 6);
    weeks.push({ label: tx('week', { a, b }), v: sp.list.filter(g => +g.date.slice(8) >= a && +g.date.slice(8) <= b).reduce((n, g) => n + g.amount, 0) });
  }
  const months = monthsSpent(s, ym).map(r => ({ label: monthLabel(r.ym, { month: 'short', year: '2-digit' }), v: r.spent, now: r.ym === ym }));

  const caps = sp.cats.filter(c => c.budget > 0 && c.spent > 0);

  return `${head(title, open ? tx('subNow', { d: new Date().getDate() }) : tx('sub'), `<div class="rep-actions"><button type="button" class="btn" data-rep="print">${icon('i-in')}${tx('print')}</button><a class="btn btn-ghost" href="#dados">${tx('csv')}</a></div>`)}
  <div class="grid">
    <section class="card card-hero span-12" aria-labelledby="rp-sum">
      <h2 id="rp-sum" class="sr-only">${tx('sum')}</h2>
      <dl class="rep-nums">
        <div><dt>${tx('in')}</dt><dd>${money(x.income)}</dd></div>
        <div><dt>${tx('out')}</dt><dd>${money(sp.spent)}<small>${sp.budget ? tx('outOf', { p: pct(sp.pace), v: money(sp.budget) }) + '. ' : ''}${tx('n', { n: sp.list.length })}</small></dd></div>
        <div><dt>${tx('fixed')}</dt><dd>${money(x.fixed)}<small>${tx('fixedSub')}</small></dd></div>
        <div><dt>${tx('free')}</dt><dd class="${x.free < 0 ? 'neg' : ''}">${money(x.free)}<small>${tx('freeSub')}</small></dd></div>
      </dl>
    </section>
    <section class="card span-7" aria-labelledby="rp-vs">
      <div class="card-head"><h2 id="rp-vs">${tx('vs', { m: pm })}</h2></div>
      ${vs.has ? vsTable : `<p class="empty">${tx('vsNone', { m: pm })}</p>`}
    </section>
    <section class="card span-5 rep-top" aria-labelledby="rp-top">
      <div class="card-head"><h2 id="rp-top">${tx('top')}</h2></div>
      <ul class="rows">${top.map(g => `<li><span class="grow"><span class="title">${esc(g.desc)}</span><span class="meta">${esc(dayLabel(new Date(g.date + 'T12:00')))} <span class="badge">${t('cat.' + g.cat)}</span></span></span><span class="amt">${money(g.amount)}</span></li>`).join('')}</ul>
    </section>
    <section class="card span-6" aria-labelledby="rp-wk">
      <div class="card-head"><h2 id="rp-wk">${tx('weeks')}</h2></div>
      ${bars(weeks, Math.max(...weeks.map(w => w.v)))}
    </section>
    <section class="card span-6" aria-labelledby="rp-mo">
      <div class="card-head"><h2 id="rp-mo">${tx('months')}</h2></div>
      ${months.length > 1 ? `${bars(months, Math.max(...months.map(m => m.v)))}<p class="rep-note">${tx('monthsNote')}</p>` : `<p class="empty">${tx('monthsOne')}</p>`}
    </section>
    ${caps.length ? `<section class="card span-12" aria-labelledby="rp-cp">
      <div class="card-head"><h2 id="rp-cp">${tx('caps')}</h2></div>
      <div class="table-wrap" tabindex="0" role="group" aria-label="${tx('tableAria')}"><table class="data rep-table"><thead><tr><th scope="col">${tx('cat')}</th><th scope="col" class="n">${tx('out')}</th><th scope="col" class="n">${t('budget.label')}</th><th scope="col" class="n">${tx('state')}</th></tr></thead>
      <tbody>${caps.map(c => `<tr><th scope="row">${esc(t('cat.' + c.cat))}</th><td class="n">${money(c.spent)}</td><td class="n">${money(c.budget)}</td><td class="n ${c.left < 0 ? 'is-up' : ''}">${c.left < 0 ? tx('capOver', { v: money(-c.left) }) : tx(open ? 'capLeftNow' : 'capLeft', { v: money(c.left) })}</td></tr>`).join('')}</tbody></table></div>
    </section>` : ''}
  </div>`;
}

export function mount(root) {
  root.querySelector('[data-rep="print"]')?.addEventListener('click', () => window.print());
}
