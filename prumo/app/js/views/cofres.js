import { t } from '../i18n.js';
import { wishlistStatus, workHours } from '../finance.js';
import { ctx } from '../actions.js';
import { money, esc } from '../format.js';
import { head, goalBlock } from './parts.js';
import { icon } from '../ui.js';
import { bfCard, priceLine, impulse } from './bf.js';

const hours = (s, v) => { const h = workHours(s, v, ctx.ym); return h < 10 ? h.toFixed(1).replace('.', ',') : Math.round(h); };
const waitLabel = ms => new Intl.DateTimeFormat(document.documentElement.lang, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

export function render(s) {
  const ws = wishlistStatus(s);
  const n = ws.length;
  return `${head(t('nav.cofres'), t('goal.pageSub'), `<span class="btn-row"><button class="btn" data-action="addGoal">${icon('i-plus')}${t('goalNew.title')}</button><button class="btn btn-primary" data-action="add">${icon('i-plus')}${t('add.wish')}</button></span>`)}
  <div class="grid">
    ${bfCard(s, ctx.ym)}
    <section class="card span-5" aria-labelledby="g-t">
      <div class="card-head"><h2 id="g-t">${t('goal.title')}</h2></div>
      ${s.goals.length ? s.goals.map(goalBlock).join('') : `<p class="muted empty">${t('goalNew.empty')}</p>`}
    </section>
    <section class="card span-7" aria-labelledby="w-t">
      <div class="card-head"><h2 id="w-t">${t('wish.title')}</h2></div>
      <p class="card-sub">${t('wish.rule')} ${t('wish.coolRule')}</p>
      <ol class="rows wish">${ws.map((w, i) => {
        const goal = s.goals.find(g => g.id === w.goal);
        const status = w.state === 'bought' ? `<span class="badge b-good">${icon('i-check')}${t('wish.boughtBadge')}</span>`
          : w.state === 'ready' ? `<span class="badge b-warn">${icon('i-star')}${t('wish.readyBadge')}</span>`
          : w.state === 'cooling' ? `<span class="badge">${icon('i-cal')}${t('wish.cooling', { d: esc(waitLabel(w.until)) })}</span>`
          : `<span class="badge">${icon('i-lock')}${t('wish.lockBadge', { v: money(w.missing) })}</span>`;
        return `<li class="${w.state === 'bought' ? 'done' : ''}">
          <span class="grow"><span class="title">${i + 1}. ${esc(w.name)}</span><span class="meta">${status} ${goal ? esc(goal.name) : ''} · ${t('wish.hours', { h: hours(s, w.price) })}</span>${w.state !== 'bought' ? priceLine(w) : ''}${w.state !== 'bought' && impulse(w) ? `<span class="meta bf-line"><span class="badge b-warn">${t('bf.impulse')}</span></span>` : ''}</span>
          <span class="amt">${money(w.price)}</span>
          ${w.state === 'ready' ? `<button class="btn btn-sm btn-primary" data-action="buy" data-id="${w.id}">${t(w.addedAt ? 'wish.stillWant' : 'wish.buy')}</button>` : ''}
          ${w.state !== 'bought' ? `<button class="btn btn-ghost btn-sm" data-action="wishPrice" data-id="${w.id}" aria-label="${esc(t('bf.noteAria', { name: w.name }))}">${t('bf.note')}</button>` : ''}
          ${w.state !== 'bought' ? `<button class="btn btn-ghost btn-sm" data-action="wishDrop" data-id="${w.id}" aria-label="${esc(t('wish.dropAria', { name: w.name }))}">${t('wish.drop')}</button>` : ''}
          ${w.state !== 'bought' ? `<span style="display:flex;gap:2px">
            <button class="btn btn-ghost btn-sm icon-btn" data-action="move" data-id="${w.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('wish.up', { name: w.name }))}">${icon('i-up')}</button>
            <button class="btn btn-ghost btn-sm icon-btn" data-action="move" data-id="${w.id}" data-dir="1" ${i === n - 1 ? 'disabled' : ''} aria-label="${esc(t('wish.down', { name: w.name }))}">${icon('i-down')}</button></span>` : ''}
        </li>`;
      }).join('')}</ol>
    </section>
  </div>`;
}
