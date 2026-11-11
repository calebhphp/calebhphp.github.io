import { t } from '../i18n.js';
import { achievements, levelInfo } from '../game.js';
import { esc, dayLabel } from '../format.js';
import { head, levelCard } from './parts.js';
import { icon } from '../ui.js';

export function render(s) {
  const lv = levelInfo(s.game.xp);
  const ach = achievements(s);
  const log = s.game.log.slice(-8).reverse();
  const levels = [...new Set([...s.game.rewards.map(r => r.level), lv.level + 1, lv.level + 2])].filter(l => l > 1).sort((a, b) => a - b);
  return `${head(t('nav.conquistas'), t('game.pageSub'))}
  <div class="grid">
    ${levelCard(s)}
    <section class="card span-8" aria-labelledby="rw-t">
      <div class="card-head"><h2 id="rw-t">${t('game.rewards')}</h2></div>
      <p class="card-sub">${t('game.rewardsSub')}</p>
      <ul class="rows">${levels.map(l => {
        const r = s.game.rewards.find(x => x.level === l);
        const got = lv.level >= l;
        return `<li class="${got ? '' : ''}"><span class="badge ${got ? 'b-xp' : ''}">${icon(got ? 'i-star' : 'i-lock')}${t('game.levelN', { level: l })}</span>
          <span class="grow"><span class="title">${r ? esc(r.text) : `<span class="muted">${t('game.noReward')}</span>`}</span></span>
          <button class="btn btn-sm" data-action="editReward" data-id="r${l}" data-level="${l}">${r ? t('common.edit') : t('game.setReward')}</button></li>`;
      }).join('')}</ul>
    </section>
    <section class="card span-8" aria-labelledby="ach-t">
      <div class="card-head"><h2 id="ach-t">${t('game.badges', { n: ach.filter(a => a.got).length, total: ach.length })}</h2></div>
      <ul class="badges-grid" style="list-style:none;padding:0;margin:0">${ach.map(a => `<li class="ach ${a.got ? '' : 'locked'}">${icon(a.got ? a.icon : 'i-lock')}
        <strong>${t('ach.' + a.id)}</strong><span>${t('ach.' + a.id + 'Hint')}</span><span class="sr-only">${a.got ? t('common.done') : t('common.pending')}</span></li>`).join('')}</ul>
    </section>
    <section class="card span-4" aria-labelledby="log-t">
      <div class="card-head"><h2 id="log-t">${t('game.history')}</h2></div>
      <ul class="rows">${log.map(l => `<li><span class="grow"><span class="title">${t(l.key)}</span><span class="meta">${dayLabel(new Date(l.at + 'T12:00'))}</span></span><span class="badge b-xp">+${l.xp} XP</span></li>`).join('')}</ul>
    </section>
  </div>`;
}
