// Quick entry: type or speak a whole day of spending, or drop a bank statement.
import { t } from '../i18n.js';
import * as store from '../store.js';
import { spending, favorites } from '../finance.js';
import { money, moneyHtml, pct, esc, isoDay, ymOf, dayLabel } from '../format.js';
import { CATS, parseQuick, parseCSV, parseOFX } from '../quick.js';
import { head } from './parts.js';
import { icon, toast, announce } from '../ui.js';
import { earn } from '../actions.js';
import { hasAI, askAI, listen, canListen } from '../ai.js';
import { getPrefs } from '../prefs.js';
import { say } from '../tone.js';

// Draft survives re-renders of the view (store changes re-render everything).
const draft = { text: '', rows: [], source: null, listening: false, stop: null, aiBusy: false };

const catOpts = sel => CATS.map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${t('cat.' + c)}</option>`).join('');

function previewHtml() {
  if (!draft.rows.length) return '';
  const total = draft.rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  return `<div class="preview" aria-labelledby="pv-t">
    <div class="card-head" style="margin:18px 0 8px"><h3 id="pv-t">${t('quick.preview', { n: draft.rows.length })}</h3><span class="amt">${money(total)}</span></div>
    <ul class="rows qrows">${draft.rows.map((r, i) => `<li>
      <label class="sr-only" for="q-d-${i}">${t('add.name')}</label>
      <input class="qin grow" id="q-d-${i}" data-q="desc" data-i="${i}" value="${esc(r.desc)}">
      <label class="sr-only" for="q-c-${i}">${t('quick.category')}</label>
      <select class="qin" id="q-c-${i}" data-q="cat" data-i="${i}">${catOpts(r.cat)}</select>
      <label class="sr-only" for="q-a-${i}">${t('common.amount')}</label>
      <input class="qin qamt" id="q-a-${i}" data-q="amount" data-i="${i}" inputmode="decimal" value="${esc((typeof r.amount === 'number' && !Number.isInteger(r.amount) ? r.amount.toFixed(2) : String(r.amount)).replace('.', ','))}">
      ${r.n > 1 ? `<span class="badge b-xp">${t('card.inN', { n: r.n })}</span>` : ''}
      <button type="button" class="btn btn-ghost btn-sm icon-btn" data-q="remove" data-i="${i}" aria-label="${esc(t('quick.remove', { name: r.desc }))}">${icon('i-x')}</button>
    </li>`).join('')}</ul>
    <div class="qactions">
      <button type="button" class="btn btn-primary" data-q="save">${icon('i-check')}${t('quick.save', { n: draft.rows.length })}</button>
      ${hasAI() ? `<button type="button" class="btn" data-q="ai" ${draft.aiBusy ? 'disabled' : ''}>${icon('i-spark')}${draft.aiBusy ? t('ai.thinking') : t('quick.aiFix')}</button>` : ''}
      <button type="button" class="btn btn-ghost" data-q="clear">${t('quick.clear')}</button>
    </div></div>`;
}

export function render(s, ctx) {
  const sp = spending(s, ctx.ym);
  const favs = favorites(s);
  const timePct = Math.round(sp.elapsed * 100);
  const pace = sp.pace > sp.elapsed + 0.1 ? 'warn' : 'good';
  return `${head(t('nav.gastos'), t('quick.sub'))}
  <div class="grid">
    <section class="card card-hero span-7" aria-labelledby="q-t">
      <h2 id="q-t" class="q-title">${t('quick.title')}</h2>
      <label for="quick-text" class="sr-only">${t('quick.title')}</label>
      <div class="q-box">
        <textarea id="quick-text" rows="3" placeholder="${esc(t('quick.placeholder'))}" aria-describedby="q-hint">${esc(draft.text)}</textarea>
        <div class="q-tools">
          ${canListen() ? `<button type="button" class="btn ${draft.listening ? 'btn-primary rec' : ''}" data-q="mic" aria-pressed="${draft.listening}">${icon('i-mic')}${draft.listening ? t('quick.stop') : t('quick.speak')}</button>` : ''}
          <button type="button" class="btn btn-primary" data-q="parse">${t('quick.parse')}</button>
        </div>
      </div>
      <p id="q-hint" class="muted q-hint">${t('quick.hint')}</p>
      <div id="q-preview" aria-live="polite">${previewHtml()}</div>
      ${favs.length ? `<div class="q-favs"><h3>${t('quick.repeat')}</h3><div class="chips">${favs.map((f, i) =>
        `<button type="button" class="chip" data-q="fav" data-i="${i}">${esc(f.desc)} <b>${money(f.amount)}</b></button>`).join('')}</div></div>` : ''}
      <div class="q-import">
        <label class="btn" for="q-file">${icon('i-in')}${t('quick.import')}</label>
        <input type="file" id="q-file" accept=".ofx,.csv,.txt" class="sr-only">
        <span class="muted">${t('quick.importHint')}</span>
      </div>
    </section>

    <section class="card span-5" aria-labelledby="pace-t">
      <div class="card-head"><h2 id="pace-t">${t('pace.title')}</h2><span class="badge ${pace === 'good' ? 'b-good' : 'b-warn'}">${icon(pace === 'good' ? 'i-check' : 'i-alert')}${t(pace === 'good' ? 'pace.ok' : 'pace.fast')}</span></div>
      ${moneyHtml(sp.spent, 'money-l')} <span class="muted">${t('pace.of', { v: money(sp.budget) })}</span>
      <div class="pace-meter" role="img" aria-label="${esc(t('pace.aria', { spent: pct(sp.pace), time: timePct + '%' }))}">
        <div class="meter ${pace}"><i style="width:${Math.min(100, sp.pace * 100)}%"></i><span class="mark" style="left:${timePct}%"></span></div>
        <div class="meter-scale"><span>${t('pace.spent', { p: pct(sp.pace) })}</span><span>${t('pace.month', { p: timePct + '%' })}</span></div>
      </div>
      <p class="pace-day">${sp.perDayLeft >= 0 ? t('pace.perDay', { v: `<strong>${money(sp.perDayLeft)}</strong>`, d: sp.daysLeft }) : t('pace.over', { v: money(-sp.perDayLeft * sp.daysLeft) })}</p>
      <ul class="rows cats">${sp.cats.map(c => `<li>
        <span class="grow"><span class="goal-row"><span class="title">${t('cat.' + c.cat)}</span><span class="meta">${money(c.spent)} / ${money(c.budget)}</span></span>
        <span class="meter thin ${c.level}" role="progressbar" aria-label="${esc(t('cat.' + c.cat))}" aria-valuemin="0" aria-valuemax="${c.budget}" aria-valuenow="${Math.round(c.spent)}"><i style="width:${Math.min(100, c.used * 100)}%"></i><span class="mark" style="left:${timePct}%"></span></span></span>
        <button type="button" class="btn btn-ghost btn-sm" data-action="budget" data-id="${c.cat}" aria-label="${esc(t('budget.editAria', { cat: t('cat.' + c.cat) }))}">${t('common.edit')}</button></li>`).join('')}</ul>
    </section>

    <section class="card span-12" aria-labelledby="tx-t">
      <div class="card-head"><h2 id="tx-t">${t('tx.title', { n: sp.list.length })}</h2><a class="link" href="#dados">${t('priv.csvShort')}</a></div>
      ${sp.list.length ? `<div class="table-wrap"><table class="data tx"><thead><tr><th scope="col">${t('tx.date')}</th><th scope="col">${t('add.name')}</th><th scope="col">${t('quick.category')}</th><th scope="col" class="n">${t('common.amount')}</th><th scope="col"><span class="sr-only">${t('tx.actions')}</span></th></tr></thead>
      <tbody>${sp.list.slice(0, 40).map(x => `<tr><td>${dayLabel(new Date(x.date + 'T12:00'))}</td><td>${esc(x.desc)}</td><td><span class="badge">${t('cat.' + x.cat)}</span></td><td class="n">${money(x.amount)}</td>
        <td class="n"><button type="button" class="btn btn-ghost btn-sm icon-btn" data-action="txDel" data-id="${x.id}" aria-label="${esc(t('tx.delete', { name: x.desc }))}">${icon('i-x')}</button></td></tr>`).join('')}</tbody></table></div>`
        : `<p class="empty">${t('tx.empty')}</p>`}
    </section>
  </div>`;
}

function saveRows(rows, ym, source) {
  const valid = rows.map(r => ({ ...r, amount: Number(String(r.amount).replace(',', '.')) })).filter(r => r.desc && r.amount > 0);
  if (!valid.length) return;
  const today = ymOf(new Date()) === ym ? isoDay(new Date()) : `${ym}-01`;
  const total = valid.reduce((a, r) => a + r.amount, 0);
  earn(s => {
    for (const r of valid) store.pushRow(s, { ...r, cat: CATS.includes(r.cat) ? r.cat : 'outros' }, r.date && r.date.startsWith(ym) ? r.date : (r.date || today));
  }, 'xp.log', Math.min(30, 5 + valid.length * 3), (source === 'import' ? t : say)(source === 'import' ? 'quick.imported' : 'quick.saved', { n: valid.length, v: money(total) }));
}

let live = null;

export function mount(root, s, ctx) {
  // #main outlives every render: drop the listeners of the previous mount before adding new ones.
  if (live) live.abort();
  live = new AbortController();
  const on = { signal: live.signal };
  const ta = root.querySelector('#quick-text');
  const box = root.querySelector('#q-preview');
  const refresh = () => { box.innerHTML = previewHtml(); };
  ta.addEventListener('input', () => { draft.text = ta.value; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); root.querySelector('[data-q="parse"]').click(); } });

  root.querySelector('#q-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5e6) { toast(t('quick.tooBig')); e.target.value = ''; return; }
    const text = await f.text();
    const rows = /<OFX>|<STMTTRN>/i.test(text) ? parseOFX(text) : parseCSV(text);
    draft.rows = rows; draft.source = 'import';
    refresh();
    announce(rows.length ? t('quick.found', { n: rows.length }) : t('quick.importEmpty'));
    e.target.value = '';
  });

  root.addEventListener('input', e => {
    const el = e.target.closest('[data-q][data-i]');
    if (!el || el.tagName === 'BUTTON') return;
    const r = draft.rows[+el.dataset.i];
    if (r) r[el.dataset.q] = el.value;
  }, on);

  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-q]');
    if (!b) return;
    const q = b.dataset.q;
    if (q === 'parse') {
      draft.rows = parseQuick(ta.value); draft.source = 'text';
      refresh();
      announce(draft.rows.length ? t('quick.found', { n: draft.rows.length }) : t('quick.none'));
      if (draft.rows.length) box.querySelector('[data-q="save"]').focus();
    }
    if (q === 'remove') { draft.rows.splice(+b.dataset.i, 1); refresh(); box.querySelector('[data-q]')?.focus(); }
    if (q === 'clear') { draft.rows = []; draft.text = ''; ta.value = ''; refresh(); ta.focus(); }
    if (q === 'save') {
      const rows = draft.rows, src = draft.source;
      draft.rows = []; draft.text = '';
      saveRows(rows, ctx.ym, src);
    }
    if (q === 'fav') {
      // n here is how often the entry was used, not a number of installments: leave it out.
      const { n, ...f } = favorites(store.get())[+b.dataset.i];
      saveRows([{ ...f }], ctx.ym, 'text');
    }
    if (q === 'mic') {
      if (draft.listening) { draft.stop && draft.stop(); return; }
      const base = ta.value ? ta.value + ', ' : '';
      draft.listening = true;
      b.setAttribute('aria-pressed', 'true'); b.classList.add('btn-primary', 'rec');
      b.lastChild.textContent = t('quick.stop');
      draft.stop = listen({
        lang: getPrefs().lang,
        onText: txt => { ta.value = base + txt; draft.text = ta.value; },
        onEnd: () => {
          draft.listening = false; draft.stop = null;
          b.setAttribute('aria-pressed', 'false'); b.classList.remove('btn-primary', 'rec');
          b.lastChild.textContent = t('quick.speak');
          if (ta.value.trim()) root.querySelector('[data-q="parse"]').click();
        },
      });
    }
    if (q === 'ai') {
      draft.aiBusy = true; refresh();
      try {
        const prompt = `Você organiza gastos pessoais. Corrija e categorize a lista abaixo. Categorias permitidas: ${CATS.join(', ')}.
Texto original digitado ou falado pela pessoa: """${ta.value.slice(0, 2000)}"""
Leitura automática atual (JSON): ${JSON.stringify(draft.rows.map(({ desc, amount, cat, date }) => ({ desc, amount, cat, date })))}
Responda só com um array JSON de objetos {"desc": string curta com inicial maiúscula, "amount": número, "cat": uma das categorias, "date": "AAAA-MM-DD" ou null}. Junte itens duplicados só se forem claramente o mesmo gasto. Não invente gastos.`;
        const rows = await askAI(prompt, { json: true });
        if (Array.isArray(rows) && rows.length) draft.rows = rows.map(r => ({ desc: String(r.desc || ''), amount: Number(r.amount) || 0, cat: CATS.includes(r.cat) ? r.cat : 'outros', date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null }));
        announce(t('quick.aiDone'));
      } catch (err) {
        if (err && err.code !== 'cancelled') toast(t('ai.error'));
      }
      draft.aiBusy = false; refresh();
    }
  }, on);
}
