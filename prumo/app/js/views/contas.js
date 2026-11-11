import { t } from '../i18n.js';
import { bills } from '../finance.js';
import { money, monthIn, esc } from '../format.js';
import { head, billRow } from './parts.js';
import { icon } from '../ui.js';

export function render(s, ctx) {
  const list = bills(s, ctx.ym);
  const open = list.filter(b => !b.isPaid), paid = list.filter(b => b.isPaid);
  const total = list.reduce((a, b) => a + b.amount, 0);
  return `${head(t('nav.contas'), t('bill.pageSub', { m: esc(monthIn(ctx.ym)) }),
    `<span class="btn-row"><button class="btn" data-action="ics">${icon('i-cal')}${t('ics.btn')}</button><button class="btn btn-primary" data-action="add">${icon('i-plus')}${t('add.bill')}</button></span>`)}
  <div class="grid">
    <section class="card span-8" aria-labelledby="open-t">
      <div class="card-head"><h2 id="open-t">${t('bill.open', { n: open.length })}</h2><span class="amt">${money(open.reduce((a, b) => a + b.amount, 0))}</span></div>
      <ul class="rows">${open.map(billRow).join('') || `<li class="empty">${t('bill.allPaid')}</li>`}</ul>
    </section>
    <section class="card span-4" aria-labelledby="paid-t">
      <div class="card-head"><h2 id="paid-t">${t('bill.paidList', { n: paid.length })}</h2></div>
      <p class="card-sub">${t('bill.totalMonth', { v: money(total) })}</p>
      <ul class="rows">${paid.map(billRow).join('') || `<li class="empty">${t('bill.nonePaid')}</li>`}</ul>
    </section>
  </div>`;
}
