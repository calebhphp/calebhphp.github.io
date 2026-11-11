// Retrospectiva: a closed month as five vertical cards, sized for stories.
import { t } from '../i18n.js';
import { say, tone } from '../tone.js';
import { money, pct, esc, monthLabel, ymOf, addMonths, dayLabel } from '../format.js';
import { wishlistStatus } from '../finance.js';
import { head } from './parts.js';
import { icon, toast } from '../ui.js';

// The month shown: last month while the current one is still running.
const retroYm = ym => (ym === ymOf(new Date()) ? addMonths(ym, -1) : ym);

function recap(s, ym) {
  const list = s.tx.filter(x => x.date.startsWith(ym));
  if (!list.length) return null;
  const [y, m] = ym.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const spent = list.reduce((a, x) => a + x.amount, 0);
  const budget = Object.values(s.budgets).reduce((a, v) => a + v, 0);
  const byCat = {};
  for (const x of list) byCat[x.cat] = (byCat[x.cat] || 0) + x.amount;
  const [topCat, topV] = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const monk = spent <= budget * 0.85;
  const byDay = Array.from({ length: days }, () => 0);
  for (const x of list) byDay[+x.date.slice(8) - 1] += x.amount;
  const maxV = Math.max(...byDay);
  const maxD = byDay.indexOf(maxV) + 1;
  const maxItem = list.filter(x => +x.date.slice(8) === maxD).sort((a, b) => b.amount - a.amount)[0];
  const allowance = budget / days;
  const inside = byDay.filter(v => v <= allowance).length;
  const prevSpent = s.tx.filter(x => x.date.startsWith(addMonths(ym, -1))).reduce((a, x) => a + x.amount, 0);
  const reserve = s.goals.find(g => g.kind === 'reserva');
  const next = wishlistStatus(s).find(w => w.state !== 'bought');
  return { list, days, spent, budget, topCat, topV, monk, maxD, maxV, maxItem, allowance, inside, prevSpent, reserve, next };
}

export function retroBanner(s, ctx) {
  if (!s.modules.includes('retro') || !s.profile.quiz || ctx.ym !== ymOf(new Date())) return '';
  const ym = retroYm(ctx.ym);
  if (!s.tx.some(x => x.date.startsWith(ym))) return '';
  return `<div class="banner banner-retro span-12"><div><h2>${t('retro.banner', { m: esc(monthLabel(ym, { month: 'long' })) })}</h2></div>
    <a class="btn btn-primary" href="#retro">${icon('i-star')}${t('retro.bannerCta')}</a></div>`;
}

function cards(s, ym, r) {
  const m = monthLabel(ym, { month: 'long' });
  const catName = ['deboche', 'semfiltro'].includes(tone()) ? t('cat.' + r.topCat).toLowerCase() : t('cat.' + r.topCat);
  const charName = say('retro.c.' + (r.monk ? 'monge' : r.topCat));
  const date = new Date(`${ym}-${String(r.maxD).padStart(2, '0')}T12:00`);
  const vs = r.prevSpent ? t('retro.vs', { p: pct(Math.abs(r.spent - r.prevSpent) / r.prevSpent), dir: t(r.spent < r.prevSpent ? 'retro.less' : 'retro.more'), m: monthLabel(addMonths(ym, -1), { month: 'long' }) }) : '';
  const resPct = r.reserve ? pct(r.reserve.saved / r.reserve.target) : '';
  return [
    { k: 'cover', kicker: esc(m), big: t('retro.cover'), line: say('retro.coverSub', { n: r.list.length }) },
    { k: 'char', kicker: t('retro.char'), big: esc(charName),
      line: r.monk ? t('retro.monkLine', { p: pct(r.spent / r.budget) }) : say('retro.charLine', { cat: catName, v: money(r.topV), p: pct(r.topV / r.spent) }) },
    { k: 'day', kicker: t('retro.day'), big: esc(dayLabel(date)), sub: money(r.maxV),
      line: say('retro.dayLine', { item: esc(r.maxItem.desc), v: money(r.maxItem.amount) }) },
    { k: 'pace', kicker: t('retro.pace'), big: `${r.inside}<small>/${r.days}</small>`,
      line: say('retro.paceLine', { n: r.inside, d: r.days, o: r.days - r.inside, v: money(r.allowance) }) },
    { k: 'end', kicker: t('retro.end'), big: money(r.spent), sub: t('retro.plan', { v: money(r.budget) }) + (vs ? `<br>${esc(vs)}` : ''),
      line: (r.reserve ? (r.next ? t('retro.savedLine', { p: resPct, item: esc(r.next.name) }) : t('retro.savedNone', { p: resPct })) + ' ' : '') + say('retro.endLine') },
  ];
}

export function render(s, ctx) {
  const ym = retroYm(ctx.ym);
  const r = recap(s, ym);
  const title = `${t('retro.title')}: ${esc(monthLabel(ym))}`;
  if (!r) return `${head(title, t('retro.sub'))}<div class="grid"><section class="card span-12"><p class="empty">${t('retro.empty')}</p></section></div>`;
  const list = cards(s, ym, r);
  return `${head(title, t('retro.sub'), `<button class="btn btn-primary" type="button" id="retro-share">${icon('i-swap')}${t('retro.share')}</button>`)}
  <div class="retro-wrap">
    <button type="button" class="btn icon-btn retro-nav" data-dir="-1" aria-label="${esc(t('retro.prev'))}">${icon('i-left')}</button>
    <ol class="retro" id="retro" tabindex="0" aria-label="${esc(title)}">
      ${list.map((c, i) => `<li class="rc rc-${c.k}" aria-label="${esc(t('retro.card', { i: i + 1, n: list.length }))}">
        <div class="rc-top"><svg class="rc-mark" aria-hidden="true"><use href="#logo-mark"/></svg><span>${i + 1}/${list.length}</span></div>
        <p class="rc-kicker">${c.kicker}</p>
        <p class="rc-big">${c.big}</p>
        ${c.sub ? `<p class="rc-sub">${c.sub}</p>` : ''}
        <p class="rc-line">${c.line}</p>
        <p class="rc-foot">prumo</p>
      </li>`).join('')}
    </ol>
    <button type="button" class="btn icon-btn retro-nav" data-dir="1" aria-label="${esc(t('retro.next'))}">${icon('i-right')}</button>
  </div>`;
}

export function mount(root, s, ctx) {
  const ym = retroYm(ctx.ym);
  const r = recap(s, ym);
  if (!r) return;
  const strip = root.querySelector('#retro');
  root.querySelectorAll('.retro-nav').forEach(b => b.addEventListener('click', () => {
    const w = strip.querySelector('.rc').getBoundingClientRect().width + 16;
    strip.scrollBy({ left: w * +b.dataset.dir, behavior: document.documentElement.dataset.motion === 'off' ? 'auto' : 'smooth' });
  }));
  root.querySelector('#retro-share').addEventListener('click', async () => {
    const c = cards(s, ym, r);
    const text = t('retro.shareText', { m: monthLabel(ym, { month: 'long' }), char: c[1].big, day: `${c[2].big} (${c[2].sub})`, n: r.inside, d: r.days });
    try { await navigator.clipboard.writeText(text); toast(t('retro.copied')); } catch (e) { toast(text); }
  });
}
