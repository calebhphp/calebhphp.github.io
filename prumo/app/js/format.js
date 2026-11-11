import { getPrefs } from './prefs.js';

const cache = new Map();
function nf(opts) {
  const { lang, currency } = getPrefs();
  const k = lang + currency + JSON.stringify(opts);
  if (!cache.has(k)) cache.set(k, new Intl.NumberFormat(lang, { style: 'currency', currency, ...opts }));
  return cache.get(k);
}

export const money = v => nf({}).format(v);
export const moneyShort = v => nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v);
export const pct = v => new Intl.NumberFormat(getPrefs().lang, { style: 'percent', maximumFractionDigits: 0 }).format(v);

// Big number with currency symbol and cents set smaller, screen readers get the plain value.
export function moneyHtml(v, size = 'money-l') {
  const parts = nf({}).formatToParts(v);
  let cur = '', int = '', frac = '', sep = '';
  for (const p of parts) {
    if (p.type === 'currency') cur = p.value;
    else if (p.type === 'fraction') frac = p.value;
    else if (p.type === 'decimal') sep = p.value;
    else if (p.type !== 'literal') int += p.value;
  }
  return `<span class="money ${size}" aria-hidden="true"><span class="cur">${cur}</span>${int}<span class="cents">${sep}${frac}</span></span><span class="sr-only">${money(v)}</span>`;
}

export function monthLabel(ym, opts = { month: 'long', year: 'numeric' }) {
  const [y, m] = ym.split('-').map(Number);
  const s = new Intl.DateTimeFormat(getPrefs().lang, opts).format(new Date(y, m - 1, 1));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Month name inside a sentence: Portuguese and Spanish write it in lower case ("sobra prevista em novembro").
export function monthIn(ym, opts) {
  const s = monthLabel(ym, opts);
  return getPrefs().lang === 'en' ? s : s.toLowerCase();
}

export function dayLabel(date) {
  return new Intl.DateTimeFormat(getPrefs().lang, { day: '2-digit', month: 'short' }).format(date);
}

export const ymOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  return ymOf(new Date(y, m - 1 + n, 1));
}
export const isoDay = d => `${ymOf(d)}-${String(d.getDate()).padStart(2, '0')}`;

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// An amount in its own currency, with the local equivalent when it differs.
export function moneyIn(amount, cur, rate) {
  const { lang, currency } = getPrefs();
  if (!cur || cur === currency) return money(amount);
  const own = new Intl.NumberFormat(lang, { style: 'currency', currency: cur }).format(amount);
  return rate ? `${own} ≈ ${money(amount * rate)}` : own;
}
