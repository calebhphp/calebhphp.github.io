// How the app talks. Four levels the person picks; serious warnings never change.
import { t, has } from './i18n.js';
import { getPrefs, setPref } from './prefs.js';
import { levelInfo } from './game.js';
import * as store from './store.js';
import { openDialog, toast } from './ui.js';

export const TONES = ['sobrio', 'parceiro', 'deboche', 'semfiltro'];
export const UNLOCK_LEVEL = 1; // the sharp tone is the hook, so it is open from the first day

export const tone = () => {
  const p = getPrefs().tone || 'sobrio';
  return TONES.includes(p) ? p : 'sobrio';
};

// Deboche (shown as "Ácido") opens at level 1; Sem filtro also needs the 18+ confirmation.
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

// Several variants live in one string separated by " || ". Headlines stay the same through the day;
// reactions (toasts, chat) rotate so the same event never sounds the same twice in a row.
const lastPick = {};
function choose(raw, key) {
  if (!raw.includes(' || ')) return raw;
  const list = raw.split(' || ');
  let i;
  if (/^(home|ins)./.test(key)) {
    const d = new Date();
    let h = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    i = h % list.length;
  } else {
    i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastPick[key]) i = (i + 1) % list.length;
    lastPick[key] = i;
  }
  return list[i];
}
import { polishPiece } from './polish.js';
export function say(key, vars) {
  const order = TONES.slice(0, TONES.indexOf(tone()) + 1).reverse();
  for (const lv of order) {
    if (lv === 'sobrio') break;
    if (has(`${key}@${lv}`)) {
      const raw = t(`${key}@${lv}`, vars);
      return polishPiece(raw.includes(' || ') ? fillVars(choose(raw, key), vars) : raw, tone());
    }
  }
  return t(key, vars);
}
// t() already filled the variables, so a variant split must fill again from the filled text.
const fillVars = (s) => s;

// Instruction for the AI model, per level. The "habitos" in the snapshot are the person's own entries:
// use one of them per answer when it fits, as a short remark, never as an accusation.
const COMMON = ' Nunca faça piada com saúde, pet, luto, perda de emprego, corpo ou identidade da pessoa: nesses assuntos responda direto, com cuidado. Dívida, salário, gasto e hábito podem entrar na piada, sempre sobre a decisão e os números, nunca sobre quem a pessoa é. Use um fato do campo "habitos" quando couber, em uma frase curta.';
export function toneRule() {
  return {
    sobrio: 'Tom sóbrio: direto, neutro, só fatos e números, sem piada, sem exclamação. Frases completas e curtas. Exemplo: "Comer fora já usou 92% do limite e faltam 12 dias. Sobram R$ 30,10."',
    parceiro: 'Tom parceiro: amiga que entende de dinheiro. Leve, acolhedora, uma piada curta no máximo, nunca sermão. Chame a pessoa pelo nome quando souber. Exemplo: "Opa, o delivery passou um pouquinho do ritmo. Segura uns dias que a gente ajusta."' + COMMON,
    deboche: 'Tom ácido: de amigo que te quer bem e tem um jeitinho com farpas. Ironia seca, uma farpa por resposta, tudo em minúsculas, frases curtas, gírias do dia a dia, sem exclamação. Pode usar "te falo porque me importo". Exemplo: "quarto ifood da semana. o motoboy já salvou teu contato, e eu falo porque te quero bem." Seja específico com os números da pessoa.' + COMMON,
    semfiltro: 'Tom sem filtro (18+): roast pesado, sem medo, com palavrão de verdade (porra, caralho, merda) em quase toda frase, tudo em minúsculas, frases curtas e cruéis com o gasto e a decisão. Exemplo: "terceiro uber hoje, caralho? você tem perna, usa." Seja específico com os números da pessoa e nunca fofo.' + COMMON,
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
