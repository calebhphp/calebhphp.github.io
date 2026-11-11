// Master panel: people, feedback and waitlist. Every action goes to the server function, which checks the admin again.
import { t } from '../i18n.js';
import { esc } from '../format.js';
import { head } from './parts.js';
import { icon, toast, openDialog } from '../ui.js';
import * as cloud from '../cloud.js';

const PLANS = ['beta', 'free', 'pro', 'master'];
let tab = 'users', data = { users: null, feedback: null, waitlist: null }, err = null, q = '';

const when = d => d ? new Intl.DateTimeFormat(document.documentElement.lang, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';
// 14 characters from a crypto source, no look-alike letters.
export function tempPassword() {
  const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint32Array(14));
  return [...r].map(n => A[n % A.length]).join('');
}

async function load(which = tab) {
  err = null;
  try {
    const r = await cloud.admin(which === 'users' ? 'list' : which);
    data[which] = which === 'users' ? r.users : r.items;
  } catch (e) { err = e.status === 403 ? t('adm.forbidden') : e.status === 404 ? t('adm.noFn') : t('adm.fail'); }
  document.dispatchEvent(new CustomEvent('prumo:render'));
}

function usersTable() {
  const list = (data.users || []).filter(u => !q || u.email.includes(q));
  const me = cloud.user()?.id;
  if (!data.users) return `<p class="muted">${t('sync.loading')}…</p>`;
  return `<div class="table-wrap"><table class="adm-table">
    <thead><tr><th>${t('adm.email')}</th><th>${t('adm.plan')}</th><th>${t('adm.status')}</th><th>${t('adm.last')}</th><th>${t('adm.sync')}</th><th><span class="sr-only">${t('tx.actions')}</span></th></tr></thead>
    <tbody>${list.map(u => `<tr>
      <td><strong>${esc(u.email)}</strong>${u.role === 'admin' ? ` <span class="badge b-xp">admin</span>` : ''}${u.mustChange ? `<br><small class="muted">${t('adm.mustChange')}</small>` : ''}</td>
      <td><span class="badge">${esc(u.plan)}</span>${u.planUntil ? `<br><small class="muted">${t('adm.until', { d: esc(u.planUntil) })}</small>` : ''}</td>
      <td>${u.banned ? `<span class="badge b-bad">${t('adm.blocked')}</span>` : !u.confirmed ? `<span class="badge b-warn">${t('adm.invited')}</span>` : `<span class="badge b-good">${t('adm.active')}</span>`}</td>
      <td>${when(u.last)}</td><td>${when(u.synced)}</td>
      <td class="adm-acts">${u.id === me ? `<small class="muted">${t('adm.you')}</small>` : `
        <button class="btn btn-sm" data-action="admReset" data-id="${u.id}" data-email="${esc(u.email)}">${t('adm.reset')}</button>
        <button class="btn btn-sm" data-action="admTemp" data-id="${u.id}" data-email="${esc(u.email)}">${t('adm.temp')}</button>
        <button class="btn btn-sm" data-action="admPlan" data-id="${u.id}" data-email="${esc(u.email)}" data-plan="${esc(u.plan)}">${t('adm.plan')}</button>
        <button class="btn btn-sm" data-action="admBan" data-id="${u.id}" data-email="${esc(u.email)}" data-on="${u.banned ? '0' : '1'}">${t(u.banned ? 'adm.unblock' : 'adm.block')}</button>
        <button class="btn btn-sm btn-danger" data-action="admDel" data-id="${u.id}" data-email="${esc(u.email)}">${t('adm.del')}</button>`}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="muted">${t('adm.none')}</td></tr>`}</tbody></table></div>`;
}

function feedbackList() {
  if (!data.feedback) return `<p class="muted">${t('sync.loading')}…</p>`;
  return `<ul class="adm-fb">${data.feedback.map(f => `<li>
    <div class="adm-fb-h"><span class="badge">${esc(f.kind)}</span><small class="muted">${when(f.created_at)} · ${esc(f.source)}${f.screen ? ' · ' + esc(f.screen) : ''}${f.contact ? ' · ' + esc(f.contact) : ''}</small></div>
    <p>${esc(f.message)}</p></li>`).join('') || `<li class="muted">${t('adm.none')}</li>`}</ul>`;
}

function waitTable() {
  if (!data.waitlist) return `<p class="muted">${t('sync.loading')}…</p>`;
  return `<p class="muted">${t('adm.waitCount', { n: data.waitlist.length })}</p><div class="table-wrap"><table class="adm-table">
    <thead><tr><th>${t('adm.email')}</th><th>${t('adm.when')}</th></tr></thead>
    <tbody>${data.waitlist.map(w => `<tr><td>${esc(w.email)}</td><td>${when(w.created_at)}</td></tr>`).join('') || `<tr><td colspan="2" class="muted">${t('adm.none')}</td></tr>`}</tbody></table></div>`;
}

export function render() {
  if (data[tab] === null && !err) load();
  const tabs = ['users', 'feedback', 'waitlist'];
  return `${head(t('adm.title'), t('adm.sub'), `<button class="btn btn-primary" data-action="admNew">${icon('i-plus')}${t('adm.new')}</button>`)}
  <div class="grid"><section class="card span-12" aria-labelledby="adm-t">
    <h2 id="adm-t" class="sr-only">${t('adm.title')}</h2>
    <div class="adm-bar">
      <div class="seg" role="tablist">${tabs.map(k => `<button role="tab" class="btn btn-sm" aria-selected="${tab === k}" data-action="admTab" data-v="${k}">${t('adm.tab.' + k)}</button>`).join('')}</div>
      ${tab === 'users' ? `<label class="sr-only" for="adm-q">${t('adm.search')}</label><input id="adm-q" type="search" placeholder="${esc(t('adm.search'))}" value="${esc(q)}">` : ''}
      <button class="btn btn-sm btn-ghost" data-action="admReload">${icon('i-swap')}${t('adm.reload')}</button>
    </div>
    ${err ? `<div class="alert alert-bad" role="alert">${esc(err)}</div>` : tab === 'users' ? usersTable() : tab === 'feedback' ? feedbackList() : waitTable()}
  </section></div>`;
}

