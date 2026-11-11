// Take your data with you: spending as CSV (opens in Excel and Google Sheets) and a full backup.
import { t } from './i18n.js';
import * as store from './store.js';
import { CATS } from './quick.js';

const ID = /^[\w-]{1,40}$/, DAY = /^\d{4}-\d{2}-\d{2}$/, YM = /^\d{4}-\d{2}$/;
const fin = v => typeof v === 'number' && Number.isFinite(v);
const str = (v, n = 120) => typeof v === 'string' && v.length <= n;
const dom = v => Number.isInteger(v) && v >= 1 && v <= 31;
const list = a => Array.isArray(a) && a.length < 20000;
const PAY = [null, 'pix', 'debito', 'credito', 'dinheiro'];

function validState(st) {
  if (!st || st.v !== 4 || !str(st.template, 20) || !st.profile || !str(st.profile.name, 80)) return false;
  if (!['tx', 'goals', 'bills', 'accounts', 'incomes', 'subs', 'wishlist', 'debts', 'installments', 'cards', 'modules'].every(k => list(st[k]))) return false;
  if (!st.modules.every(m => store.MODULES.includes(m))) return false;
  if (!st.budgets || !Object.entries(st.budgets).every(([k, v]) => CATS.includes(k) && fin(v))) return false;
  if (!st.fx || !Object.entries(st.fx).every(([k, v]) => /^[A-Z]{3}$/.test(k) && fin(v))) return false;
  const named = a => a.every(o => o && ID.test(o.id) && str(o.name));
  return st.tx.every(x => ID.test(x.id) && DAY.test(x.date) && str(x.desc) && fin(x.amount) && CATS.includes(x.cat) && PAY.includes(x.pay ?? null))
    && named(st.bills) && st.bills.every(b => fin(b.amount) && dom(b.day) && b.paid && typeof b.paid === 'object' && (b.card == null || ID.test(b.card)))
    && named(st.incomes) && st.incomes.every(i => fin(i.amount) && dom(i.day) && (i.endsOn == null || DAY.test(i.endsOn)) && ['clt', 'pj'].includes(i.kind))
    && named(st.cards) && st.cards.every(c => fin(c.limit) && dom(c.close) && dom(c.due))
    && named(st.accounts) && st.accounts.every(a => fin(a.balance))
    && named(st.goals) && st.goals.every(g => fin(g.target) && fin(g.saved) && fin(g.monthly))
    && named(st.wishlist) && st.wishlist.every(w => fin(w.price) && ID.test(w.goal))
    && named(st.subs) && st.subs.every(x => fin(x.amount))
    && named(st.debts) && st.debts.every(d => fin(d.amount))
    && st.installments.every(p => ID.test(p.id) && str(p.desc) && fin(p.total) && Number.isInteger(p.n) && p.n > 1 && p.n <= 48 && YM.test(p.start))
    && !!st.mei && fin(st.mei.limit) && fin(st.mei.das) && dom(st.mei.dasDay) && list(st.mei.invoices) && st.mei.invoices.every(i => YM.test(i.month) && fin(i.amount))
    && !!st.game && fin(st.game.xp) && st.game.xp >= 0 && st.game.xp < 1e9
    && list(st.game.log) && st.game.log.every(l => DAY.test(l.at) && /^xp\.\w+$/.test(l.key) && fin(l.xp))
    && list(st.game.rewards) && st.game.rewards.every(r => Number.isInteger(r.level) && str(r.text));
}

// Cells starting with = + - @ would run as formulas in a spreadsheet. Prefix them.
const cell = v => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const num = v => String(Math.round(v * 100) / 100).replace('.', ',');

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportCsv() {
  const s = store.get();
  const head = [t('csv.type'), t('csv.date'), t('csv.desc'), t('csv.cat'), t('csv.pay'), t('csv.amount'), t('csv.parcels')];
  const rows = [...s.tx].sort((a, b) => a.date.localeCompare(b.date)).map(x =>
    [t('csv.tx'), x.date, x.desc, t('cat.' + x.cat), x.pay || '', num(x.amount), '']);
  for (const p of s.installments || []) rows.push([t('csv.inst'), p.start + '-01', p.desc, '', 'credito', num(p.total), p.n]);
  // BOM + semicolons: Excel in Portuguese opens it with accents and columns right.
  download(`prumo-gastos-${stamp()}.csv`, '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  return rows.length;
}

export function exportBackup() {
  download(`prumo-backup-${stamp()}.json`, JSON.stringify({ app: 'prumo', at: new Date().toISOString(), state: store.get() }, null, 1), 'application/json');
}

// Accepts only a Prumo backup of the current format. Returns false otherwise.
export function readBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return false; }
  const st = data && data.app === 'prumo' ? data.state : null;
  if (!validState(st)) return false;
  store.replace(st);
  return true;
}

// Bills as a calendar file: one monthly event each, with a reminder the evening before.
// Opens in Google Calendar, Apple Calendar and Outlook; no server, no notifications of our own.
export function exportIcs() {
  const s = store.get();
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const txt = v => String(v).replace(/[\\;,]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const items = s.bills.map(b => ({ id: b.id, day: b.day, name: b.name, amount: b.card ? null : b.amount }));
  if (s.mei && s.mei.enabled && s.modules.includes('mei')) items.push({ id: 'das', day: s.mei.dasDay, name: t('ics.das'), amount: s.mei.das });
  const ev = items.map(b => {
    const day = Math.min(28, b.day);
    const first = new Date(now.getFullYear(), now.getMonth() + (day < now.getDate() ? 1 : 0), day);
    const d = `${first.getFullYear()}${String(first.getMonth() + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    return ['BEGIN:VEVENT', `UID:${b.id}@prumo`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, 'RRULE:FREQ=MONTHLY',
      `SUMMARY:${txt(b.amount ? `${b.name}: ${fmt(b.amount)}` : b.name)}`, `DESCRIPTION:${txt(t('ics.desc'))}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${txt(t('ics.alarm', { name: b.name }))}`, 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT'].join('\r\n');
  });
  download('prumo-contas.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prumo//Contas//PT', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${txt(t('ics.cal'))}`, ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n', 'text/calendar;charset=utf-8');
  return items.length;
}
