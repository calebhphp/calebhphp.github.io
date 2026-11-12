import { t } from '../i18n.js';
import { projection, spending, monthSummary } from '../finance.js';
import { projectionChart, bindChart, tableFor } from '../chart.js';
import { esc, ymOf, money, isoDay } from '../format.js';
import { parseQuick } from '../quick.js';
import { earn } from '../actions.js';
import * as store from '../store.js';
import { head, heroFlow, levelCard, billsCard, meiCard, goalsCard, alerts, subsCard } from './parts.js';
import { insightList } from './conselheiro.js';
import { todayHero, monthCard, statTiles, ringCard, trackCard } from './home-hero.js';
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
  const hasMei = s.modules.includes('mei') && s.mei.enabled;
  const sp = spending(s, ctx.ym);
  const first = s.profile.name.split(' ')[0];
  const fresh = isReal() && !sp.budget && !s.incomes.length;
  return `${head(fresh ? t('home.hNew', { name: esc(first) }) : headline(s, ctx.ym), fresh ? t('home.sNew') : say('home.sub', { name: esc(first), v: money(Math.max(0, sp.perDayLeft)) }))}
  <div class="grid">
    ${welcomeCard(s, isReal())}
    ${isReal() ? '' : quizBanner(s)}
    ${retroBanner(s, ctx)}
    ${todayHero(s, ctx.ym)}
    ${statTiles(s, ctx.ym)}
    ${ringCard(s, ctx.ym, "span-8")}
    ${trackCard(s, ctx.ym, "span-4")}
    ${monthCard(s, ctx.ym, s.modules.includes('conquistas') ? 'span-8' : 'span-12')}
    ${s.modules.includes('conquistas') ? levelCard(s) : ''}
    ${bfCard(s, ctx.ym, true)}
    ${s.modules.includes('conselheiro') ? `<section class="card span-12" aria-labelledby="adv-t">
      <div class="card-head"><h2 id="adv-t">${t('home.advisor')}</h2><a class="link" href="#conselheiro">${t('home.askAdvisor')}</a></div>
      ${insightList(s, ctx.ym, 3)}</section>` : ''}
    ${alerts(s, ctx)}
    ${billsCard(s, ctx, hasMei ? 'span-4' : 'span-6')}
    ${hasMei ? meiCard(s, ctx) : ''}
    ${s.modules.includes('cofres') ? goalsCard(s, hasMei ? 'span-4' : 'span-6') : ''}
    <section class="card span-8" aria-labelledby="proj-t">
      <div class="card-head"><h2 id="proj-t">${t('chart.projTitle')}</h2>
        <button class="btn btn-sm" data-action="table" data-k="proj" aria-pressed="${showTable}">${t(showTable ? 'chart.showChart' : 'chart.showTable')}</button></div>
      ${showTable ? tableFor(rows) : projectionChart(rows, ymOf(new Date()))}
    </section>
    ${s.modules.includes('assinaturas') ? subsCard(s) : ''}
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
    earn(st => { for (const r of rows) store.pushRow(st, r, day); },
      'xp.log', Math.min(30, 5 + rows.length * 3), say('quick.saved', { n: rows.length, v: money(rows.reduce((a, r) => a + r.amount, 0)) }));
    requestAnimationFrame(() => document.getElementById('hq-in')?.focus());
  });
}
