// First access of a beta account: what to set up, in order, each step ticking itself off. Always skippable.
import { t } from '../i18n.js';
import { esc } from '../format.js';
import { icon, ico3d } from '../ui.js';
const ICO = {"pw":"lock","income":"wallet","bills":"calender","budget":"target","first":"chat-bubble","goal":"money-bag"};

export function steps(s) {
  const list = [];
  if (s.profile.firstLogin) list.push({ k: 'pw', done: !!s.profile.pwSet, act: 'data-action="setPw"' });
  list.push(
    { k: 'income', done: s.incomes.length > 0, act: 'href="#entradas"' },
    { k: 'bills', done: s.bills.length > 0, act: 'href="#contas"' },
    { k: 'budget', done: Object.values(s.budgets).some(v => v > 0), act: 'href="#gastos"' },
    { k: 'first', done: s.tx.length > 0, act: 'data-action="focusQuick"' },
    { k: 'goal', done: s.goals.length > 0, act: 'data-action="addGoal"' },
  );
  return list;
}

export function welcomeCard(s, real) {
  if (!real || s.profile.onboarded) return '';
  const list = steps(s);
  const done = list.filter(x => x.done).length;
  const all = done === list.length;
  const first = (s.profile.name || '').split(' ')[0];
  return `<section class="card span-12 welcome" aria-labelledby="wel-t">
    <div class="wel-head">
      ${ico3d(all ? 'trophy' : 'rocket', 72, 'wel-art')}
      <div class="grow">
        <p class="wel-kicker">${t('wel.kicker', { n: done, total: list.length })}</p>
        <h2 id="wel-t">${all ? t('wel.allDone') : t('wel.title', { name: esc(first) })}</h2>
        <p class="muted">${all ? t('wel.allSub') : t('wel.sub')}</p>
      </div>
      <div class="wel-cta">
        ${all ? '' : `<button class="btn" data-action="tour">${icon('i-spark')}${t('wel.tour')}</button>`}
        <button class="btn btn-ghost" data-action="welcomeSkip">${t(all ? 'wel.close' : 'wel.skip')}</button>
      </div>
    </div>
    <div class="meter xp wel-bar" role="progressbar" aria-label="${esc(t('wel.progress'))}" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${done}"><i style="width:${done / list.length * 100}%"></i></div>
    <ol class="wel-steps">${list.map((x, i) => `<li class="${x.done ? 'is-done' : ''}">
      <span class="wel-n" aria-hidden="true">${x.done ? icon('i-check') : ico3d(ICO[x.k], 34)}</span>
      <span class="grow"><strong>${t('wel.' + x.k)}</strong><small>${t('wel.' + x.k + 'Hint')}</small></span>
      ${x.done ? `<span class="sr-only">${t('common.done')}</span>` : x.act.startsWith('href') ? `<a class="btn btn-sm" ${x.act}>${t('wel.go')}</a>` : `<button class="btn btn-sm" ${x.act}>${t('wel.go')}</button>`}
    </li>`).join('')}</ol>
  </section>`;
}
