// Pieces shared by more than one view.
import { t } from '../i18n.js';
import { icon } from '../ui.js';
import { money, moneyHtml, monthIn, pct, esc, moneyIn, ymOf } from '../format.js';
import { monthSummary, bills, meiYear, wishlistStatus, incomeDrop, subsReview, spending, workHours, runway } from '../finance.js';
import { levelInfo, missionsToday, streak } from '../game.js';

export const head = (title, sub, extra = '') =>
  `<div class="view-head"><div><h1 tabindex="-1">${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${extra}</div>`;

export function billRow(b) {
  const status = b.isPaid ? `<span class="badge b-good">${icon('i-check')}${t('bill.paidBadge')}</span>`
    : b.overdue ? `<span class="badge b-bad">${icon('i-alert')}${t('bill.overdue')}</span>`
    : `<span class="badge">${t('bill.dueDay', { d: b.day })}</span>`;
  return `<li class="${b.isPaid ? 'done' : ''}">
    <button class="check" type="button" data-action="pay" data-id="${b.id}" aria-pressed="${b.isPaid}" aria-label="${esc(t(b.isPaid ? 'bill.markUnpaid' : 'bill.markPaid', { name: b.name }))}">${icon('i-check')}</button>
    <span class="grow"><span class="title">${esc(b.name)}</span><span class="meta">${status}</span></span>
    <span class="amt">${money(b.amount)}</span></li>`;
}

// Day-by-day spending this month against the daily allowance: the plumb line.
export function dailyChart(s, ym) {
  const sp = spending(s, ym);
  const days = sp.days;
  const per = Array.from({ length: days }, () => 0);
  for (const x of sp.list) per[+x.date.slice(8) - 1] += x.amount;
  const today = Math.round(sp.elapsed * days);
  const allowance = sp.budget / days;
  const max = Math.max(allowance * 2.2, ...per) || 1;
  const W = 300, H = 120, gap = 2, bw = (W - gap * (days - 1)) / days;
  const y = v => H - (v / max) * (H - 8);
  const over = per.filter((v, i) => i < today && v > allowance).length;
  const bars = per.map((v, i) => {
    const x = i * (bw + gap);
    if (i >= today) return `<rect x="${x}" y="${H - 3}" width="${bw}" height="3" rx="1.5" class="d-future"/>`;
    const h = Math.max(3, H - y(v));
    return `<rect x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="${Math.min(3, bw / 2)}" class="${v > allowance ? 'd-over' : 'd-ok'}"><title>${t('daily.tip', { d: i + 1, v: money(v) })}</title></rect>`;
  }).join('');
  const label = t('daily.aria', { a: money(allowance), n: over, d: today });
  return `<figure class="daily" aria-label="${esc(label)}" role="img">
    <svg viewBox="0 -14 ${W} ${H + 30}" preserveAspectRatio="none" aria-hidden="true">
      ${bars}
      <line x1="0" x2="${W}" y1="${y(allowance)}" y2="${y(allowance)}" class="d-line"/>
      <line x1="${today * (bw + gap) - gap / 2}" x2="${today * (bw + gap) - gap / 2}" y1="-12" y2="${H}" class="d-today"/>
      <text x="${Math.min(W - 40, today * (bw + gap) + 4)}" y="-3" class="d-label">${t('daily.today')}</text>
      <text x="0" y="${H + 14}" class="d-label">1</text><text x="${W}" y="${H + 14}" class="d-label" text-anchor="end">${days}</text>
    </svg>
    <figcaption class="d-cap"><span><i class="d-sw d-sw-line"></i>${t('daily.allow', { v: money(allowance) })}</span><span><i class="d-sw d-sw-over"></i>${t('daily.over', { n: over })}</span></figcaption>
  </figure>`;
}

