import { t } from '../i18n.js';
import { projection, spending, monthSummary, capsUsed, capCrossed } from '../finance.js';
import { projectionChart, bindChart, tableFor } from '../chart.js';
import { esc, ymOf, money, isoDay, displayName } from '../format.js';
import { parseQuick } from '../quick.js';
import { earn } from '../actions.js';
import * as store from '../store.js';
import { head, heroFlow, levelCard, billsCard, meiCard, goalsCard, alerts, subsCard } from './parts.js';
import { insightList } from './conselheiro.js';
import { todayHero, monthCard, catCard, budgetCard, trackCard, forecastCard, homeTop, sec, t2, installCard, capNudge } from './home-hero.js';
import { quizBanner } from './comecar.js';
import { icon, toast } from '../ui.js';
import { say } from '../tone.js';
import { retroBanner } from './retro.js';
import { bfCard } from './bf.js';
import { welcomeCard } from './welcome.js';
import { isReal } from '../store.js';

// The headline says where the month stands, not just hello.
function headline(s, ym) {
  const sp = spending(s, ym);
  const x = monthSummary(s, ym);
  if (x.free < 0) return say('home.hRed');
  if (sp.pace > sp.elapsed + 0.1) return say('home.hFast', { d: sp.daysLeft });
  return say('home.hOk', { d: sp.daysLeft });
}

export function render(s, ctx) {
  const rows = projection(s, ctx.ym);
  const showTable = ctx.tables.has('proj');
  const has = m => s.modules.includes(m);
  const hasMei = has('mei') && s.mei.enabled;
  const sp = spending(s, ctx.ym);
  const first = displayName(s);
  const fresh = isReal() && !sp.budget && !s.incomes.length;
  // Bills, MEI and subscriptions share one row, whatever is switched on.
  const next = [has('contas') || true, hasMei, has('assinaturas')].filter(Boolean).length;
  const span = 'span-' + (12 / next);
  return `${homeTop(s)}${head(fresh ? t('home.hNew', { name: esc(first) }) : headline(s, ctx.ym), fresh ? t('home.sNew') : '')}
  <div class="h-hero">${todayHero(s, ctx.ym)}${forecastCard(s, ctx.ym)}</div>
  <div class="grid">
    ${welcomeCard(s, isReal())}
    ${isReal() ? '' : quizBanner(s)}
    ${retroBanner(s, ctx)}
    ${sp.list.length ? sec('secMonth', `<a class="link" href="#relatorio">${t2('report')}</a>`) : ''}
    ${catCard(s, ctx.ym, 'span-7')}
    ${sp.list.length ? budgetCard(s, ctx.ym, 'span-5') : ''}
    ${monthCard(s, ctx.ym, 'span-8')}
    ${trackCard(s, ctx.ym, 'span-4')}
    ${installCard()}
    ${sec('secNext')}
    ${alerts(s, ctx)}
    ${billsCard(s, ctx, span)}
    ${hasMei ? meiCard(s, ctx, span) : ''}
    ${has('assinaturas') ? subsCard(s, span) : ''}
    <section class="card span-12" aria-labelledby="proj-t">
      <div class="card-head"><h2 id="proj-t">${t('chart.projTitle')}</h2>
        <button class="btn btn-sm" data-action="table" data-k="proj" aria-pressed="${showTable}">${t(showTable ? 'chart.showChart' : 'chart.showTable')}</button></div>
      ${showTable ? tableFor(rows) : projectionChart(rows, ymOf(new Date()))}
    </section>
    ${has('conselheiro') ? `<section class="card span-12" aria-labelledby="adv-t">
      <div class="card-head"><h2 id="adv-t">${t('home.advisor')}</h2><a class="link" href="#conselheiro">${t('home.askAdvisor')}</a></div>
      ${insightList(s, ctx.ym, 3)}</section>` : ''}
    ${has('cofres') || has('conquistas') ? sec('secGoals') : ''}
    ${bfCard(s, ctx.ym, true)}
    ${has('cofres') ? goalsCard(s, has('conquistas') ? 'span-8' : 'span-12') : ''}
    ${has('conquistas') ? levelCard(s) : ''}
  </div>`;
}

export function mount(root, s, ctx) {
  bindChart(root, projection(s, ctx.ym));
  const form = root.querySelector('#home-quick');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input');
    const rows = parseQuick(input.value);
    if (!rows.length) { toast(t('quick.none')); input.focus(); return; }
    const day = ymOf(new Date()) === ctx.ym ? isoDay(new Date()) : ctx.ym + '-01';
    const before = capsUsed(store.get(), ctx.ym);
    earn(st => { for (const r of rows) store.pushRow(st, r, day); },
      'xp.log', Math.min(30, 5 + rows.length * 3), say('quick.saved', { n: rows.length, v: money(rows.reduce((a, r) => a + r.amount, 0)) }));
    capNudge(capCrossed(before, store.get(), ctx.ym));
    requestAnimationFrame(() => document.getElementById('hq-in')?.focus());
  });
}
