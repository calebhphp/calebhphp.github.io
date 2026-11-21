import { t } from '../i18n.js';
// The home screen's own shape. The number the product promises ("how much can I still spend today")
// comes first and biggest, with the sentence box right under it and the plumb line beside it.
// Everything else is grouped in sections: the month so far, what is coming, goals.
import { spending, monthSummary, vsLastMonth } from '../finance.js';
import { money, moneyHtml, pct, esc, isoDay, ymOf, monthLabel, monthIn } from '../format.js';
import { icon, ico3d, toast } from '../ui.js';
import { getPrefs } from '../prefs.js';

const TXT = {
  pt: {
    ask: 'O que você gastou hoje?', ph: 'almoço 32, uber 18, mercado 120 no débito', go: 'Lançar',
    more: 'Falar ou importar extrato',
    today: 'Hoje', none: 'Nada lançado hoje ainda.',
    left: 'Ainda dá pra gastar hoje', over: 'Hoje passou do teto em', cap: 'Teto de {v} por dia. Faltam {d} dias.', capLast: 'Teto de {v} hoje. É o último dia do mês.',
    past: 'Gasto no dia a dia em {m}', pastCap: 'Teto do mês: {v}.',
    plumbOk: 'no prumo', plumbFast: 'gasto {p} à frente do mês', plumbSlow: 'folga de {p}',
    plumbAria: 'Prumo do mês: {t}',
    month: 'O mês, dia por dia', free: 'Sobra prevista', day: 'Dia {d}: {v}. Ver os gastos do dia', dayNone: 'Dia {d}: nada lançado',
    where: 'Pra onde vai o que entra', income: 'Entra', fixed: 'Contas fixas', variable: 'Dia a dia', goals: 'Cofres', das: 'DAS do MEI', rest: 'Sobra',
    legendOk: 'dentro do teto', legendOver: 'passou do teto', legendToday: 'hoje',
  },
  en: {
    ask: 'What did you spend today?', ph: 'lunch 32, uber 18, groceries 120 debit', go: 'Log',
    more: 'Speak or import a statement',
    today: 'Today', none: 'Nothing logged today yet.',
    left: 'Still free to spend today', over: 'Over today\'s cap by', cap: 'Cap of {v} a day. {d} days to go.', capLast: 'Cap of {v} today. Last day of the month.',
    past: 'Day-to-day spending in {m}', pastCap: 'Month cap: {v}.',
    plumbOk: 'plumb', plumbFast: 'spending {p} ahead of the month', plumbSlow: '{p} of slack',
    plumbAria: 'Month plumb line: {t}',
    month: 'The month, day by day', free: 'Expected left over', day: 'Day {d}: {v}. See that day', dayNone: 'Day {d}: nothing logged',
    where: 'Where the income goes', income: 'Income', fixed: 'Fixed bills', variable: 'Day-to-day', goals: 'Pots', das: 'MEI tax', rest: 'Left over',
    legendOk: 'under the cap', legendOver: 'over the cap', legendToday: 'today',
  },
};
const tx = (k, vars) => {
  const d = TXT[getPrefs().lang === 'en' ? 'en' : 'pt'];
  return (d[k] || k).replace(/\{(\w+)\}/g, (_, n) => vars[n]);
};

// A plumb bob hanging from a nail. It swings to the right when spending runs ahead of the
// calendar and to the left when there is slack; straight down means on plan.
function plumb(dev) {
  const angle = Math.max(-26, Math.min(26, dev * 110));
  const state = Math.abs(dev) < 0.04 ? 'ok' : dev > 0 ? 'fast' : 'slow';
  const label = state === 'ok' ? tx('plumbOk') : tx(state === 'fast' ? 'plumbFast' : 'plumbSlow', { p: pct(Math.abs(dev)) });
  return `<figure class="plumb plumb-${dev > 0.1 ? 'bad' : state}" role="img" aria-label="${esc(tx('plumbAria', { t: label }))}">
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <line x1="60" y1="6" x2="60" y2="146" class="pl-true"/>
      <path d="M22 132a62 62 0 0 0 76 0" class="pl-arc"/>
      <circle cx="60" cy="8" r="3.5" class="pl-nail"/>
      <g transform="rotate(${-angle} 60 8)" class="pl-swing">
        <line x1="60" y1="8" x2="60" y2="96" class="pl-string"/>
        <rect x="52" y="94" width="16" height="6" rx="3" class="pl-bob"/>
        <path d="M50 102h20c1.600 0 2.600 1.600 1.900 3L62.400 128c-.900 2.100-3.900 2.100-4.800 0L48.100 105c-.700-1.400.300-3 1.900-3z" class="pl-bob"/>
      </g>
    </svg>
    <figcaption>${esc(label)}</figcaption>
  </figure>`;
}

