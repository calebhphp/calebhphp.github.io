// Every button with data-action lands here. One place, one vocabulary.
import * as store from './store.js';
import { grant, levelInfo } from './game.js';
import { openDialog, toast, announce } from './ui.js';
import { t } from './i18n.js';
import { money, ymOf, addMonths, monthIn, esc } from './format.js';
import { monthSummary, incomeDrop, meiYear } from './finance.js';
import { getPrefs } from './prefs.js';
import { speak } from './ai.js';
import { say, chooseTone } from './tone.js';
import { exportIcs } from './export.js';
import * as cloud from './cloud.js';
import { startTour } from './tour.js';

export const ctx = { ym: ymOf(new Date()), day: null, tables: new Set() };
const rerender = () => document.dispatchEvent(new CustomEvent('prumo:render'));

// Wraps a change that earns XP; the store listener shows toast and level-up.
export function earn(mutator, key, xp, msg) {
  let res;
  store.update(s => { mutator(s); res = grant(s, key, xp); }, { earned: true });
  const total = xp + (res.bonus ? res.bonus.xp : 0);
  toast(msg, total, !!res.bonus);
  if (res.bonus) {
    const m = t('game.missionDone', { m: t(res.bonus.label) });
    announce(`${msg}. ${t('game.gained', { xp: total })}. ${m}`);
    setTimeout(() => toast(m, 0, true), 400);
  }
  if (res.levelUp) document.dispatchEvent(new CustomEvent('prumo:levelup', { detail: res.levelUp }));
}

const num = v => Math.round(parseFloat(String(v).replace(/\./g, '').replace(',', '.')) * 100) / 100;
const moneyInput = (name, label, value = '') =>
  `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" inputmode="decimal" autocomplete="off" required value="${value}" placeholder="0,00"></div>`;