export function heroFlow(s, ym) {
  const x = monthSummary(s, ym);
  const inc = x.income || 1;
  const segs = [
    { k: 'fixed', v: x.fixed, c: 'var(--s1)', href: '#contas' },
    { k: 'variable', v: x.variable, c: 'var(--s2)' },
    { k: 'goals', v: x.goals, c: 'var(--s3)', href: '#cofres' },
    { k: 'das', v: x.das, c: 'var(--s4)', href: '#mei' },
  ].filter(g => g.v > 0);
  const freePct = Math.max(0, x.free) / inc;
  const bar = segs.map(g => {
    const label = `${t('flow.' + g.k)}: ${money(g.v)}, ${pct(g.v / inc)}`;
    const tag = g.href ? 'a' : 'span';
    return `<${tag} ${g.href ? `href="${g.href}"` : 'tabindex="0"'} style="flex:${g.v};background:${g.c}" aria-label="${esc(label)}" title="${esc(label)}"></${tag}>`;
  }).join('') + (x.free > 0 ? `<span style="flex:${x.free}" aria-hidden="true"></span>` : '');
  const legend = [
    `<li><span class="k">${t('flow.income')}</span><span class="v">${money(x.income)}</span></li>`,
    ...segs.map(g => `<li><span class="k"><i class="sw" style="background:${g.c}"></i>${t('flow.' + g.k)}</span><span class="v">− ${money(g.v)}<span class="pct">${pct(g.v / inc)}</span></span></li>`),
    `<li><span class="k"><i class="sw sw-free"></i>${t('flow.free')}</span><span class="v ${x.free < 0 ? 'neg' : 'pos'}">${money(x.free)}<span class="pct">${pct(Math.max(0, freePct))}</span></span></li>`,
  ].join('');
  return `<section class="card card-hero span-8" aria-labelledby="hero-t">
    <div class="hero-top">
      <div><p class="hero-label" id="hero-t">${t('flow.title', { m: esc(monthIn(ym, { month: 'long' })) })}</p>
        <span class="${x.free < 0 ? 'neg' : ''}">${moneyHtml(x.free, 'money-xl')}</span>
        <p class="hero-note">${x.free < 0 ? t('flow.negative') : t('flow.note', { p: `<strong>${pct(freePct)}</strong>` })}</p></div>
      ${dailyChart(s, ym)}
    </div>
    <div class="flow">
      <div class="flow-bar" role="group" aria-label="${esc(t('flow.aria'))}">${bar}</div>
      <ul class="flow-legend">${legend}</ul>
    </div></section>`;
}

export function levelCard(s) {
  const lv = levelInfo(s.game.xp);
  const st = streak(s);
  const next = s.game.rewards.filter(r => r.level > lv.level).sort((a, b) => a.level - b.level)[0];
  const ms = missionsToday(s);
  return `<section class="card span-4 level" aria-labelledby="lvl-t">
    <div class="level-top">
      <span class="ring" style="--p:${Math.round(lv.pct * 100)}" aria-hidden="true"><span>${lv.level}</span></span>
      <div><h2 id="lvl-t">${t('game.level', { level: lv.level })}</h2>
        <span class="muted">${t('game.toNext', { xp: lv.toNext, level: lv.level + 1 })}</span></div>
    </div>
    <div class="meter xp" role="progressbar" aria-label="${esc(t('game.progress'))}" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}"><i style="width:${lv.pct * 100}%"></i></div>
    ${next ? `<p style="margin:0;font-size:.9rem">${icon('i-star')} ${t('game.nextReward', { level: next.level, reward: `<strong>${esc(next.text)}</strong>` })}</p>` : ''}
    <div>
      <div class="card-head" style="margin-bottom:8px"><h3>${t('game.streak', { n: st.count })}</h3><span class="badge b-xp">${icon('i-flame')}${st.count}</span></div>
      <div class="streak" aria-label="${esc(t('game.streakAria', { n: st.last7.filter(Boolean).length }))}" role="img">${st.last7.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')}</div>
    </div>
    <div>
      <h3 style="margin:0 0 8px;font-size:1rem">${t('game.missions')}</h3>
      <ul class="missions">${ms.map(m => `<li class="${m.done ? 'done' : ''}"><span class="tick" aria-hidden="true">${icon('i-check')}</span><span>${t(m.label)}</span><span class="sr-only">${m.done ? t('common.done') : t('common.pending')}</span><span class="badge b-xp xp">+${m.xp} XP</span></li>`).join('')}</ul>
    </div></section>`;
}