// What is left for today: the daily cap (what remains of the month, split over the days left) minus today's spending.
function todayLeft(s, ym) {
  const sp = spending(s, ym);
  const now = new Date();
  const current = ymOf(now) === ym;
  const mine = current ? s.tx.filter(x => x.date === isoDay(now)) : [];
  const spentToday = mine.reduce((a, x) => a + x.amount, 0);
  // Same split the rest of the app uses (days left in the month); the last day counts as one.
  const daysIn = current ? Math.max(1, sp.daysLeft) : 0;
  const cap = daysIn ? (sp.budget - sp.spent + spentToday) / daysIn : 0;
  return { sp, current, mine, cap, left: cap - spentToday, daysIn };
}

// The first thing on the screen: the number, the plumb, and the box to log a sentence.
export function todayHero(s, ym) {
  const { sp, current, mine, cap, left, daysIn } = todayLeft(s, ym);
  const num = !sp.budget
    ? `<div class="hn-empty"><p><strong>${t('home.noCap')}</strong><br>${t('home.noCapHint')}</p><a class="btn btn-sm" href="#gastos">${t('home.noCapGo')}</a></div>`
    : current
      ? `<div class="hn-fig"><p class="hn-label">${tx(left < 0 ? 'over' : 'left')}</p>
          <p class="hn-num ${left < 0 ? 'neg' : ''}">${moneyHtml(Math.abs(left), 'money-xl')}</p>
          <p class="hn-cap">${tx(sp.daysLeft > 0 ? 'cap' : 'capLast', { v: money(Math.max(0, cap)), d: sp.daysLeft })}</p></div>
        ${plumb(sp.pace - sp.elapsed)}`
      : `<div class="hn-fig"><p class="hn-label">${tx('past', { m: esc(monthIn(ym, { month: 'long' })) })}</p>
          <p class="hn-num">${moneyHtml(sp.spent, 'money-xl')}</p>
          <p class="hn-cap">${tx('pastCap', { v: money(sp.budget) })}</p></div>`;
  return `<section class="card card-hero hn" aria-label="${esc(tx('today'))}">
    <div class="hn-top">${num}</div>
    <form class="hq today-form" id="home-quick">
      <label for="hq-in">${tx('ask')}</label>
      <input id="hq-in" autocomplete="off" enterkeyhint="send" placeholder="${esc(tx('ph'))}">
      <button class="btn btn-primary" type="submit">${icon('i-send')}<span>${tx('go')}</span></button>
    </form>
    <div class="today-list">
      <span class="today-tag">${tx('today')}</span>
      ${mine.length ? mine.slice(-5).reverse().map(x => `<span class="today-chip">${esc(x.desc)} <b>${money(x.amount)}</b></span>`).join('') : `<span class="muted small">${tx('none')}</span>`}
      <a class="link today-more" href="#gastos">${tx('more')}</a>
    </div>
  </section>`;
}