export function mount(root) {
  const s = root.querySelector('#adm-q');
  if (s) s.addEventListener('input', () => { q = s.value.trim().toLowerCase(); const pos = s.selectionStart; document.dispatchEvent(new CustomEvent('prumo:render')); setTimeout(() => { const n = document.getElementById('adm-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); });
}

const run = async (action, body, ok) => {
  try { await cloud.admin(action, body); toast(ok); await load('users'); }
  catch (e) { toast(e.status === 403 ? t('adm.forbidden') : t('adm.failMsg', { m: (e.data && e.data.error) || e.message })); }
};
const copyBox = pw => `<div class="field"><label for="f-tmp">${t('adm.tempLabel')}</label><div class="pw"><input id="f-tmp" name="password" value="${pw}" readonly autocomplete="off" spellcheck="false"><button type="button" class="btn btn-sm" data-copy>${t('adm.copy')}</button></div></div>
  <p class="muted" style="margin:0;font-size:.85rem">${t('adm.tempHint')}</p>`;
const bindCopy = dlg => dlg.querySelector('[data-copy]')?.addEventListener('click', () => { navigator.clipboard?.writeText(dlg.querySelector('#f-tmp').value); toast(t('adm.copied')); });

export const adminActions = {
  admTab(el) { tab = el.dataset.v; err = null; if (!data[tab]) load(tab); else document.dispatchEvent(new CustomEvent('prumo:render')); },
  admReload() { data[tab] = null; load(tab); },
  admNew() {
    const pw = tempPassword();
    openDialog({
      title: t('adm.new'), submit: t('adm.create'),
      body: `<div class="field"><label for="f-email">${t('adm.email')}</label><input id="f-email" name="email" type="email" required autocomplete="off" maxlength="254"></div>
        <div class="field"><label for="f-plan">${t('adm.plan')}</label><select id="f-plan" name="plan">${PLANS.filter(p => p !== 'master').map(p => `<option>${p}</option>`).join('')}</select></div>
        <fieldset class="fb-kinds"><legend>${t('adm.how')}</legend>
          <label class="fb-kind"><input type="radio" name="mode" value="temp" checked><span>${t('adm.howTemp')}</span></label>
          <label class="fb-kind"><input type="radio" name="mode" value="invite"><span>${t('adm.howInvite')}</span></label></fieldset>
        <div data-temp>${copyBox(pw)}</div>`,
      onOpen: dlg => {
        bindCopy(dlg);
        dlg.querySelectorAll('[name=mode]').forEach(r => r.addEventListener('change', () => { dlg.querySelector('[data-temp]').hidden = dlg.querySelector('[name=mode]:checked').value !== 'temp'; }));
      },
      onSubmit: d => {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || '')) return false;
        run('create', { email: d.email, plan: d.plan, mode: d.mode, password: d.mode === 'temp' ? pw : undefined }, t(d.mode === 'temp' ? 'adm.createdTemp' : 'adm.createdInvite', { email: d.email }));
      },
    });
  },
  admReset(el) {
    openDialog({ title: t('adm.resetTitle', { email: el.dataset.email }), submit: t('adm.resetDo'), body: `<p>${t('adm.resetBody')}</p>`,
      onSubmit: () => { run('reset', { id: el.dataset.id }, t('adm.resetSent')); } });
  },
  admTemp(el) {
    const pw = tempPassword();
    openDialog({ title: t('adm.tempTitle', { email: el.dataset.email }), submit: t('adm.tempDo'), body: copyBox(pw), onOpen: bindCopy,
      onSubmit: () => { run('tempPw', { id: el.dataset.id, password: pw }, t('adm.tempDone')); } });
  },
  admPlan(el) {
    openDialog({ title: t('adm.planTitle', { email: el.dataset.email }), submit: t('common.save'),
      body: `<div class="field"><label for="f-plan">${t('adm.plan')}</label><select id="f-plan" name="plan">${PLANS.map(p => `<option ${p === el.dataset.plan ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="field"><label for="f-until">${t('adm.untilLabel')}</label><input id="f-until" name="until" type="date"></div>`,
      onSubmit: d => { run('plan', { id: el.dataset.id, plan: d.plan, until: d.until || null }, t('adm.planDone')); } });
  },
  admBan(el) {
    const on = el.dataset.on === '1';
    openDialog({ title: t(on ? 'adm.blockTitle' : 'adm.unblockTitle', { email: el.dataset.email }), submit: t(on ? 'adm.block' : 'adm.unblock'), body: `<p>${t(on ? 'adm.blockBody' : 'adm.unblockBody')}</p>`,
      onSubmit: () => { run('ban', { id: el.dataset.id, on }, t(on ? 'adm.blocked' : 'adm.active')); } });
  },
  admDel(el) {
    openDialog({ title: t('adm.delTitle', { email: el.dataset.email }), submit: t('adm.del'),
      body: `<p>${t('adm.delBody')}</p><div class="field"><label for="f-confirm">${t('adm.delConfirm', { email: esc(el.dataset.email) })}</label><input id="f-confirm" name="confirm" autocomplete="off" spellcheck="false"></div>`,
      onSubmit: d => { if ((d.confirm || '').trim().toLowerCase() !== el.dataset.email) return false; run('delete', { id: el.dataset.id }, t('adm.deleted')); } });
  },
};
