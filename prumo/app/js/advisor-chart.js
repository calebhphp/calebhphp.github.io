// Picks a chart for the advisor's answer from the question itself, built only from the
// person's own numbers (the model never invents chart data), and draws it as HTML.
import { t } from './i18n.js';
import { spending, cardStatus, subsReview, brl } from './finance.js';
import { WORDS } from './quick.js';
import { money, moneyShort, esc, monthLabel, monthIn, addMonths, ymOf } from './format.js';
import { dailyChart } from './views/parts.js';

const has = (q, re) => re.test(q);
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

// Category named in a question, by whole word or by its label ("comer fora").
function catIn(q) {
  const words = q.split(/[^\p{L}\d]+/u);
  for (const c of Object.keys(WORDS)) if (q.includes(t('cat.' + c).toLowerCase()) || WORDS[c].some(w => (w.includes(' ') ? q.includes(w) : words.includes(w)))) return c;
  return null;
}

export function pickChart(q, s, ym) {
  q = q.toLowerCase();
  const cat = catIn(q);
  const catOk = !!cat && s.budgets[cat] !== undefined;
  if (has(q, /fatura|parcela|cart[aã]o|installment|card/)) return cardChart(s, ym);
  if (has(q, /semana|week/)) return weekChart(s, ym, catOk ? cat : null);
  if (has(q, /m[eê]s passado|meses|compar|evolu|months|last month/)) return monthsChart(s, ym, catOk ? cat : null);
  if (has(q, /cofre|reserva|meta|guardar|guardado|pots?|savings|goal/)) return goalsChart(s);
  if (has(q, /assinatura|subscription|cortar|cut/)) return subsChart(s);
  if (has(q, /categoria|onde|demais|exager|pra onde|where|too much/)) return catsChart(s, ym);
  if (has(q, /por dia|dia a dia|ritmo|daily|pace|track/)) return { kind: 'daily', title: t('chart.c.daily'), ym };
  return null;
}

function weekChart(s, ym, cat) {
  const sp = spending(s, ym);
  const list = sp.list.filter(x => !cat || x.cat === cat);
  const weeks = [];
  for (let a = 1; a <= sp.days; a += 7) {
    const b = Math.min(sp.days, a + 6);
    const v = sum(list.filter(x => +x.date.slice(8) >= a && +x.date.slice(8) <= b), x => x.amount);
    weeks.push({ label: t('chart.c.wk', { n: weeks.length + 1 }), tip: t('chart.c.wkDays', { a, b }), v, a });
  }
  const today = ym === ymOf(new Date()) ? new Date().getDate() : sp.days + 1;
  const cur = weeks.findIndex(w => today >= w.a && today <= w.a + 6);
  const done = weeks.filter((w, i) => w.a + 6 < today && i !== cur && w.v > 0);
  const budget = cat ? s.budgets[cat] : sp.budget;
  weeks.forEach((w, i) => { w.hl = i === cur; w.future = w.a > today; });
  const catName = cat ? t('cat.' + cat) : t('chart.c.all');
  return {
    kind: 'bars', title: t('chart.c.week', { cat: catName, m: monthIn(ym, { month: 'long' }) }), items: weeks, ref: budget * 7 / sp.days,
    refLabel: t('chart.c.weekRef', { v: money(budget * 7 / sp.days) }),
    text: { key: 'local.week', vars: { cat: catName.toLowerCase(), v: money(cur >= 0 ? weeks[cur].v : 0), avg: money(done.length ? sum(done, w => w.v) / done.length : 0) } },
  };
}

function monthsChart(s, ym, cat) {
  const first = s.tx.reduce((m, x) => (x.date.slice(0, 7) < m ? x.date.slice(0, 7) : m), ym);
  const items = [];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(ym, -i);
    if (m < first) continue;
    const v = sum(s.tx.filter(x => x.date.startsWith(m) && (!cat || x.cat === cat)), x => x.amount);
    items.push({ label: monthLabel(m, { month: 'short' }), tip: monthLabel(m), v, hl: m === ym });
  }
  const prev = items.length > 1 ? items[items.length - 2] : null;
  return {
    kind: 'bars', title: t('chart.c.months', { cat: cat ? t('cat.' + cat) : t('chart.c.all') }), items,
    text: prev ? { key: 'local.months', vars: { m: prev.tip, v: money(prev.v), cur: money(items[items.length - 1].v) } } : null,
  };
}

function cardChart(s, ym) {
  const c = cardStatus(s, ym);
  if (!c) return null;
  const items = [{ label: monthLabel(ym, { month: 'short' }), tip: monthLabel(ym), v: c.inv.total, hl: true },
    ...c.ahead.map(a => ({ label: monthLabel(a.ym, { month: 'short' }), tip: monthLabel(a.ym), v: a.v }))];
  return {
    kind: 'bars', title: t('chart.c.card'), items,
    text: { key: 'local.card', vars: { m: monthIn(ym, { month: 'long' }), v: money(c.inv.total), next: money(c.ahead[0].v), free: money(c.free) } },
  };
}