export function monthCard(s, ym, span = 'span-8') {
  const sp = spending(s, ym);
  const x = monthSummary(s, ym);
  const per = Array.from({ length: sp.days }, () => 0);
  for (const g of sp.list) per[+g.date.slice(8) - 1] += g.amount;
  const cap = sp.budget / sp.days;
  const today = Math.round(sp.elapsed * sp.days);
  const cells = per.map((v, i) => {
    const d = i + 1;
    const cls = (d > today ? 'is-next' : v > cap ? 'is-over' : v > 0 ? 'is-ok' : 'is-zero') + (d === today ? ' is-today' : '');
    const a = `style="--a:${Math.min(1, 0.35 + (v / (cap || 1)) * 0.65).toFixed(2)}"`;
    // A day with spending opens its entries; an empty or future day is only a mark.
    return v > 0
      ? `<a class="${cls}" ${a} href="#gastos?dia=${ym}-${String(d).padStart(2, '0')}" title="${esc(tx('day', { d, v: money(v) }))}"><span class="sr-only">${esc(tx('day', { d, v: money(v) }))}</span></a>`
      : `<i class="${cls}" ${a} title="${esc(tx('dayNone', { d }))}"></i>`;
  }).join('');
  const inc = x.income || 1;
  const rows = [
    ['fixed', x.fixed, 'var(--s1)'], ['variable', x.variable, 'var(--s2)'], ['goals', x.goals, 'var(--s3)'], ['das', x.das, 'var(--s4)'],
  ].filter(r => r[1] > 0);
  return `<section class="card ${span} month-card" aria-labelledby="mc-t">
    <div class="card-head"><h2 id="mc-t">${tx('month')}</h2>
      <span class="mc-free">${tx('free')} <strong class="${x.free < 0 ? 'neg' : 'pos'}">${money(x.free)}</strong></span></div>
    <div class="mdays" style="--n:${sp.days}">${cells}</div>
    <p class="days-legend"><span><i class="is-ok"></i>${tx('legendOk')}</span><span><i class="is-over"></i>${tx('legendOver')}</span><span><i class="is-today"></i>${tx('legendToday')}</span><span class="grow"></span><span>${esc(monthLabel(ym, { month: 'long' }))}</span></p>
    <h3 class="mc-sub">${tx('where')} <span class="muted">${tx('income')} ${money(x.income)}</span></h3>
    <ul class="where">${rows.map(([k, v, c]) => `<li><span class="w-l">${tx(k)}</span><span class="w-bar"><b style="width:${Math.max(1, (v / inc) * 100)}%;background:${c}"></b></span><span class="w-v">${money(v)} <small>${pct(v / inc)}</small></span></li>`).join('')}
      <li class="w-rest"><span class="w-l">${tx('rest')}</span><span class="w-bar"><b style="width:${Math.max(0, (x.free / inc) * 100)}%"></b></span><span class="w-v">${money(x.free)} <small>${pct(Math.max(0, x.free) / inc)}</small></span></li></ul>
  </section>`;
}

