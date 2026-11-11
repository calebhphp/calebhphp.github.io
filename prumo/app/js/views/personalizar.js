import { t } from '../i18n.js';
import { TEMPLATES, MODULES } from '../store.js';
import { head } from './parts.js';
import { icon } from '../ui.js';
import { TONES, tone, locked, UNLOCK_LEVEL } from '../tone.js';
import { esc } from '../format.js';

export function render(s) {
  return `${head(t('nav.personalizar'), t('tpl.sub'))}
  <div class="grid">
    <section class="card span-12" aria-labelledby="tp-t">
      <div class="card-head"><h2 id="tp-t">${t('tpl.title')}</h2></div>
      <p class="card-sub">${t('tpl.hint')}</p>
      <div class="tpl-grid">${Object.keys(TEMPLATES).map(k => `<button type="button" class="tpl" data-action="template" data-t="${k}" aria-pressed="${s.template === k}">
        <strong>${t('tpl.' + k)}</strong><span>${t('tpl.' + k + 'Hint')}</span></button>`).join('')}</div>
    </section>
    <section class="card span-12" aria-labelledby="tn-t">
      <div class="card-head"><h2 id="tn-t">${t('tone.title')}</h2></div>
      <p class="card-sub">${t('tone.sub')}</p>
      <div class="tpl-grid tone-grid">${TONES.map(k => {
        const lk = locked(k, s);
        const sample = t('tone.sample' + k.charAt(0).toUpperCase() + k.slice(1));
        return `<button type="button" class="tpl tone-${k}" data-action="tone" data-v="${k}" aria-pressed="${tone() === k}"${lk ? ' aria-disabled="true"' : ''}>
          <strong>${lk ? icon('i-lock') : ''}${t('tone.' + k)}</strong><span>${lk ? t('tone.locked', { n: UNLOCK_LEVEL }) : t('tone.' + k + 'Hint')}</span>
          <q class="tone-q">${esc(sample)}</q></button>`;
      }).join('')}</div>
      <p class="muted small" style="margin:12px 0 0">${t('tone.rules')}</p>
    </section>
    <section class="card span-6" aria-labelledby="md-t">
      <div class="card-head"><h2 id="md-t">${t('tpl.modules')}</h2></div>
      ${MODULES.filter(m => m !== 'inicio').map(m => `<div class="toggle-row"><span id="mod-${m}">${t('nav.' + m)}</span>
        <button type="button" class="switch" role="switch" aria-labelledby="mod-${m}" aria-checked="${s.modules.includes(m)}" data-action="module" data-m="${m}"></button></div>`).join('')}
    </section>
    <section class="card span-6" aria-labelledby="nx-t">
      <div class="card-head"><h2 id="nx-t">${t('tpl.nextTitle')}</h2></div>
      <ul class="rows">${['casa', 'tarefas', 'saude', 'pet', 'carreira'].map(k => `<li><span class="grow"><span class="title">${t('soon.' + k)}</span><span class="meta">${t('soon.' + k + 'Hint')}</span></span><span class="badge">${t('soon.badge')}</span></li>`).join('')}</ul>
      <button class="btn" style="margin-top:14px" data-action="resetDemo">${icon('i-swap')}${t('tpl.resetBtn')}</button>
    </section>
  </div>`;
}
