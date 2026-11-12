import { t } from '../i18n.js';
import { TEMPLATES, MODULES , isReal } from '../store.js';
import { head } from './parts.js';
import { icon } from '../ui.js';
import { TONES, tone, locked, UNLOCK_LEVEL } from '../tone.js';
import { esc } from '../format.js';
import * as store from '../store.js';
import { getPrefs, setPref } from '../prefs.js';
import { toast } from '../ui.js';

const TX = {
  pt: { title: 'Seu perfil', sub: 'Como o app fala com você e como ele aparece.', photo: 'Foto', pick: 'Escolher foto', remove: 'Remover', name: 'Nome', nick: 'Apelido (é como eu te chamo)', nickPh: 'ex.: Mat', theme: 'Tema', auto: 'Sistema', light: 'Claro', dark: 'Escuro', accent: 'Cor de destaque', hide: 'Ocultar valores', hideHint: 'Borra os valores da tela. Passe o mouse ou toque para ver.', saved: 'Perfil salvo', big: 'Foto muito pesada, escolha outra', colors: { latao: 'Latão', verde: 'Verde', azul: 'Azul', rosa: 'Rosa', roxo: 'Roxo' } },
  en: { title: 'Your profile', sub: 'How the app talks to you and how it looks.', photo: 'Photo', pick: 'Choose photo', remove: 'Remove', name: 'Name', nick: 'Nickname (what I call you)', nickPh: 'e.g. Mat', theme: 'Theme', auto: 'System', light: 'Light', dark: 'Dark', accent: 'Accent color', hide: 'Hide amounts', hideHint: 'Blurs the amounts on screen. Hover or tap to reveal.', saved: 'Profile saved', big: 'Photo too large, pick another', colors: { latao: 'Brass', verde: 'Green', azul: 'Blue', rosa: 'Pink', roxo: 'Purple' } },
};
const tx = () => TX[getPrefs().lang === 'en' ? 'en' : 'pt'];
const ACCENTS = { latao: '#e0b25a', verde: '#4cc98a', azul: '#6aa6ff', rosa: '#ff8fb1', roxo: '#b9a2ff' };

function profileCard(s) {
  const x = tx();
  const pr = getPrefs();
  const ini = esc(((s.profile.nick || s.profile.name || 'P')[0] || 'P').toUpperCase());
  return `<section class="card span-12 profile-card" aria-labelledby="pf-t">
    <div class="card-head"><h2 id="pf-t">${x.title}</h2></div>
    <p class="card-sub">${x.sub}</p>
    <div class="pf-grid">
      <div class="pf-photo">
        <span class="pf-avatar">${s.profile.avatar ? `<img src="${s.profile.avatar}" alt="" width="96" height="96">` : `<b aria-hidden="true">${ini}</b>`}</span>
        <div class="pf-btns"><label class="btn btn-sm">${x.pick}<input type="file" accept="image/*" data-pf-photo hidden></label>${s.profile.avatar ? `<button type="button" class="btn btn-sm" data-pf-clear>${x.remove}</button>` : ''}</div>
      </div>
      <div class="pf-fields">
        <label>${x.name}<input type="text" maxlength="60" value="${esc(s.profile.name || '')}" data-pf-name autocomplete="name"></label>
        <label>${x.nick}<input type="text" maxlength="24" value="${esc(s.profile.nick || '')}" placeholder="${x.nickPh}" data-pf-nick></label>
      </div>
    </div>
    <div class="pf-row"><span id="pf-th">${x.theme}</span>
      <div class="seg" role="group" aria-labelledby="pf-th">${['auto', 'light', 'dark'].map(k => `<button type="button" class="seg-b" data-pf-theme="${k}" aria-pressed="${pr.theme === k}">${x[k]}</button>`).join('')}</div></div>
    <div class="pf-row"><span id="pf-ac">${x.accent}</span>
      <div class="swatches" role="group" aria-labelledby="pf-ac">${Object.entries(ACCENTS).map(([k, c]) => `<button type="button" class="sw" style="--c:${c}" data-pf-accent="${k}" aria-pressed="${(pr.accent || 'latao') === k}" aria-label="${x.colors[k]}" title="${x.colors[k]}"></button>`).join('')}</div></div>
    <div class="toggle-row"><span id="pf-hd">${x.hide}<small class="muted" style="display:block">${x.hideHint}</small></span>
      <button type="button" class="switch" role="switch" aria-labelledby="pf-hd" aria-checked="${!!pr.hide}" data-pf-hide></button></div>
  </section>`;
}

// Square crop, small JPEG: a photo here is only a face on a chip, never more than a few KB.
function shrink(file) {
  return new Promise((ok, no) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const n = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      c.getContext('2d').drawImage(img, (img.width - n) / 2, (img.height - n) / 2, n, n, 0, 0, 160, 160);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('img')); };
    img.src = url;
  });
}

export function mount(root) {
  const x = tx();
  const save = (patch) => { store.update(st => { Object.assign(st.profile, patch); }); toast(x.saved); };
  root.querySelector('[data-pf-name]')?.addEventListener('change', e => { const v = e.target.value.trim(); if (v) save({ name: v }); });
  root.querySelector('[data-pf-nick]')?.addEventListener('change', e => save({ nick: e.target.value.trim() }));
  root.querySelector('[data-pf-clear]')?.addEventListener('click', () => save({ avatar: '' }));
  root.querySelector('[data-pf-photo]')?.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try { const url = await shrink(f); if (url.length > 60000) { toast(x.big); return; } save({ avatar: url }); } catch (err) { toast(x.big); }
  });
  root.querySelectorAll('[data-pf-theme]').forEach(b => b.addEventListener('click', () => setPref('theme', b.dataset.pfTheme)));
  root.querySelectorAll('[data-pf-accent]').forEach(b => b.addEventListener('click', () => setPref('accent', b.dataset.pfAccent)));
  root.querySelector('[data-pf-hide]')?.addEventListener('click', () => setPref('hide', !getPrefs().hide));
}

export function render(s) {
  return `${head(t('nav.personalizar'), t('tpl.sub'))}
  <div class="grid">
    ${profileCard(s)}
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
      ${isReal() ? '' : `<button class="btn" style="margin-top:14px" data-action="resetDemo">${icon('i-swap')}${t('tpl.resetBtn')}</button>`}
    </section>
  </div>`;
}