const TXT2 = {
  pt: {
    fc: 'Fechamento previsto', fcSub: 'sobra prevista no fim do mês', fcOk: 'No ritmo de hoje você usa {p} do teto de gastos do mês. Tá tranquilo.', fcWarn: 'No ritmo de hoje você passa {v} do teto de gastos. Dá pra corrigir.', fcBad: 'Você já passou do teto de gastos do mês em {v}.', fcBar: 'do teto usado',
    ring: 'Pra onde foi', total: 'gasto', others: 'Outros', seeCat: '{c}: {v}, {p} do gasto. Ver os gastos',
    vsSame: 'Até o dia {d}, {a}. Em {m}, até o mesmo dia, {b}.', vsFull: '{a} no mês. Em {m}, {b}.', vsNone: '{a} até aqui. Ainda não há mês anterior pra comparar.',
    up: '{p} a mais que em {m}', down: '{p} a menos que em {m}', same: 'igual a {m}', fresh: 'sem gasto em {m}',
    caps: 'Tetos por categoria', capsGo: 'Ajustar tetos', capsSub: 'O traço marca onde o mês está hoje.',
    capOver: 'Passou {v} do teto', capNear: 'Perto do teto. Sobram {v}', capFast: 'À frente do mês. Sobram {v}', capOk: 'Sobram {v}', capOf: '{a} de {b}',
    capsMore: 'Mais {n} categorias dentro do teto.', capsNone: 'Nenhum teto definido ainda.',
    nudgeOver: '{c} passou do teto: {a} de {b}.', nudgeNear: '{c} chegou a {p} do teto. Sobram {v} até o fim do mês.',
    okT: 'Você está no ritmo', okS: '{v} abaixo do ritmo do mês.', fastT: 'Gasto à frente do mês', fastS: '{v} acima do ritmo do mês.', lineA: 'Seu gasto no mês', lineB: 'Ritmo ideal',
    secMonth: 'O mês até aqui', secNext: 'O que vem pela frente', secGoals: 'Objetivos', report: 'Abrir o relatório do mês',
    inst: 'Ponha o Prumo na tela inicial', instSub: 'Abre como app, sem loja, e funciona sem internet.', instGo: 'Instalar', instNo: 'Agora não',
  },
  en: {
    fc: 'Expected month end', fcSub: 'expected left over at month end', fcOk: 'At today\'s pace you use {p} of the month\'s spending cap. All good.', fcWarn: 'At today\'s pace you go {v} over the spending cap. Fixable.', fcBad: 'You are already {v} over the month\'s spending cap.', fcBar: 'of the cap used',
    ring: 'Where it went', total: 'spent', others: 'Other', seeCat: '{c}: {v}, {p} of spending. See entries',
    vsSame: 'Up to day {d}, {a}. In {m}, up to the same day, {b}.', vsFull: '{a} this month. In {m}, {b}.', vsNone: '{a} so far. No earlier month to compare yet.',
    up: '{p} more than {m}', down: '{p} less than {m}', same: 'same as {m}', fresh: 'nothing in {m}',
    caps: 'Caps by category', capsGo: 'Adjust caps', capsSub: 'The tick marks where the month is today.',
    capOver: '{v} over the cap', capNear: 'Close to the cap. {v} left', capFast: 'Ahead of the month. {v} left', capOk: '{v} left', capOf: '{a} of {b}',
    capsMore: '{n} more categories under the cap.', capsNone: 'No caps set yet.',
    nudgeOver: '{c} went over the cap: {a} of {b}.', nudgeNear: '{c} reached {p} of the cap. {v} left until month end.',
    okT: 'You are on pace', okS: '{v} under the month\'s pace.', fastT: 'Spending ahead of the month', fastS: '{v} over the month\'s pace.', lineA: 'Your spending', lineB: 'Ideal pace',
    secMonth: 'The month so far', secNext: 'What is coming', secGoals: 'Goals', report: 'Open the month report',
    inst: 'Put Prumo on your home screen', instSub: 'Opens like an app, no store, and works offline.', instGo: 'Install', instNo: 'Not now',
  },
};
export const t2 = (k, vars = {}) => (TXT2[getPrefs().lang === 'en' ? 'en' : 'pt'][k] || k).replace(/\{(\w+)\}/g, (_, n) => vars[n]);
const RING = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--brass)'];

// A plain title between groups of cards, so the home reads as a few sections instead of one long pile.
export const sec = (key, link = '') => `<div class="h-sec span-12"><h2>${t2(key)}</h2>${link}</div>`;

// Where the money went: the ring, and each category with its value, share and change against last month.
// Every row opens the entries of that category.
export function catCard(s, ym, span = 'span-7') {
  const sp = spending(s, ym);
  const by = {};
  for (const g of sp.list) by[g.cat] = (by[g.cat] || 0) + g.amount;
  const sorted = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((a, r) => a + r[1], 0);
  if (!total) return '';
  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4).reduce((a, r) => a + r[1], 0);
  if (rest > 0) top.push(['__o', rest]);
  const R = 42, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = top.map(([c, v], i) => {
    const len = (v / total) * C;
    const seg = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${RING[i]}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 1.5).toFixed(2)} ${(C - Math.max(0, len - 1.5)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
    off += len;
    return seg;
  }).join('');
  const vs = vsLastMonth(s, ym);
  const pm = esc(monthIn(vs.prev, { month: 'long' }));
  const delta = (c, v) => {
    if (!vs.has || c === '__o') return '';
    const b = vs.cats.before[c] || 0;
    if (!b) return `<small class="cr-d">${t2('fresh', { m: pm })}</small>`;
    const d = (v - b) / b;
    if (Math.abs(d) < 0.005) return `<small class="cr-d">${t2('same', { m: pm })}</small>`;
    return `<small class="cr-d ${d > 0 ? 'is-up' : 'is-down'}">${icon(d > 0 ? 'i-up' : 'i-down')}${t2(d > 0 ? 'up' : 'down', { p: pct(Math.abs(d)), m: pm })}</small>`;
  };
  const rows = top.map(([c, v], i) => {
    const name = esc(c === '__o' ? t2('others') : t('cat.' + c));
    const inner = `<i style="background:${RING[i]}"></i><span class="cr-n">${name}${delta(c, v)}</span><b class="cr-v">${money(v)}</b><span class="cr-p">${pct(v / total)}</span>`;
    return c === '__o' ? `<li><span class="cr-row">${inner}</span></li>`
      : `<li><a class="cr-row" href="#gastos?cat=${c}" aria-label="${esc(t2('seeCat', { c: name, v: money(v), p: pct(v / total) }))}">${inner}${icon('i-right')}</a></li>`;
  }).join('');
  const sub = !vs.has ? t2('vsNone', { a: money(total) })
    : t2(vs.partial ? 'vsSame' : 'vsFull', { d: vs.upto, a: money(vs.now), m: pm, b: money(vs.before) });
  return `<section class="card ${span} cat-card" aria-labelledby="rg-t">
    <div class="card-head"><h2 id="rg-t">${t2('ring')}</h2></div>
    <p class="card-sub">${sub}</p>
    <div class="cat-body">
      <div class="cat-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--track)" stroke-width="16"/>${arcs}</svg>
        <div class="ring-mid"><b>${money(total)}</b><small>${t2('total')}</small></div></div>
      <ul class="cat-rows">${rows}</ul>
    </div>
  </section>`;
}

