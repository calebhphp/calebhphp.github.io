// Credit card: this month's bill, the limit, and installments that are already spoken for.
import { t } from '../i18n.js';
import { cardStatus } from '../finance.js';
import { money, moneyHtml, moneyShort, pct, esc, monthLabel, addMonths } from '../format.js';
import { head } from './parts.js';
import { icon } from '../ui.js';

export function render(s, ctx) {
  const c = cardStatus(s, ctx.ym);
  if (!c) return head(t('card.title'), t('card.sub'));
  const level = c.pct > 0.9 ? 'bad' : c.pct > 0.7 ? 'warn' : 'good';
  const max = Math.max(1, ...c.ahead.map(a => a.v));
  return `${head(t('card.title'), t('card.sub'), `<button class="btn btn-primary" data-action="addInstallment">${icon('i-plus')}${t('card.add')}</button>`)}
  <div class="grid">
    <section class="card card-hero span-8" aria-labelledby="inv-t">
      <p class="hero-label" id="inv-t">${t('card.invoice', { m: esc(monthLabel(ctx.ym, { month: 'long' })) })}</p>
      ${moneyHtml(c.inv.total, 'money-xl')}
      <p class="hero-note">${esc(c.card.name)} · ${t('card.closeDue', { c: c.card.close, d: c.card.due })}</p>
      <ul class="rows" style="margin-top:14px">
        <li><span class="grow"><span class="title">${t('card.credit')}</span></span><span class="amt">${money(c.inv.credit)}</span></li>
        <li><span class="grow"><span class="title">${t('card.parcels')}</span><span class="meta">${c.inv.parcels.length}</span></span><span class="amt">${money(c.inv.parc)}</span></li>
      </ul>
    </section>
    <section class="card span-4" aria-labelledby="lim-t">
      <div class="card-head"><h2 id="lim-t">${t('card.limit')}</h2><span class="amt">${money(c.card.limit)}</span></div>
      <p class="card-sub">${t('card.usedOf', { used: money(c.used), limit: money(c.card.limit) })}</p>
      <div class="meter ${level}" role="progressbar" aria-label="${esc(t('card.limitAria', { p: pct(c.pct) }))}" aria-valuemin="0" aria-valuemax="${c.card.limit}" aria-valuenow="${Math.round(c.used)}"><i style="width:${Math.min(100, c.pct * 100)}%"></i></div>
      <p style="margin:12px 0 0"><strong>${t('card.free', { v: money(c.free) })}</strong></p>
      <p class="muted small" style="margin:8px 0 0">${t('card.tip')}</p>
    </section>
    <section class="card span-5" aria-labelledby="ah-t">
      <div class="card-head"><h2 id="ah-t">${t('card.ahead')}</h2></div>
      <p class="card-sub">${t('card.aheadSub')}</p>
      <ol class="ahead">${c.ahead.map(a => `<li><span class="ah-bar" style="--h:${Math.round(a.v / max * 100)}%" aria-hidden="true"></span>
        <span class="ah-v">${moneyShort(Math.round(a.v))}</span><span class="ah-m">${esc(monthLabel(a.ym, { month: 'short' }))}</span>
        <span class="sr-only">${esc(monthLabel(a.ym))}: ${money(a.v)}</span></li>`).join('')}</ol>
    </section>
    <section class="card span-7" aria-labelledby="pl-t">
      <div class="card-head"><h2 id="pl-t">${t('card.list', { n: c.inv.parcels.length })}</h2></div>
      ${c.inv.parcels.length ? `<ul class="rows">${c.inv.parcels.map(p => `<li>
        <span class="badge">${t('card.k', { k: p.k, n: p.n })}</span>
        <span class="grow"><span class="title">${esc(p.desc)}</span><span class="meta">${p.left ? t('card.left', { v: money(p.left) }) + ' · ' : ''}${t('card.ends', { m: esc(monthLabel(addMonths(p.start, p.n - 1), { month: 'short', year: 'numeric' })) })}</span></span>
        <span class="amt">${money(p.parcel)}</span>
        <button type="button" class="btn btn-ghost btn-sm icon-btn" data-action="delInstallment" data-id="${p.id}" aria-label="${esc(t('card.del', { name: p.desc }))}">${icon('i-x')}</button></li>`).join('')}</ul>`
        : `<p class="empty">${t('card.none')}</p>`}
    </section>
  </div>`;
}