function catsChart(s, ym) {
  const items = spending(s, ym).cats.filter(c => c.spent > 0 || c.budget > 0).slice(0, 6)
    .map(c => ({ label: t('cat.' + c.cat), v: c.spent, ref: c.budget, over: c.spent > c.budget }));
  return { kind: 'hbars', title: t('chart.c.cats'), items };
}

function subsChart(s) {
  const items = s.subs.filter(x => !x.cancelled).map(x => ({ label: x.name, v: brl(s, x), note: x.used === null ? t('chart.c.unreviewed') : '' }))
    .sort((a, b) => b.v - a.v).slice(0, 6);
  return { kind: 'hbars', title: t('chart.c.subs', { v: money(subsReview(s).total) }), items };
}

function goalsChart(s) {
  const items = s.goals.map(g => ({ label: g.name, v: g.saved, ref: g.target }));
  const r = s.goals.find(g => g.kind === 'reserva');
  return { kind: 'hbars', title: t('chart.c.goals'), items, fullRef: true,
    text: { key: 'local.goals', vars: { v: money(sum(s.goals, g => g.saved)), goal: money(sum(s.goals, g => g.target)), p: r ? Math.round(r.saved / r.target * 100) + '%' : '0%' } } };
}

// Answer text for the local (no AI) mode, when the chart has a better one than the default.
export const chartText = spec => (spec && spec.text ? spec.text : null);

// One sentence the model gets, so its answer talks about the chart shown under it.
export function chartBrief(spec) {
  if (!spec) return '';
  if (spec.kind === 'daily') return `Abaixo da sua resposta o app mostra o gráfico "${spec.title}".`;
  return `Abaixo da sua resposta o app mostra o gráfico "${spec.title}" com estes valores: ${spec.items.map(i => `${i.tip || i.label}: ${Math.round(i.v)}${i.ref ? ` de ${Math.round(i.ref)}` : ''}`).join('; ')}. Comente o que ele mostra, sem repetir todos os números.`;
}

export function chartHtml(spec, s) {
  if (!spec) return '';
  const head = `<p class="ac-title">${esc(spec.title)}</p>`;
  if (spec.kind === 'daily') return `<figure class="ac">${head}${dailyChart(s, spec.ym)}</figure>`;
  const table = `<table class="sr-only"><caption>${esc(spec.title)}</caption><tbody>${spec.items.map(i =>
    `<tr><th scope="row">${esc(i.tip || i.label)}</th><td>${money(i.v)}${i.ref ? ' / ' + money(i.ref) : ''}</td></tr>`).join('')}</tbody></table>`;
  if (spec.kind === 'hbars') {
    const max = Math.max(1, ...spec.items.map(i => Math.max(i.v, i.ref || 0)));
    return `<figure class="ac">${head}<ul class="ac-h" aria-hidden="true">${spec.items.map(i => {
      const tip = `${i.label}: ${money(i.v)}${i.ref ? ' ' + t('chart.c.of', { r: money(i.ref) }) : ''}${i.note ? ' · ' + i.note : ''}`;
      return `<li title="${esc(tip)}"><span class="ac-l">${esc(i.label)}</span>
        <span class="ac-track">${i.ref && !spec.fullRef ? `<i class="ac-ref" style="left:${(i.ref / max) * 100}%"></i>` : ''}<b class="${i.over ? 'ac-over' : ''}" style="width:${Math.max(1.5, (i.v / max) * 100)}%"></b></span>
        <span class="ac-v">${moneyShort(Math.round(i.v))}${i.ref ? `<small> / ${moneyShort(Math.round(i.ref))}</small>` : ''}${i.over ? `<small class="ac-flag"> ${t('chart.c.over')}</small>` : ''}</span></li>`;
    }).join('')}</ul>${table}</figure>`;
  }
  const max = Math.max(1, spec.ref || 0, ...spec.items.map(i => i.v));
  const ref = spec.ref ? ` style="--r:${(spec.ref / max) * 100}%"` : '';
  return `<figure class="ac">${head}<div class="ac-b${spec.ref ? ' has-ref' : ''}" aria-hidden="true">
      ${spec.items.map(i => `<span class="ac-col${i.hl ? ' is-hl' : ''}${i.future ? ' is-future' : ''}" title="${esc(`${i.tip || i.label}: ${money(i.v)}`)}">
        <em>${i.v && (i.hl || spec.items.length <= 4) ? moneyShort(Math.round(i.v)) : ''}</em><span class="ac-plot"${ref}><b style="height:${Math.max(i.v ? 3 : 1, (i.v / max) * 100)}%"></b></span><span class="ac-lab">${esc(i.label)}</span></span>`).join('')}
    </div>${spec.refLabel ? `<p class="ac-legend"><i class="ac-sw"></i>${esc(spec.refLabel)}</p>` : ''}${table}</figure>`;
}
