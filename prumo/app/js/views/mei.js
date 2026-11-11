import { t } from '../i18n.js';
import { money, monthLabel, esc } from '../format.js';
import { head, meiCard } from './parts.js';
import { icon } from '../ui.js';

export function render(s, ctx) {
  const year = String(new Date().getFullYear());
  const inv = s.mei.invoices.filter(i => i.month.startsWith(year)).sort((a, b) => a.month.localeCompare(b.month));
  const has = inv.some(i => i.month === ctx.ym);
  return `${head(t('nav.mei'), t('mei.sub'), `<button class="btn btn-primary" data-action="invoice">${icon('i-plus')}${t(has ? 'mei.invoiceEdit' : 'mei.invoiceAdd')}</button>`)}
  <div class="grid">
    ${meiCard(s, ctx, 'span-6')}
    <section class="card span-6" aria-labelledby="inv-t">
      <div class="card-head"><h2 id="inv-t">${t('mei.invoices', { y: year })}</h2></div>
      <table class="data"><thead><tr><th scope="col">${t('chart.month')}</th><th scope="col" class="n">${t('common.amount')}</th></tr></thead>
      <tbody>${inv.map(i => `<tr><th scope="row">${esc(monthLabel(i.month))}</th><td class="n">${money(i.amount)}</td></tr>`).join('') || `<tr><td colspan="2" class="empty">${t('mei.noInvoices')}</td></tr>`}</tbody></table>
    </section>
    <div class="alert alert-warn span-12">${icon('i-alert')}<div><h2>${t('mei.checkTitle')}</h2><p>${t('mei.checkBody')}</p></div></div>
  </div>`;
}
