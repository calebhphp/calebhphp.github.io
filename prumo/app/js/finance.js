// Pure money math. No DOM here, so it can move to a server later unchanged.
import { addMonths, ymOf } from './format.js';

const sum = (arr, f = x => x) => arr.reduce((s, x) => s + f(x), 0);
const r2 = v => Math.round(v * 100) / 100;
// Amounts in another currency (dev tools in USD, income from abroad) count at the saved rate.
export const brl = (s, x) => x.amount * (x.cur && x.cur !== 'BRL' ? ((s.fx || {})[x.cur] || 1) : 1);

export const activeIncomes = (s, ym) => s.incomes.filter(i => !i.endsOn || i.endsOn >= `${ym}-01`);

export function monthSummary(s, ym) {
  const inc = activeIncomes(s, ym);
  const income = r2(sum(inc, i => brl(s, i)));
  const subs = sum(s.subs.filter(x => !x.cancelled), x => brl(s, x));
  const fixed = sum(s.bills.filter(b => !b.card), b => b.amount) + sum(installmentsIn(s, ym), p => p.parcel) + subs;
  const variable = sum(Object.values(s.budgets));
  const goals = sum(s.goals.filter(g => g.saved < g.target), g => g.monthly);
  const das = s.mei.enabled && s.modules.includes('mei') ? s.mei.das : 0;
  const free = r2(income - fixed - variable - goals - das);
  return {
    income, fixed: r2(fixed), variable, goals, das, free,
    incomeClt: r2(sum(inc.filter(i => i.kind === 'clt'), i => brl(s, i))),
    incomePj: r2(sum(inc.filter(i => i.kind === 'pj'), i => brl(s, i))),
  };
}

export function bills(s, ym, today = new Date()) {
  const cur = ymOf(today);
  return s.bills
    .map(b => {
      const paid = !!b.paid[ym];
      const overdue = !paid && (ym < cur || (ym === cur && b.day < today.getDate()));
      return { ...b, amount: b.card ? cardInvoice(s, ym).total : b.amount, isPaid: paid, overdue };
    })
    .sort((a, b) => a.day - b.day);
}

export function projection(s, ym, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = addMonths(ym, i);
    const x = monthSummary(s, m);
    return { ym: m, income: x.income, out: r2(x.fixed + x.variable + x.das), free: x.free };
  });
}

// First month ahead where income drops by 10% or more.
export function incomeDrop(s, ym) {
  const base = monthSummary(s, ym).income;
  for (let i = 1; i <= 6; i++) {
    const m = addMonths(ym, i);
    const inc = monthSummary(s, m).income;
    if (inc < base * 0.9) return { ym: m, from: base, to: inc, pct: (base - inc) / base };
  }
  return null;
}

export function meiYear(s, today = new Date()) {
  const year = String(today.getFullYear());
  const ytd = sum(s.mei.invoices.filter(i => i.month.startsWith(year)), i => i.amount);
  const months = Math.max(1, s.mei.invoices.filter(i => i.month.startsWith(year)).length);
  const pace = (ytd / months) * 12;
  const used = ytd / s.mei.limit;
  const projected = pace / s.mei.limit;
  const level = projected >= 1 ? 'bad' : projected >= 0.8 ? 'warn' : 'good';
  return { ytd, pace, used, projected, level, left: Math.max(0, s.mei.limit - ytd) };
}

export function subsReview(s) {
  const live = s.subs.filter(x => !x.cancelled);
  return {
    total: r2(sum(live, x => brl(s, x))),
    unused: r2(sum(live.filter(x => x.used === false), x => brl(s, x))),
    usd: r2(sum(live.filter(x => x.cur === 'USD'), x => brl(s, x))),
    unknown: live.filter(x => x.used === null).length,
    saved: r2(sum(s.subs.filter(x => x.cancelled), x => brl(s, x))),
  };
}

// Wishlist items unlock in order, only when the goal already holds the money.
export const COOL_MS = 48 * 3600 * 1000;

export function wishlistStatus(s, now = Date.now()) {
  const left = Object.fromEntries(s.goals.map(g => [g.id, g.saved]));
  return s.wishlist.map(w => {
    if (w.bought) return { ...w, state: 'bought' };
    const ok = left[w.goal] >= w.price;
    // New wishes wait 48 hours before they can be bought, even with the money there.
    const until = w.addedAt ? Date.parse(w.addedAt) + COOL_MS : 0;
    if (ok) { left[w.goal] -= w.price; return until > now ? { ...w, state: 'cooling', until } : { ...w, state: 'ready' }; }
    const missing = w.price - left[w.goal];
    left[w.goal] = 0;
    return { ...w, state: 'waiting', missing };
  });
}

export const totalBalance = s => sum(s.accounts, a => a.balance);