// State of one category cap: over, close to it (80% or more), ahead of the calendar, or fine.
export function capState(c) {
  if (c.used > 1) return { k: 'bad', txt: t2('capOver', { v: money(-c.left) }), ic: 'i-alert' };
  if (c.used >= 0.8) return { k: 'warn', txt: t2('capNear', { v: money(c.left) }), ic: 'i-alert' };
  if (c.level === 'warn') return { k: 'warn', txt: t2('capFast', { v: money(c.left) }), ic: 'i-alert' };
  return { k: 'good', txt: t2('capOk', { v: money(c.left) }), ic: 'i-check' };
}

// Caps by category on the home: the ones that need attention first, each with a bar in its state colour.
export function budgetCard(s, ym, span = 'span-5') {
  const sp = spending(s, ym);
  const all = sp.cats.filter(c => c.budget > 0);
  const mark = Math.round(sp.elapsed * 100);
  const shown = all.filter(c => c.spent > 0).slice(0, 5);
  const more = all.length - shown.length;
  return `<section class="card ${span} caps-card" aria-labelledby="cp-t">
    <div class="card-head"><h2 id="cp-t">${t2('caps')}</h2><a class="link" href="#gastos">${t2('capsGo')}</a></div>
    ${shown.length ? `<p class="card-sub">${t2('capsSub')}</p><ul class="caps">${shown.map(c => {
      const st = capState(c);
      return `<li class="is-${st.k}"><a href="#gastos?cat=${c.cat}">
        <span class="cp-top"><span class="cp-n">${esc(t('cat.' + c.cat))}</span><span class="cp-v">${t2('capOf', { a: money(c.spent), b: money(c.budget) })}</span></span>
        <span class="meter thin ${st.k}"><i style="width:${Math.min(100, c.used * 100).toFixed(1)}%"></i><span class="mark" style="left:${mark}%"></span></span>
        <span class="cp-s">${icon(st.ic)}${st.txt}</span></a></li>`;
    }).join('')}</ul>${more > 0 ? `<p class="caps-more">${t2('capsMore', { n: more })}</p>` : ''}`
      : `<p class="empty">${t2('capsNone')}</p>`}
  </section>`;
}

// Said once, right after an entry pushes a category past 80% or past its cap.
export function capNudge(hit) {
  if (!hit) return;
  const c = t('cat.' + hit.cat);
  setTimeout(() => toast(hit.over ? t2('nudgeOver', { c, a: money(hit.spent), b: money(hit.budget) })
    : t2('nudgeNear', { c, p: pct(hit.used), v: money(hit.left) })), 900);
}

