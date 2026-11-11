// The home screen's own shape: the sentence box first (it is the product), the plumb line
// showing whether spending hangs straight for this point of the month, and the month as a
// strip of days instead of a bar chart.
import { spending, monthSummary } from '../finance.js';
import { money, moneyHtml, pct, esc, isoDay, ymOf, monthLabel } from '../format.js';
import { icon } from '../ui.js';
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

export function todayHero(s, ym) {
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
    <div class="today-num">
      ${plumb(sp.pace - sp.elapsed)}
      <div>
        <span class="${left < 0 ? 'neg' : ''}">${moneyHtml(Math.abs(left), 'money-xl')}</span>
        <p class="today-cap"><strong>${tx(left < 0 ? 'over' : 'left')}</strong><br>${tx('of', { v: money(Math.max(0, cap)), d: sp.daysLeft })}</p>
      </div>
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