export const actions = {
  month(el) { ctx.ym = addMonths(ctx.ym, +el.dataset.dir); ctx.day = null; rerender(); },
  day(el) { ctx.day = ctx.day === +el.dataset.day ? null : +el.dataset.day; rerender(); },
  table(el) { const k = el.dataset.k; ctx.tables.has(k) ? ctx.tables.delete(k) : ctx.tables.add(k); rerender(); },

  pay(el) {
    const id = el.dataset.id;
    const b = store.get().bills.find(x => x.id === id);
    if (b.paid[ctx.ym]) {
      store.update(s => { delete s.bills.find(x => x.id === id).paid[ctx.ym]; });
      announce(t('bill.unpaid', { name: b.name }));
      return;
    }
    const early = ctx.ym > ymOf(new Date()) || (ctx.ym === ymOf(new Date()) && b.day >= new Date().getDate());
    earn(s => { s.bills.find(x => x.id === id).paid[ctx.ym] = true; }, 'xp.pay', early ? 15 : 10, say('bill.paid', { name: b.name }));
  },

  payDas() {
    if (store.get().mei.dasPaid[ctx.ym]) return;
    earn(s => { s.mei.dasPaid[ctx.ym] = true; }, 'xp.das', 15, t('mei.dasPaidToast'));
  },

  invoice() {
    const s = store.get();
    const pj = monthSummary(s, ctx.ym).incomePj;
    openDialog({
      title: t('mei.invoiceTitle'), submit: t('mei.invoiceSave'),
      body: moneyInput('amount', t('common.amount'), pj ? String(pj).replace('.', ',') : '') + `<p class="muted">${t('mei.invoiceHint', { m: esc(monthIn(ctx.ym)) })}</p>`,
      onSubmit: d => {
        const v = num(d.amount); if (!(v > 0)) return false;
        earn(st => {
          const i = st.mei.invoices.find(x => x.month === ctx.ym);
          if (i) i.amount = v; else st.mei.invoices.push({ month: ctx.ym, amount: v });
        }, 'xp.invoice', 10, t('mei.invoiceDone', { v: money(v) }));
      },
    });
  },

  prolabore() {
    const s = store.get();
    const pj = s.accounts.find(a => a.kind === 'pj');
    const pf = s.accounts.find(a => a.kind === 'pf');
    if (!pj || !pf) return;
    openDialog({
      title: t('bank.transferTitle'), submit: t('bank.transferDo'),
      body: moneyInput('amount', t('common.amount'), '3000,00') + `<p class="muted">${t('bank.transferHint', { from: esc(pj.name), to: esc(pf.name), bal: money(pj.balance) })}</p>`,
      onSubmit: d => {
        const v = num(d.amount); if (!(v > 0) || v > pj.balance) return false;
        earn(st => {
          st.accounts.find(a => a.id === pj.id).balance -= v;
          st.accounts.find(a => a.id === pf.id).balance += v;
        }, 'xp.transfer', 15, t('bank.transferDone', { v: money(v) }));
      },
    });
  },

  deposit(el) {
    const s = store.get();
    const g = s.goals.find(x => x.id === el.dataset.id);
    const opts = s.accounts.map(a => `<option value="${a.id}">${esc(a.name)} (${money(a.balance)})</option>`).join('');
    openDialog({
      title: t('goal.depositTitle', { name: esc(g.name) }), submit: t('goal.depositDo'),
      body: moneyInput('amount', t('common.amount'), String(g.monthly).replace('.', ',')) +
        `<div class="field"><label for="f-from">${t('goal.from')}</label><select id="f-from" name="from">${opts}</select></div>`,
      onSubmit: d => {
        const v = num(d.amount); if (!(v > 0)) return false;
        earn(st => {
          st.goals.find(x => x.id === g.id).saved += v;
          st.accounts.find(a => a.id === d.from).balance -= v;
        }, 'xp.save', 10, say('goal.depositDone', { v: money(v), name: g.name }));
      },
    });
  },

  buy(el) {
    const s = store.get();
    const w = s.wishlist.find(x => x.id === el.dataset.id);
    earn(st => {
      st.wishlist.find(x => x.id === w.id).bought = true;
      st.goals.find(g => g.id === w.goal).saved -= w.price;
    }, 'xp.buy', 30, say('wish.bought', { name: w.name }));
  },

  move(el) {
    const id = el.dataset.id, dir = +el.dataset.dir;
    store.update(s => {
      const i = s.wishlist.findIndex(x => x.id === id), j = i + dir;
      if (j < 0 || j >= s.wishlist.length) return;
      [s.wishlist[i], s.wishlist[j]] = [s.wishlist[j], s.wishlist[i]];
    });
    const w = store.get().wishlist;
    announce(t('wish.moved', { name: w.find(x => x.id === id).name, pos: w.findIndex(x => x.id === id) + 1 }));
    requestAnimationFrame(() => document.querySelector(`[data-action="move"][data-id="${id}"][data-dir="${dir}"]`)?.focus());
  },

  subUsed(el) {
    const id = el.dataset.id, used = el.dataset.v === '1';
    const sub = store.get().subs.find(x => x.id === id);
    if (sub.used === null) earn(s => { s.subs.find(x => x.id === id).used = used; }, 'xp.review', 5, t('sub.reviewed', { name: sub.name }));
    else store.update(s => { s.subs.find(x => x.id === id).used = used; });
  },

  subCancel(el) {
    const sub = store.get().subs.find(x => x.id === el.dataset.id);
    earn(s => { s.subs.find(x => x.id === sub.id).cancelled = true; }, 'xp.cut', 20, say('sub.cancelled', { name: sub.name, v: money(sub.amount * 12) }));
  },

  payDebt(el) {
    const d = store.get().debts.find(x => x.id === el.dataset.id);
    earn(s => { s.debts.find(x => x.id === d.id).paid = true; }, 'xp.debt', 50, t('debt.paid'));
  },

  add() {
    const s = store.get();
    const goals = s.goals.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
    openDialog({
      title: t('add.title'), submit: t('add.save'),
      body: `
        <div class="field"><label for="f-kind">${t('add.kind')}</label>
          <select id="f-kind" name="kind">
            <option value="bill">${t('add.bill')}</option>
            <option value="income">${t('add.income')}</option>
            <option value="wish">${t('add.wish')}</option>
            <option value="sub">${t('add.sub')}</option>
          </select></div>
        <div class="field"><label for="f-name">${t('add.name')}</label><input id="f-name" name="name" required autocomplete="off"></div>
        ${moneyInput('amount', t('common.amount'))}
        <div class="field" data-for="bill income"><label for="f-day">${t('add.day')}</label><input id="f-day" name="day" type="number" min="1" max="31" value="10"></div>
        <div class="field" data-for="wish" hidden><label for="f-goal">${t('add.goal')}</label><select id="f-goal" name="goal">${goals}</select></div>`,
      onOpen: dlg => {
        const sel = dlg.querySelector('#f-kind');
        const sync = () => dlg.querySelectorAll('[data-for]').forEach(f => { f.hidden = !f.dataset.for.split(' ').includes(sel.value); });
        sel.addEventListener('change', sync); sync();
      },
      onSubmit: d => {
        const v = num(d.amount); if (!d.name.trim() || !(v > 0)) return false;
        const day = Math.min(31, Math.max(1, +d.day || 1));
        store.update(st => {
          const id = store.uid();
          if (d.kind === 'bill') st.bills.push({ id, name: d.name.trim(), amount: v, day, cat: 'fixo', paid: {} });
          if (d.kind === 'income') st.incomes.push({ id, name: d.name.trim(), kind: 'pj', amount: v, day, account: st.accounts[0].id, endsOn: null });
          if (d.kind === 'wish') st.wishlist.push({ id, name: d.name.trim(), price: v, goal: d.goal, bought: false, addedAt: new Date().toISOString() });
          if (d.kind === 'sub') st.subs.push({ id, name: d.name.trim(), amount: v, used: null, cancelled: false });
        });
        toast(t('add.done', { name: d.name.trim() }));
      },
    });
  },

  editReward(el) {
    const lvl = +el.dataset.level;
    const r = store.get().game.rewards.find(x => x.level === lvl);
    openDialog({
      title: t('game.rewardEdit', { level: lvl }), submit: t('common.save'),
      body: `<div class="field"><label for="f-text">${t('game.rewardLabel')}</label><input id="f-text" name="text" value="${esc(r?.text || '')}" required></div>`,
      onSubmit: d => {
        store.update(s => {
          const x = s.game.rewards.find(y => y.level === lvl);
          if (x) x.text = d.text; else s.game.rewards.push({ level: lvl, text: d.text });
        });
        toast(t('common.saved'));
      },
    });
  },

  template(el) {
    store.reset(el.dataset.t);
    toast(t('tpl.applied'));
  },
  module(el) {
    const m = el.dataset.m;
    store.update(s => { s.modules = s.modules.includes(m) ? s.modules.filter(x => x !== m) : [...s.modules, m]; });
  },
  resetDemo() { store.reset(); toast(t('tpl.reset')); },

  speak() {
    const s = store.get();
    const x = monthSummary(s, ctx.ym);
    const drop = incomeDrop(s, ctx.ym);
    const open = s.bills.filter(b => !b.paid[ctx.ym]).length;
    const lv = levelInfo(s.game.xp);
    let text = t('speak.summary', { m: monthIn(ctx.ym), free: money(x.free), open, level: lv.level, next: lv.toNext });
    if (drop) text += ' ' + t('alert.dropTitle', { m: monthIn(drop.ym), p: Math.round(drop.pct * 100) });
    if (s.mei.enabled) text += ' ' + t('speak.mei', { p: Math.round(meiYear(s).used * 100) });
    speak(text, getPrefs().lang).catch(() => toast(t('a11y.noSpeech')));
    announce(text);
  },

  budget(el) {
    const cat = el.dataset.id;
    const cur = store.get().budgets[cat];
    openDialog({
      title: t('budget.title', { cat: t('cat.' + cat) }), submit: t('common.save'),
      body: moneyInput('amount', t('budget.label'), String(cur).replace('.', ',')) + `<p class="muted">${t('budget.hint')}</p>`,
      onSubmit: d => {
        const v = num(d.amount); if (!(v >= 0)) return false;
        store.update(s => { s.budgets[cat] = v; });
        toast(t('common.saved'));
      },
    });
  },
  wipe() {
    if (store.isReal()) {
      openDialog({
        title: t('acct.delTitle'), submit: t('acct.delDo'),
        body: '<p>' + t('acct.delBody') + '</p>',
        onSubmit: () => {
          cloud.deleteMe()
            .then(() => { store.forgetAccount(); document.dispatchEvent(new CustomEvent('prumo:signout')); toast(t('acct.deleted')); })
            .catch(() => toast(t('acct.delFail')));
        },
      });
      return;
    }
    openDialog({
      title: t('priv.wipeTitle'), submit: t('priv.wipeDo'),
      body: '<p>' + t('priv.wipeBody') + '</p>',
      onSubmit: () => {
        try { ['prumo.state.v1', 'prumo.prefs'].forEach(k => localStorage.removeItem(k)); sessionStorage.removeItem('prumo.session'); } catch (e) { /* ignore */ }
        try { caches.keys().then(ks => ks.forEach(k => caches.delete(k))); navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => r.unregister())); } catch (e) { /* ignore */ }
        store.reset('clt-pj');
        document.dispatchEvent(new CustomEvent('prumo:logout'));
      },
    });
  },
  txDel(el) {
    const x = store.get().tx.find(y => y.id === el.dataset.id);
    const at = store.get().tx.indexOf(x);
    store.update(s => { s.tx = s.tx.filter(y => y.id !== x.id); });
    toast(t('tx.deleted', { name: x.desc }), 0, false, () => store.update(s => { s.tx.splice(at, 0, x); }));
  },

  addInstallment() {
    openDialog({
      title: t('card.add'), submit: t('common.save'),
      body: `<div class="field"><label for="f-name">${t('card.addName')}</label><input id="f-name" name="name" required autocomplete="off"></div>
        ${moneyInput('amount', t('card.addTotal'))}
        <div class="field"><label for="f-n">${t('card.addN')}</label><input id="f-n" name="n" type="number" min="2" max="48" value="10" required></div>`,
      onSubmit: d => {
        const v = num(d.amount), n = Math.min(48, Math.max(2, +d.n || 0));
        if (!d.name.trim() || !(v > 0)) return false;
        store.update(st => { st.installments.push({ id: store.uid(), desc: d.name.trim(), total: v, n, start: ctx.ym, card: (st.cards[0] || {}).id }); });
        toast(say('card.added', { name: d.name.trim(), n, v: money(v / n) }));
      },
    });
  },
  delInstallment(el) {
    const p = store.get().installments.find(x => x.id === el.dataset.id);
    const at = store.get().installments.indexOf(p);
    store.update(s => { s.installments = s.installments.filter(x => x.id !== p.id); });
    toast(t('card.deleted', { name: p.desc }), 0, false, () => store.update(s => { s.installments.splice(at, 0, p); }));
  },
  tone(el) { chooseTone(el.dataset.v); },
  wishPrice(el) {
    const w = store.get().wishlist.find(x => x.id === el.dataset.id);
    openDialog({
      title: t('bf.noteTitle', { name: w.name }), submit: t('common.save'),
      body: `${moneyInput('seen', t('bf.noteSeen')).replace(' required', '')}
        ${moneyInput('target', t('bf.noteTarget'), w.target ? String(w.target).replace('.', ',') : '').replace(' required', '')}
        <p class="muted" style="margin:0;font-size:.86rem">${t('bf.noteHelp')}</p>`,
      onSubmit: d => {
        const v = num(d.seen), tg = num(d.target);
        if (!(v > 0) && !(tg > 0)) return false;
        store.update(st => {
          const x = st.wishlist.find(y => y.id === w.id);
          if (tg > 0) x.target = tg;
          if (v > 0) { x.seen = [...(x.seen || []), { d: new Date().toISOString().slice(0, 10), v }].slice(-24); }
        });
        toast(t('common.saved'));
      },
    });
  },
  feedback() {
    const kinds = ['bug', 'ideia', 'elogio', 'outro'];
    const screen = (location.hash.replace(/^#\/?/, '') || 'inicio').split('?')[0].slice(0, 40);
    openDialog({
      title: t('fb.title'), submit: t('fb.send'),
      body: `<p class="muted" style="margin:0 0 4px">${t('fb.sub')}</p>
        <fieldset class="fb-kinds"><legend>${t('fb.kind')}</legend>${kinds.map((k, n) => `<label class="fb-kind"><input type="radio" name="kind" value="${k}" ${n === 0 ? 'checked' : ''}><span>${t('fb.' + k)}</span></label>`).join('')}</fieldset>
        <div class="field"><label for="f-msg">${t('fb.msg')}</label><textarea id="f-msg" name="message" rows="5" maxlength="4000" required></textarea></div>
        ${store.isReal() ? '' : `<div class="field"><label for="f-contact">${t('fb.contact')}</label><input id="f-contact" name="contact" type="email" autocomplete="email" maxlength="254"></div>`}
        <p class="muted" style="margin:0;font-size:.82rem">${t('fb.privacy')}</p>`,
      onSubmit: d => {
        const message = (d.message || '').trim();
        if (message.length < 3) { document.getElementById('f-msg').focus(); return false; }
        cloud.sendFeedback({ kind: kinds.includes(d.kind) ? d.kind : 'outro', message, screen, contact: (d.contact || '').trim() || null })
          .then(() => toast(t('fb.thanks')))
          .catch(() => { toast(t('fb.fail')); try { localStorage.setItem('prumo.fb.draft', message); } catch (e) { /* ignore */ } });
      },
    });
  },
  addGoal() {
    openDialog({
      title: t('goalNew.title'), submit: t('common.save'),
      body: `<div class="field"><label for="f-name">${t('goalNew.name')}</label><input id="f-name" name="name" required maxlength="60" autocomplete="off" placeholder="${esc(t('goalNew.placeholder'))}"></div>
        ${moneyInput('target', t('goalNew.target'))}
        ${moneyInput('monthly', t('goalNew.monthly')).replace(' required', '')}
        ${moneyInput('saved', t('goalNew.saved')).replace(' required', '')}`,
      onSubmit: d => {
        const target = num(d.target), monthly = num(d.monthly) || 0, saved = num(d.saved) || 0;
        if (!d.name.trim() || !(target > 0)) return false;
        store.update(s => { s.goals.push({ id: 'g' + store.uid(), name: d.name.trim().slice(0, 60), target, saved: Math.max(0, saved), monthly: Math.max(0, monthly), kind: s.goals.length ? 'outro' : 'reserva' }); });
        toast(t('add.done', { name: d.name.trim() }));
      },
    });
  },
  setPw() {
    openDialog({
      title: t('pw.title'), submit: t('common.save'),
      body: `<p class="muted" style="margin:0">${t('pw.sub')}</p>
        <div class="field"><label for="f-pw">${t('pw.new')}</label><input id="f-pw" name="pw" type="password" autocomplete="new-password" minlength="10" required></div>
        <div class="field"><label for="f-pw2">${t('pw.again')}</label><input id="f-pw2" name="pw2" type="password" autocomplete="new-password" minlength="10" required></div>
        <p class="error" id="pw-err" role="alert" hidden></p>`,
      onSubmit: d => {
        const err = document.getElementById('pw-err');
        const bad = d.pw.length < 10 ? t('pw.short') : d.pw !== d.pw2 ? t('pw.diff') : '';
        if (bad) { err.textContent = bad; err.hidden = false; return false; }
        cloud.setPassword(d.pw)
          .then(() => { store.update(s => { s.profile.pwSet = true; }); toast(t('pw.done')); })
          .catch(e => toast(e.status === 422 ? t('pw.weak') : t('pw.fail')));
      },
    });
  },
  welcomeSkip() { store.update(s => { s.profile.onboarded = true; }); toast(t('wel.skipped')); },
  tour() { startTour(); },
  focusQuick() { location.hash = '#inicio'; setTimeout(() => document.getElementById('hq-in')?.focus(), 300); },
  wishDrop(el) {
    const w = store.get().wishlist.find(x => x.id === el.dataset.id);
    earn(s => { s.wishlist = s.wishlist.filter(x => x.id !== w.id); }, 'xp.skip', 15, say('wish.dropped', { name: w.name, v: money(w.price) }));
  },
  ics() { const n = exportIcs(); toast(t('ics.done', { n })); },

  logout() {
    try { sessionStorage.removeItem('prumo.session'); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent(store.isReal() ? 'prumo:signout' : 'prumo:logout'));
  },
};
