// Advisor screen: findings computed locally on the left, the shared chat on the right.
import { t } from '../i18n.js';
import { insights } from '../finance.js';
import { money, pct, monthIn } from '../format.js';
import { head } from './parts.js';
import { icon } from '../ui.js';
import { hasAI } from '../ai.js';
import { chatHtml, mountChat } from '../advisor.js';
import { say } from '../tone.js';

export function insightText(i) {
  const map = {
    // Pets and health never get roasted.
    catHot: () => (['pet', 'saude'].includes(i.cat) ? t : say)('ins.catHot', { cat: t('cat.' + i.cat), p: pct(i.used), d: i.days, left: money(Math.max(0, i.left)) }),
    perDay: () => say(i.v >= 0 ? 'ins.perDay' : 'ins.perDayOver', { v: money(Math.abs(i.v)), d: i.days }),
    drop: () => t('ins.drop', { m: monthIn(i.ym), gap: money(i.gap), per: money(i.perMonth) }),
    subs: () => say('ins.subs', { n: i.n, v: money(i.v) }),
    debt: () => t('ins.debt', { v: money(i.v), w: i.weeks }),
    mei: () => t('ins.mei', { v: money(i.v) }),
    runway: () => t('ins.runway', { n: String(i.months).replace('.', ','), m: monthIn(i.ym), gap: money(i.gap) }),
    fx: () => say('ins.fx', { v: money(i.v), up: money(i.up) }),
  };
  return map[i.k] ? map[i.k]() : '';
}
const insightLink = { catHot: '#gastos', perDay: '#gastos', drop: '#entradas', subs: '#assinaturas', debt: '#inicio', mei: '#mei', fx: '#assinaturas', runway: '#entradas' };

export function insightList(s, ym, n = 6) {
  return `<ul class="insights">${insights(s, ym).slice(0, n).map(i => `<li class="ins ins-${i.level}">
    <span class="ins-dot" aria-hidden="true"></span><p>${insightText(i)}</p>
    <a class="link" href="${insightLink[i.k]}">${t('ins.open')}</a></li>`).join('')}</ul>`;
}

let detach = null;

export function render(s, ctx) {
  return `${head(t('nav.conselheiro'), t('ai.sub'))}
  <div class="grid">
    <section class="card span-5" aria-labelledby="see-t">
      <div class="card-head"><h2 id="see-t">${t('ai.seeing')}</h2></div>
      ${insightList(s, ctx.ym)}
    </section>
    <section class="card span-7 chat" id="page-chat" aria-labelledby="chat-t">
      <div class="card-head"><h2 id="chat-t">${t('ai.chatTitle')}</h2>
        <span class="badge ai-state ${hasAI() ? 'b-xp' : ''}">${icon(hasAI() ? 'i-spark' : 'i-chat')}${t(hasAI() ? 'ai.live' : 'ai.offline')}</span></div>
      ${chatHtml('pc')}
      ${hasAI() ? '' : `<p class="muted small">${t('ai.offlineHint')}</p>`}
    </section>
  </div>`;
}

export function mount(root) {
  if (detach) detach();
  detach = mountChat(root.querySelector('#page-chat'));
}