export function billsCard(s, ctx, span = 'span-4') {
  const list = bills(s, ctx.ym);
  const open = list.filter(b => !b.isPaid);
  const days = [...new Set(list.map(b => b.day))];
  const shown = (ctx.day ? list.filter(b => b.day === ctx.day) : list.filter(b => !b.isPaid).concat(list.filter(b => b.isPaid))).slice(0, ctx.day ? 20 : 6);
  return `<section class="card ${span}" aria-labelledby="bills-t">
    <div class="card-head"><h2 id="bills-t">${t('bill.title')}</h2><a class="link" href="#contas">${t('common.seeAll')}</a></div>
    <p class="card-sub">${t('bill.summary', { v: money(open.reduce((a, b) => a + b.amount, 0)), paid: list.length - open.length, total: list.length })}</p>
    <div class="days" role="group" aria-label="${esc(t('bill.filterDay'))}">${days.map(d => {
      const n = list.filter(b => b.day === d && !b.isPaid).length;
      return `<button type="button" data-action="day" data-day="${d}" aria-pressed="${ctx.day === d}" aria-label="${esc(t('bill.dayAria', { d, n }))}"><b>${String(d).padStart(2, '0')}</b><small aria-hidden="true">${n ? '•'.repeat(Math.min(n, 4)) : '✓'}</small></button>`;
    }).join('')}</div>
    <ul class="rows">${shown.map(billRow).join('') || `<li class="empty">${t('bill.empty')}</li>`}</ul></section>`;
}

export function meiCard(s, ctx, span = 'span-4') {
  const m = meiYear(s);
  const label = { good: t('mei.good'), warn: t('mei.warn'), bad: t('mei.bad') }[m.level];
  const cls = { good: 'b-good', warn: 'b-warn', bad: 'b-bad' }[m.level];
  const dasPaid = !!s.mei.dasPaid[ctx.ym];
  return `<section class="card ${span}" aria-labelledby="mei-t">
    <div class="card-head"><h2 id="mei-t">${t('mei.title', { y: new Date().getFullYear() })}</h2><span class="badge ${cls}">${icon(m.level === 'good' ? 'i-check' : 'i-alert')}${label}</span></div>
    ${moneyHtml(m.ytd, 'money-l')}
    <p class="card-sub" style="margin:8px 0 18px">${t('mei.of', { limit: money(s.mei.limit), left: money(m.left) })}</p>
    <div class="meter ${m.level}" role="progressbar" aria-label="${esc(t('mei.meterAria'))}" aria-valuemin="0" aria-valuemax="${s.mei.limit}" aria-valuenow="${Math.round(m.ytd)}" aria-valuetext="${esc(pct(m.used))}">
      <i style="width:${Math.min(100, m.used * 100)}%"></i>
      <span class="mark" style="left:${Math.min(100, m.projected * 100)}%" title="${esc(t('mei.pace', { v: money(m.pace) }))}"></span></div>
    <div class="meter-scale"><span>0</span><span>${t('mei.paceShort', { v: money(m.pace) })}</span><span>${money(s.mei.limit)}</span></div>
    <ul class="rows" style="margin-top:14px"><li class="${dasPaid ? 'done' : ''}">
      <button class="check" type="button" data-action="payDas" aria-pressed="${dasPaid}" ${dasPaid ? 'disabled' : ''} aria-label="${esc(t('mei.dasMark'))}">${icon('i-check')}</button>
      <span class="grow"><span class="title">${t('mei.das', { m: esc(monthIn(ctx.ym, { month: 'long' })) })}</span><span class="meta">${t('mei.dasDue', { d: s.mei.dasDay })}</span></span>
      <span class="amt">${money(s.mei.das)}</span></li></ul></section>`;
}

export function goalsCard(s, span = 'span-4') {
  const ws = wishlistStatus(s);
  const next = ws.find(w => w.state !== 'bought');
  return `<section class="card ${span}" aria-labelledby="goals-t">
    <div class="card-head"><h2 id="goals-t">${t('goal.title')}</h2><a class="link" href="#cofres">${t('common.seeAll')}</a></div>
    ${s.goals.map(g => goalBlock(g)).join('')}
    ${next ? `<div class="alert ${next.state === 'ready' ? 'alert-warn' : ''}" style="margin-top:14px;${next.state === 'ready' ? '' : 'border-color:var(--line)'}">
      ${icon('i-home')}<div><h3 style="margin:0;font-size:.95rem">${t('wish.next', { name: esc(next.name) })}</h3>
      <p>${next.state === 'ready' ? t('wish.ready', { v: money(next.price) }) : next.state === 'cooling' ? t('wish.coolingShort') : t('wish.missing', { v: money(next.missing) })} ${t('wish.hours', { h: Math.round(workHours(s, next.price, ymOf(new Date()))) })}.</p></div>
      ${next.state === 'ready' ? `<button class="btn btn-sm btn-primary" data-action="buy" data-id="${next.id}">${t('wish.buy')}</button>` : ''}</div>` : ''}
    </section>`;
}

