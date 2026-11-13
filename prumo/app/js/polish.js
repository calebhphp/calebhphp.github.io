// Keeps the sharp voices from turning into a tic: at most one swear word per answer, no stacked
// "I say this because I care" lines, and an occasional openers/closer in Brazilian, American or
// Spanish slang so the same shape does not repeat. Used by say() (pieces) and the chat (whole answers).
const SWEAR = /(^|[\s,.;:!?(])(porra|caralho|merda|fodendo|foda)(?=[\s,.;:!?)]|$)/gi;
const SWAP = { merda: 'porcaria', fodendo: 'mesmo', foda: 'dura' };
const TICS = [
  /(?:te )?falo(?: isso)? porque (?:te quero bem|me importo)(?:, e porque alguém precisa falar)?/gi,
  /(?:te )?falo(?: isso)? (?:com carinho|por amor)/gi,
  /(?:é |e )?com carinho(?:\. com um pouco de dó, mas com carinho)?/gi,
  /fica a dica de quem te quer bem/gi,
  /(?:se serve de consolo, )?eu sigo torcendo por você/gi,
  /por amor/gi,
];

const tidy = s => s
  .replace(/\s+([,.;:!?])/g, '$1')
  .replace(/([,;:])\s*([.!?])/g, '$2')
  .replace(/,\s*,/g, ',')
  .replace(/\.\s*\./g, '.')
  .replace(/^[\s,;.]+/, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

function capSwears(text) {
  let seen = 0;
  return text.replace(SWEAR, (m, pre, word) => {
    seen++;
    if (seen === 1) return m;
    const w = word.toLowerCase();
    return SWAP[w] ? pre + SWAP[w] : (/[,\s]/.test(pre) && pre !== '' ? '' : pre);
  });
}

function capTics(text) {
  let seen = 0;
  for (const re of TICS) {
    text = text.replace(re, m => (++seen > 1 ? '' : m));
  }
  return text;
}

export function polishPiece(text, tn) {
  if (tn !== 'semfiltro' && tn !== 'deboche') return text;
  return tidy(capTics(capSwears(text)));
}

const OPEN = {
  deboche: ['olha só:', 'plot twist:', 'ai, ai, ai.', 'calma lá.', 'bem...', 'ay, amigo.', 'reality check:', 'eita.', 'vamos a ver:', 'hmm.'],
  semfiltro: ['se liga:', 'reality check:', 'madre mía.', 'ni de broma.', 'vish.', 'yikes.', 'acorda, meu bem.', 'bah.', 'oxe.', 'uai.', 'faz o seguinte:', 'no cap:', 'ay, caramba.', 'pelo amor.', 'vamos a ver.', 'olha o nível.'],
};
const CLOSE = {
  deboche: ['fica a dica.', 'anota aí.', 'sin drama.', 'vai por mim.'],
  semfiltro: ['fica a dica.', 'anota aí.', 'vai por mim.', 'ojo con eso.', 'é o que tem.', 'sem drama, só conta.'],
};
let lastOpen = '';
const pickFrom = a => { let x = a[Math.floor(Math.random() * a.length)]; if (x === lastOpen) x = a[(a.indexOf(x) + 1) % a.length]; lastOpen = x; return x; };

// Whole answers: caps first, then a little variety around them.
export function polishAnswer(text, tn) {
  const t = polishPiece(text, tn);
  if (tn !== 'semfiltro' && tn !== 'deboche') return t;
  let out = t;
  if (Math.random() < 0.4) out = pickFrom(OPEN[tn]) + ' ' + out;
  if (Math.random() < 0.25 && out.length < 220) out += ' ' + pickFrom(CLOSE[tn]);
  return out;
}