export function trackCard(s, ym, span = 'span-4') {
  const sp = spending(s, ym);
  if (!sp.budget) return '';
  const diff = sp.elapsed * sp.budget - sp.spent;
  const ahead = diff < -sp.budget * 0.04;
  const days = sp.days;
  const per = Array.from({ length: days }, () => 0);
  for (const g of sp.list) per[+g.date.slice(8) - 1] += g.amount;
  const upto = Math.max(1, Math.round(sp.elapsed * days));
  let acc = 0;
  const pts = per.slice(0, upto).map((v, i) => { acc += v; return [i, acc]; });
  const max = Math.max(sp.budget, acc) || 1;
  const X = (i) => (i / (days - 1)) * 220;
  const Y = (v) => 56 - (v / max) * 52;
  const line = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const area = pts.length > 1 ? `${line}L${X(pts[pts.length - 1][0]).toFixed(1)} 56L0 56Z` : '';
  return `<section class="card ${span} track-card ${ahead ? 'is-fast' : 'is-ok'}" aria-labelledby="tk-t">
    <div class="track-top"><span class="track-ic">${icon(ahead ? 'i-alert' : 'i-check')}</span>
      <div><h2 id="tk-t">${t2(ahead ? 'fastT' : 'okT')}</h2><p>${t2(ahead ? 'fastS' : 'okS', { v: money(Math.abs(diff)) })}</p></div></div>
    <svg class="spark" viewBox="0 0 220 60" role="img" aria-label="${esc(t2('lineA'))}"><line x1="0" y1="56" x2="220" y2="${Y(sp.budget).toFixed(1)}" class="sp-ideal"/><path d="${area}" class="sp-area"/><path d="${line}" class="sp-line"/></svg>
    <p class="spark-key"><span><i class="k-line"></i>${t2('lineA')}</span><span><i class="k-ideal"></i>${t2('lineB')}</span></p>
  </section>`;
}

function radarState(s, ym) {
  const sp = spending(s, ym);
  const x = monthSummary(s, ym);
  if (!sp.budget) return null;
  const proj = sp.elapsed > 0.04 ? sp.spent / sp.elapsed : sp.spent;
  const over = proj - sp.budget;
  const state = sp.pace > 1 ? 'bad' : over > sp.budget * 0.03 ? 'warn' : 'ok';
  const end = x.free + (sp.budget - proj);
  const msg = state === 'bad' ? t2('fcBad', { v: money(sp.spent - sp.budget) }) : state === 'warn' ? t2('fcWarn', { v: money(over) }) : t2('fcOk', { p: pct(Math.min(1, proj / sp.budget)) });
  return { sp, state, end, msg };
}

export function forecastCard(s, ym) {
  const r = radarState(s, ym);
  if (!r) return '';
  const { sp, state, end, msg } = r;
  return `<section class="card forecast is-${state}" aria-labelledby="fc-t">
    <div class="fc-top"><div><h2 id="fc-t">${t2('fc')}</h2><p class="fc-sub">${t2('fcSub')}</p></div>${ico3d(state === 'ok' ? 'trophy' : state === 'warn' ? 'bulb' : 'fire', 56)}</div>
    <p class="fc-val ${end < 0 ? 'neg' : ''}">${money(end)}</p>
    <div class="fc-bar" role="img" aria-label="${esc(pct(Math.min(1, sp.pace)))} ${esc(t2('fcBar'))}"><b style="width:${Math.min(100, sp.pace * 100).toFixed(1)}%"></b><i style="left:${Math.min(100, sp.elapsed * 100).toFixed(1)}%"></i></div>
    <p class="fc-msg">${msg}</p>
  </section>`;
}

// Invitation to install, for people who have not installed or dismissed it. The browser decides if it can
// prompt; otherwise the button opens the steps for this device.
export function installCard() {
  if (getPrefs().noInstall) return '';
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) return '';
  return `<section class="span-12 inst" aria-labelledby="inst-t">
    <img src="icons/icon-192.png?v=2" width="44" height="44" alt="">
    <div class="inst-txt"><h2 id="inst-t">${t2('inst')}</h2><p>${t2('instSub')}</p></div>
    <div class="inst-act"><button type="button" class="btn btn-primary btn-sm" data-action="install">${t2('instGo')}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-action="installLater">${t2('instNo')}</button></div>
  </section>`;
}

export function homeTop(s) {
  const name = (s.profile.nick || s.profile.name || '').trim();
  const av = s.profile.avatar ? `<img class="home-avatar is-photo" src="${s.profile.avatar}" alt="" width="38" height="38">` : null;
  return `<div class="home-top"><a class="home-brand" href="#inicio" aria-label="Prumo"><img src="logo.svg" width="34" height="34" alt=""><span>prumo</span></a>${av || `<span class="home-avatar" aria-hidden="true">${esc((name[0] || 'P').toUpperCase())}</span>`}</div>`;
}