// Day-to-day spending against the plan, per category, plus the month's pace.
export function spending(s, ym, today = new Date()) {
  const list = s.tx.filter(x => x.date.startsWith(ym));
  const [y, m] = ym.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const cur = ymOf(today);
  const elapsed = ym < cur ? 1 : ym > cur ? 0 : today.getDate() / days;
  const cats = Object.entries(s.budgets).map(([cat, budget]) => {
    const spent = r2(sum(list.filter(x => x.cat === cat), x => x.amount));
    const used = budget ? spent / budget : 0;
    const level = used > 1 ? 'bad' : used > elapsed + 0.15 ? 'warn' : 'good';
    return { cat, budget, spent, used, level, left: r2(budget - spent) };
  }).sort((a, b) => b.used - a.used);
  const spent = r2(sum(list, x => x.amount));
  const budget = sum(Object.values(s.budgets));
  const daysLeft = Math.max(0, Math.round(days * (1 - elapsed)));
  return { list: [...list].sort((a, b) => b.date.localeCompare(a.date)), cats, spent, budget, elapsed, days, daysLeft,
    perDayLeft: daysLeft ? r2((budget - spent) / daysLeft) : 0, pace: budget ? spent / budget : 0 };
}

// Most frequent entries, for one-tap repeat buttons.
export function favorites(s, n = 6) {
  const map = new Map();
  for (const x of s.tx) {
    const k = x.desc.toLowerCase() + '|' + x.amount;
    const e = map.get(k) || { desc: x.desc, amount: x.amount, cat: x.cat, n: 0 };
    e.n++; map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.n - a.n).slice(0, n);
}

// Plain-language findings the advisor shows without any AI call.
export function insights(s, ym, today = new Date()) {
  const out = [];
  const sp = spending(s, ym, today);
  const hot = sp.cats.find(c => c.level !== 'good' && c.spent > 0);
  if (hot) out.push({ k: 'catHot', level: hot.level, cat: hot.cat, used: hot.used, left: hot.left, days: sp.daysLeft });
  if (sp.daysLeft) out.push({ k: 'perDay', level: sp.perDayLeft < 0 ? 'bad' : 'good', v: sp.perDayLeft, days: sp.daysLeft });
  const drop = incomeDrop(s, ym);
  if (drop) {
    const months = Math.max(1, (Number(drop.ym.slice(0, 4)) - Number(ym.slice(0, 4))) * 12 + Number(drop.ym.slice(5)) - Number(ym.slice(5)));
    out.push({ k: 'drop', level: 'warn', gap: drop.from - drop.to, ym: drop.ym, perMonth: r2((drop.from - drop.to) * 3 / months) });
  }
  const sr = subsReview(s);
  if (sr.unknown || sr.unused) out.push({ k: 'subs', level: 'warn', n: sr.unknown, v: (sr.unused || sr.total) * 12 });
  if (sr.usd) out.push({ k: 'fx', level: 'good', v: sr.usd, up: r2(sr.usd * 0.1) });
  const debt = s.debts.find(d => !d.paid);
  if (debt) out.push({ k: 'debt', level: 'warn', v: debt.amount, weeks: Math.max(1, Math.ceil(debt.amount / Math.max(1, monthSummary(s, ym).free) * 4.3)) });
  if (s.mei.enabled) { const m = meiYear(s, today); if (m.level !== 'good') out.push({ k: 'mei', level: m.level, v: m.pace }); }
  const rw = runway(s, ym);
  if (rw && rw.months !== null) out.push({ k: 'runway', level: rw.months < 3 ? 'warn' : 'good', months: rw.months, gap: rw.gap, ym: rw.ym });
  return out;
}

// Credit card: installments run month by month; the invoice is this month's card spending plus parcels.
const monthsBetween = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

export function installmentsIn(s, ym) {
  return (s.installments || []).map(p => {
    const k = monthsBetween(p.start, ym) + 1;
    return { ...p, k, parcel: r2(p.total / p.n), left: r2(p.total / p.n * (p.n - k)) };
  }).filter(p => p.k >= 1 && p.k <= p.n);
}

export function cardInvoice(s, ym) {
  const credit = r2(sum(s.tx.filter(x => x.pay === 'credito' && x.date.startsWith(ym)), x => x.amount));
  const parcels = installmentsIn(s, ym);
  const parc = r2(sum(parcels, p => p.parcel));
  return { credit, parc, parcels, total: r2(credit + parc) };
}

export function cardStatus(s, ym) {
  const card = (s.cards || [])[0];
  if (!card) return null;
  const inv = cardInvoice(s, ym);
  const future = r2(sum(inv.parcels, p => p.left));
  const used = r2(inv.total + future);
  const ahead = Array.from({ length: 6 }, (_, i) => { const m = addMonths(ym, i + 1); return { ym: m, v: r2(sum(installmentsIn(s, m), p => p.parcel)) }; });
  return { card, inv, future, used, free: r2(card.limit - used), pct: used / card.limit, ahead };
}

// What one hour of the person's work is worth this month (income over the hours they work).
export const hourValue = (s, ym) => monthSummary(s, ym).income / ((s.profile && s.profile.hours) || 160);
export const workHours = (s, v, ym) => Math.max(0.1, v / Math.max(1, hourValue(s, ym)));

// Runway: if a PJ contract ends, how many months the emergency reserve covers the gap.
export function runway(s, ym) {
  const drop = incomeDrop(s, ym);
  if (!drop) return null;
  const x = monthSummary(s, drop.ym);
  const gap = r2(x.fixed + x.variable + x.das - x.income);
  const reserve = s.goals.find(g => g.kind === 'reserva');
  const saved = reserve ? reserve.saved : 0;
  return { ym: drop.ym, gap, saved, months: gap > 0 ? Math.floor(saved / gap * 10) / 10 : null };
}
