import { t } from '../i18n.js';
import { achievements, levelInfo, missionsToday, streak } from '../game.js';
import { esc, dayLabel } from '../format.js';
import { head } from './parts.js';
import { icon, ico3d } from '../ui.js';
const ART = {"first":"tick","streak7":"fire","half":"money-bag","cut":"scissor","clean":"star","buy":"bag","das":"calculator","lvl5":"trophy"};

function top(s) {
  const lv = levelInfo(s.game.xp);
  return `<div class="grid home-radar"><section class="game-hero span-12" aria-label="${esc(t('game.level', { level: lv.level }))}"><div class="gh-art">${ico3d('trophy', 150)}<span class="gh-lvl">${lv.level}</span></div></section></div>`;
}

function xpCard(s) {
  const lv = levelInfo(s.game.xp);
  const next = s.game.rewards.filter(r => r.level > lv.level).sort((a, b) => a.level - b.level)[0];
  return `<section class="card span-12 xp-card" aria-labelledby="lvl-t">
    <div class="fc-top"><div><h2 id="lvl-t">${t('game.level', { level: lv.level })}</h2><p class="fc-sub">${t('game.toNext', { xp: lv.toNext, level: lv.level + 1 })}</p></div>${ico3d('rocket', 56)}</div>
    <div class="fc-bar" role="progressbar" aria-label="${esc(t('game.progress'))}" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}"><b style="width:${(lv.pct * 100).toFixed(1)}%"></b></div>
    ${next ? `<p class="fc-msg">${ico3d('medal', 24)} ${t('game.nextReward', { level: next.level, reward: '<strong>' + esc(next.text) + '</strong>' })}</p>` : ''}
  </section>`;
}

function streakMissions(s) {
  const st = streak(s);
  const ms = missionsToday(s);
  return `<section class="card span-6 g-streak" aria-labelledby="stk-t">
    <div class="card-head"><h2 id="stk-t">${t('game.streak', { n: st.count })}</h2>${ico3d('fire', 44)}</div>
    <div class="streak" aria-label="${esc(t('game.streakAria', { n: st.last7.filter(Boolean).length }))}" role="img">${st.last7.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')}</div>
  </section>
  <section class="card span-6 g-missions" aria-labelledby="mis-t">
    <div class="card-head"><h2 id="mis-t">${t('game.missions')}</h2>${ico3d('target', 44)}</div>
    <ul class="missions">${ms.map(m => `<li class="${m.done ? 'done' : ''}"><span class="tick" aria-hidden="true">${icon('i-check')}</span><span>${t(m.label)}</span><span class="sr-only">${m.done ? t('common.done') : t('common.pending')}</span><span class="badge b-xp xp">+${m.xp} XP</span></li>`).join('')}</ul>
  </section>`;
}

export function render(s) {
  const lv = levelInfo(s.game.xp);
  const ach = achievements(s);
  const log = s.game.log.slice(-8).reverse();
  const levels = [...new Set([...s.game.rewards.map(r => r.level), lv.level + 1, lv.level + 2])].filter(l => l > 1).sort((a, b) => a - b);
  return `${top(s)}${head(t('nav.conquistas'), t('game.pageSub'))}
  <div class="grid">
    ${xpCard(s)}
    ${streakMissions(s)}
    <section class="card span-8" aria-labelledby="rw-t">
      <div class="card-head"><h2 id="rw-t">${t('game.rewards')}</h2></div>
      <p class="card-sub">${t('game.rewardsSub')}</p>
      <ul class="rows">${levels.map(l => {
        const r = s.game.rewards.find(x => x.level === l);
        const got = lv.level >= l;
        return `<li class="${got ? 'reward-got' : 'reward-lock'}"><span class="i3d-tile ${got ? '' : 'is-locked'}">${ico3d('gift', 36)}</span><span class="badge ${got ? 'b-xp' : ''}">${t('game.levelN', { level: l })}</span>
          <span class="grow"><span class="title">${r ? esc(r.text) : `<span class="muted">${t('game.noReward')}</span>`}</span></span>
          <button class="btn btn-sm" data-action="editReward" data-id="r${l}" data-level="${l}">${r ? t('common.edit') : t('game.setReward')}</button></li>`;
      }).join('')}</ul>
    </section>
    <section class="card span-8" aria-labelledby="ach-t">
      <div class="card-head"><h2 id="ach-t">${t('game.badges', { n: ach.filter(a => a.got).length, total: ach.length })}</h2></div>
      <ul class="badges-grid" style="list-style:none;padding:0;margin:0">${ach.map(a => `<li class="ach ${a.got ? 'is-got' : 'locked'}"><span class="i3d-tile ${a.got ? '' : 'is-locked'}">${ico3d(ART[a.id], 40)}</span>
        <strong>${t('ach.' + a.id)}</strong><span>${t('ach.' + a.id + 'Hint')}</span>${!a.got && a.of ? `<span class="ach-prog" role="progressbar" aria-label="${esc(t('ach.' + a.id))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(a.p * 100)}"><i style="width:${Math.round(a.p * 100)}%"></i><em>${a.of}</em></span>` : ''}<span class="sr-only">${a.got ? t('common.done') : t('common.pending')}</span></li>`).join('')}</ul>
    </section>
    <section class="card span-4" aria-labelledby="log-t">
      <div class="card-head"><h2 id="log-t">${t('game.history')}</h2></div>
      <ul class="rows">${log.map(l => `<li><span class="grow"><span class="title">${t(l.key)}</span><span class="meta">${dayLabel(new Date(l.at + 'T12:00'))}</span></span><span class="badge b-xp">+${l.xp} XP</span></li>`).join('')}</ul>
    </section>
  </div>`;
}