export function goalBlock(g) {
  const p = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
  return `<div class="goal">
    <div class="goal-row"><strong>${esc(g.name)}</strong><span class="muted">${pct(p)}</span></div>
    <div class="meter good" role="progressbar" aria-label="${esc(g.name)}" aria-valuemin="0" aria-valuemax="${g.target}" aria-valuenow="${Math.round(g.saved)}" aria-valuetext="${esc(t('goal.aria', { s: money(g.saved), tgt: money(g.target) }))}"><i style="width:${p * 100}%"></i></div>
    <div class="goal-row"><span class="muted" style="font-size:.85rem">${money(g.saved)} / ${money(g.target)}</span>
      <button class="btn btn-sm" data-action="deposit" data-id="${g.id}" aria-label="${esc(t('goal.depositAria', { name: g.name }))}">${icon('i-plus')}${t('goal.deposit')}</button></div></div>`;
}

export function alerts(s, ctx) {
  const out = [];
  const debt = s.debts.find(d => !d.paid);
  // Calm tone on purpose: shame makes people stop opening finance apps.
  if (debt) out.push(`<div class="alert alert-calm span-6" role="region" aria-labelledby="debt-t">${icon('i-flag')}
    <div><h2 id="debt-t">${t('debt.title', { name: esc(debt.name), v: money(debt.amount) })}</h2><p>${t('debt.body')}</p></div>
    <button class="btn btn-sm" data-action="payDebt" data-id="${debt.id}">${t('debt.mark')}</button></div>`);
  const drop = incomeDrop(s, ctx.ym);
  if (drop) out.push(`<div class="alert alert-warn ${debt ? 'span-6' : 'span-12'}" role="region" aria-labelledby="drop-t">${icon('i-alert')}
    <div><h2 id="drop-t">${t('alert.dropTitle', { m: esc(monthIn(drop.ym)), p: Math.round(drop.pct * 100) })}</h2>
    <p>${t('alert.dropBody', { from: money(drop.from), to: money(drop.to) })} ${runwayText(s, ctx.ym)}</p></div>
    <a class="btn btn-sm" href="#entradas">${t('alert.dropCta')}</a></div>`);
  return out.join('');
}

export function subsCard(s, span = 'span-4') {
  const r = subsReview(s);
  const pending = s.subs.filter(x => !x.cancelled && x.used !== true).slice(0, 3);
  return `<section class="card ${span}" aria-labelledby="subs-t">
    <div class="card-head"><h2 id="subs-t">${t('sub.title')}</h2><a class="link" href="#assinaturas">${t('common.seeAll')}</a></div>
    ${moneyHtml(r.total, 'money-m')} <span class="muted">${t('sub.perMonth')}</span>
    <p class="card-sub" style="margin:8px 0 6px">${r.unknown ? t('sub.unknown', { n: r.unknown }) : t('sub.allReviewed')}</p>
    <ul class="rows">${pending.map(subRow).join('')}</ul></section>`;
}

export function subRow(x) {
  if (x.cancelled) return `<li class="done"><span class="grow"><span class="title">${esc(x.name)}</span><span class="meta"><span class="badge b-good">${t('sub.cancelledBadge')}</span></span></span><span class="amt">${money(x.amount)}</span></li>`;
  return `<li><span class="grow"><span class="title">${esc(x.name)}</span><span class="meta">${moneyIn(x.amount, x.cur, x.cur ? 5.4 : 0)} ${t('sub.perMonthShort')}</span></span>
    <span class="seg" role="group" aria-label="${esc(t('sub.usedQ', { name: x.name }))}">
      <button type="button" data-action="subUsed" data-id="${x.id}" data-v="1" aria-pressed="${x.used === true}">${t('sub.used')}</button>
      <button type="button" data-action="subUsed" data-id="${x.id}" data-v="0" aria-pressed="${x.used === false}">${t('sub.notUsed')}</button></span>
    ${x.used === false ? `<button class="btn btn-sm" data-action="subCancel" data-id="${x.id}">${t('sub.cancel')}</button>` : ''}</li>`;
}

export const summaryOf = monthSummary;

export function runwayText(s, ym) {
  const rw = runway(s, ym);
  if (!rw) return '';
  return rw.months === null ? t('runway.covered') : t('runway.line', { n: String(rw.months).replace('.', ','), gap: money(rw.gap), v: money(rw.saved) });
}
