// How the app talks. Four levels the person picks; serious warnings never change.
import { t, has } from './i18n.js';
import { getPrefs, setPref } from './prefs.js';
import { levelInfo } from './game.js';
import * as store from './store.js';
import { openDialog, toast } from './ui.js';

export const TONES = ['sobrio', 'parceiro', 'deboche', 'semfiltro'];
export const UNLOCK_LEVEL = 3;

export const tone = () => {
  const p = getPrefs().tone || 'sobrio';
  return TONES.includes(p) ? p : 'sobrio';
};

// Deboche opens at level 3; Sem filtro also needs the 18+ confirmation.
export function locked(name, s = store.get()) {
  if (!s) return false;
  if (name === 'deboche' || name === 'semfiltro') return levelInfo(s.game.xp).level < UNLOCK_LEVEL;
  return false;
}

export function setTone(name) {
  if (!TONES.includes(name) || locked(name)) return false;
  if (name === 'semfiltro' && !getPrefs().adult) return 'adult';
  setPref('tone', name);
  return true;
}

// Text in the chosen voice, falling back one level at a time down to the plain line.
export function say(key, vars) {
  const order = TONES.slice(0, TONES.indexOf(tone()) + 1).reverse();
  for (const lv of order) {
    if (lv === 'sobrio') break;
    if (has(`${key}@${lv}`)) return t(`${key}@${lv}`, vars);
  }
  return t(key, vars);
}

// Instruction for the AI model, per level.
export function toneRule() {
  return {
    sobrio: 'Tom direto e neutro, só fatos e números, sem piada.',
    parceiro: 'Tom de amiga que entende de dinheiro: leve, uma piada curta no máximo, sem sermão.',
    deboche: 'Tom de deboche: ironia seca e roast das escolhas de gasto, em minúsculas, frases curtas. Zoe a decisão, nunca a pessoa. Nunca zoe dívida, salário, saúde, pet ou luto. Aviso sério sai claro, sem piada.',
    semfiltro: 'Tom sem filtro: deboche com palavrão leve (porra, caralho, puta merda) no máximo uma vez por resposta, em minúsculas. Zoe a decisão, nunca a pessoa. Nunca zoe dívida, salário, saúde, pet ou luto. Aviso sério sai claro, sem piada.',
  }[tone()];
}

// Picks a voice from any screen; asks for the 18+ confirmation when needed.
export function chooseTone(name) {
  const r = setTone(name);
  if (r === 'adult') {
    openDialog({
      title: t('tone.adultTitle'), submit: t('tone.adultDo'), body: `<p>${t('tone.adultBody')}</p>`,
      onSubmit: () => { setPref('adult', true); setTone(name); toast(say('tone.set', { name: t('tone.' + name) })); },
    });
    return;
  }
  if (r) toast(t('tone.set', { name: t('tone.' + name) }));
  else toast(t('tone.locked', { n: UNLOCK_LEVEL }));
}

export function toneOptions(s) {
  return TONES.map(k => `<option value="${k}" ${tone() === k ? 'selected' : ''} ${locked(k, s) ? 'disabled' : ''}>${t('tone.' + k)}${locked(k, s) ? ' · ' + t('tone.locked', { n: UNLOCK_LEVEL }) : ''}</option>`).join('');
}
