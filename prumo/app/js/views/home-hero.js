import { t } from '../i18n.js';
// The home screen's own shape: the sentence box first (it is the product), the plumb line
// showing whether spending hangs straight for this point of the month, and the month as a
// strip of days instead of a bar chart.
import { spending, monthSummary } from '../finance.js';
import { money, moneyHtml, pct, esc, isoDay, ymOf, monthLabel } from '../format.js';
import { icon, ico3d } from '../ui.js';
import { getPrefs } from '../prefs.js';

const TXT = {
  pt: {
    ask: 'O que você gastou hoje?', ph: 'almoço 32, uber 18, mercado 120 no débito', go: 'Lançar',
    hint: 'Escreve tudo de uma vez. Também dá pra falar ou subir o extrato:', more: 'outras formas',
    today: 'Hoje', none: 'Nada lançado hoje ainda.',
    left: 'ainda dá pra gastar hoje', over: 'acima do teto de hoje', of: 'teto de {v} por dia · {d} dias pela frente',
    plumbOk: 'no prumo', plumbFast: 'gasto {p} à frente do mês', plumbSlow: 'folga de {p}',
    plumbAria: 'Prumo do mês: {t}',
    month: 'O mês, dia por dia', free: 'Sobra prevista', day: 'Dia {d}: {v}', dayNone: 'Dia {d}: nada lançado',
    where: 'Pra onde vai o que entra', income: 'Entra', fixed: 'Contas fixas', variable: 'Dia a dia', goals: 'Cofres', das: 'DAS do MEI', rest: 'Sobra',
    legendOk: 'dentro do teto', legendOver: 'passou do teto', legendToday: 'hoje',
  },
  en: {
    ask: 'What did you spend today?', ph: 'lunch 32, uber 18, groceries 120 debit', go: 'Log',
    hint: 'Type it all at once. You can also speak or upload a statement:', more: 'other ways',
    today: 'Today', none: 'Nothing logged today yet.',
    left: 'still free to spend today', over: 'over today\'s cap', of: 'cap of {v} a day · {d} days ahead',
    plumbOk: 'plumb', plumbFast: 'spending {p} ahead of the month', plumbSlow: '{p} of slack',
    plumbAria: 'Month plumb line: {t}',
    month: 'The month, day by day', free: 'Expected left over', day: 'Day {d}: {v}', dayNone: 'Day {d}: nothing logged',
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

export function todayHero(s, ym, compact = false) {
  const sp = spending(s, ym);
  const now = new Date();
  const current = ymOf(now) === ym;
  const today = isoDay(now);
  const mine = current ? s.tx.filter(x => x.date === today) : [];
  const spentToday = mine.reduce((a, x) => a + x.amount, 0);
  const cap = sp.daysLeft ? (sp.budget - sp.spent + spentToday) / sp.daysLeft : 0;
  const left = cap - spentToday;
  return `<section class="card card-hero span-12 today" aria-labelledby="td-t">
    <div class="today-say">
      <h2 id="td-t" class="today-ask">${tx('ask')}</h2>
      <form class="hq today-form" id="home-quick">
        <label for="hq-in" class="sr-only">${tx('ask')}</label>
        <input id="hq-in" autocomplete="off" placeholder="${esc(tx('ph'))}">
        <button class="btn btn-primary" type="submit">${icon('i-send')}<span>${tx('go')}</span></button>
      </form>
      <p class="muted small">${tx('hint')} <a class="link" href="#gastos">${tx('more')}</a></p>
      <div class="today-list" aria-label="${esc(tx('today'))}">
        <span class="today-tag">${tx('today')}</span>
        ${mine.length ? mine.slice(-5).reverse().map(x => `<span class="today-chip">${esc(x.desc)} <b>${money(x.amount)}</b></span>`).join('') : `<span class="muted small">${tx('none')}</span>`}
      </div>
    </div>
    ${compact && sp.budget > 0 ? '' : sp.budget > 0 ? `<div class="today-num">
      ${plumb(sp.pace - sp.elapsed)}
      <div>
        <span class="${left < 0 ? 'neg' : ''}">${moneyHtml(Math.abs(left), 'money-xl')}</span>
        <p class="today-cap"><strong>${tx(left < 0 ? 'over' : 'left')}</strong><br>${tx('of', { v: money(Math.max(0, cap)), d: sp.daysLeft })}</p>
      </div>
    </div>` : `<div class="today-num today-empty"><p class="today-cap"><strong>${t('home.noCap')}</strong><br>${t('home.noCapHint')}</p><a class="btn btn-sm" href="#gastos">${t('home.noCapGo')}</a></div>`}
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
    const cls = d > today ? 'is-next' : v > cap ? 'is-over' : v > 0 ? 'is-ok' : 'is-zero';
    const tip = v > 0 ? tx('day', { d, v: money(v) }) : tx('dayNone', { d });
    return `<i class="${cls}${d === today ? ' is-today' : ''}" style="--a:${Math.min(1, 0.35 + (v / (cap || 1)) * 0.65).toFixed(2)}" title="${esc(tip)}"><span class="sr-only">${esc(tip)}</span></i>`;
  }).join('');
  const inc = x.income || 1;
  const rows = [
    ['fixed', x.fixed, 'var(--s1)'], ['variable', x.variable, 'var(--s2)'], ['goals', x.goals, 'var(--s3)'], ['das', x.das, 'var(--s4)'],
  ].filter(r => r[1] > 0);
  return `<section class="card ${span} month-card" aria-labelledby="mc-t">
    <div class="card-head"><h2 id="mc-t">${tx('month')}</h2>
      <span class="mc-free">${tx('free')} <strong class="${x.free < 0 ? 'neg' : 'pos'}">${money(x.free)}</strong></span></div>
    <div class="days" role="list" style="--n:${sp.days}">${cells}</div>
    <p class="days-legend"><span><i class="is-ok"></i>${tx('legendOk')}</span><span><i class="is-over"></i>${tx('legendOver')}</span><span><i class="is-today"></i>${tx('legendToday')}</span><span class="grow"></span><span>${esc(monthLabel(ym, { month: 'long' }))}</span></p>
    <h3 class="mc-sub">${tx('where')} <span class="muted">${tx('income')} ${money(x.income)}</span></h3>
    <ul class="where">${rows.map(([k, v, c]) => `<li><span class="w-l">${tx(k)}</span><span class="w-bar"><b style="width:${Math.max(1, (v / inc) * 100)}%;background:${c}"></b></span><span class="w-v">${money(v)} <small>${pct(v / inc)}</small></span></li>`).join('')}
      <li class="w-rest"><span class="w-l">${tx('rest')}</span><span class="w-bar"><b style="width:${Math.max(0, (x.free / inc) * 100)}%"></b></span><span class="w-v">${money(x.free)} <small>${pct(Math.max(0, x.free) / inc)}</small></span></li></ul>
  </section>`;
}

// Cards in the spirit of the best finance apps: two money tiles, a category ring, a status card and a small
// spending-vs-plan line. Same data as everything else on the screen, shown at a glance.
const TXT2 = {
  pt: { today: 'Pode gastar hoje', todayOk: 'ainda dentro do teto', todayOver: 'acima do teto de hoje', fc: 'Fechamento previsto', fcSub: 'sobra prevista no fim do mês', fcOk: 'No ritmo de hoje você usa {p} do teto de gastos do mês. Tá tranquilo.', fcWarn: 'No ritmo de hoje você passa {v} do teto de gastos. Dá pra corrigir.', fcBad: 'Você já passou do teto de gastos do mês em {v}.', fcBar: 'do teto usado', in: 'Entrou este mês', out: 'Gastou este mês', of: 'de {v} previstos', ring: 'Pra onde foi', total: 'gasto', others: 'Outros', okT: 'Você está no ritmo', okS: '{v} abaixo do ritmo do mês.', fastT: 'Gasto à frente do mês', fastS: '{v} acima do ritmo do mês.', lineA: 'Seu gasto no mês', lineB: 'Ritmo ideal' },
  en: { today: 'Free to spend today', todayOk: 'still under the cap', todayOver: 'over today\'s cap', fc: 'Expected month end', fcSub: 'expected left over at month end', fcOk: 'At today\'s pace you use {p} of the month\'s spending cap. All good.', fcWarn: 'At today\'s pace you go {v} over the spending cap. Fixable.', fcBad: 'You are already {v} over the month\'s spending cap.', fcBar: 'of the cap used', in: 'Income this month', out: 'Spent this month', of: 'of {v} planned', ring: 'Where it went', total: 'spent', others: 'Other', okT: 'You are on pace', okS: '{v} under the month\'s pace.', fastT: 'Spending ahead of the month', fastS: '{v} over the month\'s pace.', lineA: 'Your spending', lineB: 'Ideal pace' },
};
const t2 = (k, vars = {}) => (TXT2[getPrefs().lang === 'en' ? 'en' : 'pt'][k] || k).replace(/\{(\w+)\}/g, (_, n) => vars[n]);
const RING = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--brass)'];

export function statTiles(s, ym) {
  const x = monthSummary(s, ym);
  const sp = spending(s, ym);
  const now = new Date();
  const today = isoDay(now);
  const spentToday = ymOf(now) === ym ? s.tx.filter(g => g.date === today).reduce((a, g) => a + g.amount, 0) : 0;
  const cap = sp.daysLeft ? (sp.budget - sp.spent + spentToday) / sp.daysLeft : 0;
  const left = cap - spentToday;
  return `<div class="tiles span-12">
    <div class="tile t-in">${ico3d('money-bag', 52)}<div><small>${t2('in')}</small><b>${money(x.income)}</b></div></div>
    <div class="tile t-out">${ico3d('card', 52)}<div><small>${t2('out')}</small><b>${money(sp.spent)}</b><em>${t2('of', { v: money(sp.budget) })}</em></div></div>
    <div class="tile t-today">${ico3d('dollar', 52)}<div><small>${t2('today')}</small><b class="${left < 0 ? 'neg' : ''}">${money(Math.abs(left))}</b><em>${t2(left < 0 ? 'todayOver' : 'todayOk')}</em></div></div>
  </div>`;
}

export function ringCard(s, ym, span = 'span-8') {
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
  const legend = top.map(([c, v], i) => `<li><i style="background:${RING[i]}"></i><span>${esc(c === '__o' ? t2('others') : t('cat.' + c))}</span><b>${pct(v / total)}</b></li>`).join('');
  return `<section class="card ${span} ring-card" aria-labelledby="rg-t">
    <div class="card-head"><h2 id="rg-t">${t2('ring')}</h2></div>
    <div class="cat-ring"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(t2('ring'))}"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--track)" stroke-width="16"/>${arcs}</svg>
      <div class="ring-mid"><b>${money(total)}</b><small>${t2('total')}</small></div></div>
    <ul class="ring-legend">${legend}</ul>
  </section>`;
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

// The radar: the plumb bob, big and centered, shows at a glance whether the month hangs straight.
function radarState(s, ym) {
  const sp = spending(s, ym);
  const x = monthSummary(s, ym);
  if (!sp.budget) return null;
  const dev = sp.pace - sp.elapsed;
  const proj = sp.elapsed > 0.04 ? sp.spent / sp.elapsed : sp.spent;
  const over = proj - sp.budget;
  const state = sp.pace > 1 ? 'bad' : over > sp.budget * 0.03 ? 'warn' : 'ok';
  const end = x.free + (sp.budget - proj);
  const msg = state === 'bad' ? t2('fcBad', { v: money(sp.spent - sp.budget) }) : state === 'warn' ? t2('fcWarn', { v: money(over) }) : t2('fcOk', { p: pct(Math.min(1, proj / sp.budget)) });
  return { sp, dev, proj, over, state, end, msg };
}

export function radarCard(s, ym) {
  const r = radarState(s, ym);
  if (!r) return '';
  return `<section class="radar span-12 is-${r.state}" aria-label="${esc(t2('fc'))}"><div class="radar-art">${plumb(r.dev)}</div></section>`;
}

export function forecastCard(s, ym) {
  const r = radarState(s, ym);
  if (!r) return '';
  const { sp, state, end, msg } = r;
  return `<section class="card span-12 forecast is-${state}" aria-labelledby="fc-t">
    <div class="fc-top"><div><h2 id="fc-t">${t2('fc')}</h2><p class="fc-sub">${t2('fcSub')}</p></div>${ico3d(state === 'ok' ? 'trophy' : state === 'warn' ? 'bulb' : 'fire', 56)}</div>
    <p class="fc-val ${end < 0 ? 'neg' : ''}">${money(end)}</p>
    <div class="fc-bar" role="img" aria-label="${esc(pct(Math.min(1, sp.pace)))} ${esc(t2('fcBar'))}"><b style="width:${Math.min(100, sp.pace * 100).toFixed(1)}%"></b><i style="left:${Math.min(100, sp.elapsed * 100).toFixed(1)}%"></i></div>
    <p class="fc-msg">${msg}</p>
  </section>`;
}

export function homeTop(s) {
  const name = (s.profile.name || '').trim();
  return `<div class="home-top"><a class="home-brand" href="#inicio" aria-label="Prumo"><img src="logo.svg" width="34" height="34" alt=""><span>prumo</span></a><span class="home-avatar" aria-hidden="true">${esc((name[0] || 'P').toUpperCase())}</span></div>`;
}
