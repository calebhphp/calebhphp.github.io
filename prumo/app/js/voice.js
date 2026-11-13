// The Prumo voice: what the advisor says in each tone, using the person's own numbers and recent history.
// Everything here runs on the device with data the person already typed. Nothing is sent anywhere.
// Serious situations (debt, salary, health, pet, grief) never get a joke: see SERIOUS in answers below.
import { tone } from './tone.js';
import { getPrefs } from './prefs.js';
import { money, pct, addMonths, isoDay, displayName } from './format.js';
import { spending, monthSummary, subsReview, wishlistStatus } from './finance.js';
import { streak } from './game.js';
import { t } from './i18n.js';
import { polishPiece } from './polish.js';

const ORDER = ['semfiltro', 'deboche', 'parceiro', 'sobrio'];
const last = {};
// Random, but never the same line twice in a row for the same intent and tone.
function pick(arr, key) {
  if (!arr || !arr.length) return '';
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && i === last[key]) i = (i + 1) % arr.length;
  last[key] = i;
  return arr[i];
}
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] === undefined ? '' : v[k]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function line(intent, vars = {}) {
  const bank = BANK[intent];
  if (!bank) return '';
  const from = ORDER.indexOf(tone());
  for (const tn of ORDER.slice(from)) {
    if (bank[tn] && bank[tn].length) {
      const out = fill(pick(bank[tn], intent + tn), vars);
      return tone() === 'sobrio' || tone() === 'parceiro' ? out.charAt(0).toUpperCase() + out.slice(1) : out;
    }
  }
  return '';
}

// ---------- what we know about the person, from their own entries
const DELIVERY = /ifood|rappi|delivery|ubereats|uber eats|99food|99 food|pizza|hamburg|lanche|marmita|japa|sushi|burger|mc ?donald|restaurante/;
const RIDE = /uber|99|taxi|cabify|corrida|indriver/;
export function facts(s, ym) {
  const now = new Date();
  const sp = spending(s, ym);
  const x = monthSummary(s, ym);
  const today = isoDay(now);
  const from = isoDay(new Date(now.getTime() - 13 * 86400000));
  const recent = s.tx.filter(g => g.date >= from && g.date <= today);
  const month = sp.list;
  const top = sp.cats.filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent)[0];
  const big = month.slice().sort((a, b) => b.amount - a.amount)[0];
  const lastTx = s.tx.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const prevYm = addMonths(ym, -1);
  let vsLast = 0;
  if (top && prevYm) {
    const prev = spending(s, prevYm).cats.find(c => c.cat === top.cat);
    if (prev && prev.spent > 0) vsLast = (top.spent - prev.spent) / prev.spent;
  }
  const sr = subsReview(s);
  const h = now.getHours();
  const spentToday = s.tx.filter(g => g.date === today).reduce((a, g) => a + g.amount, 0);
  const cap = sp.daysLeft ? (sp.budget - sp.spent + spentToday) / sp.daysLeft : 0;
  return {
    name: displayName(s),
    tod: h < 12 ? 'bom dia' : h < 18 ? 'boa tarde' : 'boa noite',
    free: money(x.free), freeN: x.free, freeHalf: money(Math.max(0, x.free * 0.5)), d: sp.daysLeft, per: money(Math.max(0, sp.perDayLeft)), perN: sp.perDayLeft,
    pace: pct(sp.pace), elapsed: pct(sp.elapsed), paceN: sp.pace, elapsedN: sp.elapsed,
    left: money(Math.max(0, cap - spentToday)), leftN: Math.max(0, cap - spentToday), capN: cap, today: money(spentToday), todayN: spentToday,
    top: top ? t('cat.' + top.cat).toLowerCase() : '', topCat: top ? top.cat : '', topP: top && sp.spent ? pct(top.spent / sp.spent) : '', topShare: top && sp.spent ? top.spent / sp.spent : 0,
    topV: top ? money(top.spent) : '', topUsed: top ? pct(top.used) : '', vsLastN: vsLast, vsLast: pct(Math.abs(vsLast)),
    n14: recent.filter(g => DELIVERY.test(norm(g.desc)) || (g.cat === 'restaurante' && !RIDE.test(norm(g.desc)))).length,
    u14: recent.filter(g => RIDE.test(norm(g.desc))).length,
    v14: money(recent.reduce((a, g) => a + g.amount, 0)), c14: recent.length,
    delV: money(recent.filter(g => DELIVERY.test(norm(g.desc)) || (g.cat === 'restaurante' && !RIDE.test(norm(g.desc)))).reduce((a, g) => a + g.amount, 0)),
    rideV: money(recent.filter(g => RIDE.test(norm(g.desc))).reduce((a, g) => a + g.amount, 0)),
    big: big ? big.desc : '', bigV: big ? money(big.amount) : '',
    last: lastTx ? lastTx.desc : '', lastV: lastTx ? money(lastTx.amount) : '',
    streak: streak(s).count || 0,
    subsN: s.subs.filter(a => !a.cancelled).length, subsV: money(sr.total), subsY: money(sr.total * 12),
    debtsN: s.debts.filter(d => !d.paid).length, debtsV: money(s.debts.filter(d => !d.paid).reduce((a, d) => a + d.amount, 0)), debtsN_: s.debts.filter(d => !d.paid).reduce((a, d) => a + d.amount, 0),
    inc: money(x.income), incN: x.income, outP: x.income ? pct((x.fixed + sp.spent) / x.income) : '', outN: x.income ? (x.fixed + sp.spent) / x.income : 0, fixedV: money(x.fixed),
    petV: money((sp.cats.find(c => c.cat === 'pet') || { spent: 0 }).spent), petUsed: pct((sp.cats.find(c => c.cat === 'pet') || { used: 0 }).used),
    total: money(sp.spent), budget: money(sp.budget), spentN: sp.spent, budgetN: sp.budget,
  };
}

// One short remark based on the most notable fact, in the active tone. Empty when nothing stands out.
export function kicker(f) {
  const found = [];
  if (f.n14 >= 3) found.push('delivery');
  if (f.u14 >= 3) found.push('ride');
  if (f.topShare >= 0.3 && f.top) found.push('top');
  if (f.streak >= 3) found.push('streak');
  if (f.subsN >= 5) found.push('subs');
  if (f.paceN < f.elapsedN - 0.1) found.push('good');
  if (f.paceN > f.elapsedN + 0.1) found.push('fast');
  if (!found.length) return '';
  const k = pick(found, 'kick');
  return line('kick_' + k, f);
}

// ---------- the answers
// SERIOUS words: if the question is about debt, salary, health, pet or grief, answer straight in any tone.
const SERIOUS = /falec|luto|doenc|doença|cirurgia|remedio|remédio|veterin|pet\b|saude|saúde|hospital|plano de saude|demissao|demissão|desempreg|depress|ansied|terapia|enterro/;

function amountIn(q) {
  const m = q.replace(/\./g, '').match(/(\d+(?:,\d{1,2})?)/g);
  if (!m) return 0;
  return Math.max(...m.map(x => parseFloat(x.replace(',', '.')))) || 0;
}

export function voiceAnswer(q, s, ym) {
  if (getPrefs().lang !== 'pt-BR' && getPrefs().lang !== 'pt') return '';
  const n = norm(q);
  const f = facts(s, ym);
  const serious = SERIOUS.test(n);
  const withKick = txt => (serious ? txt : txt + ' ' + kicker(f)).trim();

  if (/^(oi|ola|e ai|eai|opa|bom dia|boa tarde|boa noite|fala|salve|hey|hello)\b/.test(n)) return line('hello', f);
  if (/obrigad|valeu|brigad|thanks/.test(n)) return line('thanks', f);
  if (/tudo bem|como vai|como voce esta|como vc ta|beleza\?/.test(n)) return line('how', f);
  if (/(me )?(zoa|zoe|xinga|esculacha|detona|humilha|roast|pega pesado|me ofende)/.test(n)) return serious ? line('summary', f) : roast(f);
  if (/(me )?(elogia|elogie|parabeniza|parabens|motiva|anima)/.test(n)) return line('praise', f);
  const amt = amountIn(q);
  if (/compr|sofa|wishlist|desejo/.test(n) && amt < 5) return '';
  if (/posso (comprar|gastar|pagar)|da pra (comprar|gastar)|cabe|vale a pena comprar|devo comprar/.test(n) && amt >= 5) {
    const cap = f.leftN;
    const k = amt <= cap ? 'buy_today' : amt <= Math.max(0, f.freeN) ? 'buy_month' : 'buy_no';
    return line(k, { ...f, amt: money(amt), amtN: amt, gap: money(Math.max(0, amt - cap)), over: money(Math.max(0, amt - Math.max(0, f.freeN))) });
  }
  if (/(estou|to|tô) indo bem|como estou|como to|como tô|estou bem|to mal|estou mal|sera que|será que/.test(n)) {
    const k = f.paceN > f.elapsedN + 0.15 ? 'doing_bad' : f.paceN > f.elapsedN + 0.03 ? 'doing_mid' : 'doing_good';
    return withKick(line(k, f));
  }
  if (/ritmo|pace/.test(n)) return withKick(line(f.paceN > f.elapsedN + 0.1 ? 'pace_fast' : 'pace_ok', f));
  if (/hoje|quanto (eu )?(posso|dá|da) gastar/.test(n) && !/ifood|uber|assinat|compr|sofa/.test(n)) return withKick(line(f.leftN > 0 ? 'today_ok' : 'today_over', f));
  if (/(maior|mais) (gasto|despesa|pesa)|onde (eu )?gasto mais|gasto mais com/.test(n) && f.top) return withKick(line('biggest', f));
  if (/delivery|ifood|rappi|comer fora|restaurante|lanche/.test(n) && !/semana/.test(n)) return line(f.n14 >= 1 ? 'delivery' : 'delivery_none', f);
  if (/uber|99|taxi|transporte|corrida/.test(n) && !/semana/.test(n)) return line(f.u14 >= 1 ? 'ride' : 'ride_none', f);
  if (/assinatura|streaming|netflix|spotify|cancelar/.test(n)) return line(f.subsN ? 'subs' : 'subs_none', f);
  if (/cofre|guardar|reserva|poupar|economizar/.test(n)) return line('goals', f);
  if (/cortar|corte|reduzir|economiz/.test(n)) return line('cut', f);
  if (/fecha|fechar|sobra|sobrar|fim do mes|no fim do mes/.test(n)) return withKick(line(f.freeN >= 0 ? 'close_ok' : 'close_red', f));
  if (/streak|sequencia|dias seguidos|nivel|xp|conquista/.test(n)) return line('game', f);
  if (/(^|[^a-z])pet([^a-z]|$)|cachorro|gato|racao|veterin/.test(n)) return line('pet_info', f);
  if (/divida|devo|pendencia|nome sujo|negativad|protesto|spc|serasa/.test(n)) return line(f.debtsN ? 'debt' : 'debt_none', f);
  if (/salario|quanto (eu )?ganho|minha renda|quanto entra|holerite|contracheque/.test(n)) return line(f.incN ? 'salary' : 'salary_none', f);
  if (/(quem e voce|o que voce faz|voce e uma ia|vc e uma ia|voce e real)/.test(n)) return line('who', f);
  return '';
}

export function fallback(s, ym) {
  const f = facts(s, ym);
  return line('summary', f) + ' ' + line('unknown_tip', f);
}

export function helloLine(s, ym) {
  return polishPiece(line('hello', facts(s, ym)), tone());
}
export function toneSwitchLine(s, ym) {
  return polishPiece(line('tone_switch', facts(s, ym)), tone());
}

// ---------- the bank. Variables: see facts(). Each tone has several lines so repeating a question never repeats the answer.
const BANK = {
  hello: {
    sobrio: ['{tod}. Sobra prevista de {free} no mês e {per} por dia nos próximos {d} dias. Pergunte o que quiser.', '{tod}. Você ainda pode gastar {left} hoje. O que quer ver?', 'Olá. Faltam {d} dias no mês. Posso mostrar o ritmo, as categorias ou conferir uma compra.'],
    parceiro: ['{tod}, {name}! Tá tudo nos trilhos: sobram {free} no mês e dá pra gastar {left} hoje. Quer olhar o quê?', 'Oi, {name}. Faltam {d} dias e a gente tá bem. Me pergunta se pode comprar algo ou onde dá pra apertar.', '{tod}! Hoje ainda cabem {left}. Bora ver como o mês tá?'],
    deboche: ['{tod}, {name}. sobram {free} no mês e {left} hoje. tenta não gastar tudo no primeiro delivery.', 'oi, {name}. eu vejo tuas contas, teus cofres e cada cafezinho. pergunta o que quiser, eu respondo sem passar pano.', '{tod}. faltam {d} dias e o teto é {per} por dia. o app confia em você, eu ainda tô avaliando.', 'fala, {name}. hoje cabem {left}. a pergunta é se você vai respeitar.'],
    semfiltro: ['{tod}, {name}, porra. sobram {free} no mês e {left} hoje. vê se não faz merda.', 'e aí, {name}. faltam {d} dias, teto de {per} por dia. pergunta o que quiser que eu falo a real, sem enfeite.', '{tod}. tem {left} pra hoje e eu tô de olho. manda a pergunta.', 'oi, {name}. eu leio tudo que você gasta, caralho. bora ver se o mês presta.'],
  },
  thanks: {
    sobrio: ['De nada.', 'Disponha. Qualquer dúvida, é só perguntar.', 'Tranquilo. Posso mostrar mais algum número?'],
    parceiro: ['De nada, {name}! Tô aqui pra isso.', 'Imagina! Se bater dúvida, me chama.', 'Sempre. Vai com calma nas compras hoje.'],
    deboche: ['de nada. o agradecimento aceito em forma de gasto menor.', 'disponha. no fim do mês você me agradece de novo se sobrar.', 'imagina. foi só um cálculo, quem fez o trabalho duro foi o seu limite.'],
    semfiltro: ['de nada, porra. agora vai gastar menos.', 'valeu o caralho, vai lá cuidar do dinheiro.', 'tamo junto. agora larga o celular e não pede nada.'],
  },
  how: {
    sobrio: ['Funcionando. Faltam {d} dias no mês e o ritmo está em {pace} do plano.', 'Bem. Quer ver o resumo do mês?'],
    parceiro: ['Tô bem, {name}! E você? O mês tá com {pace} do plano usado, tá de boa.', 'Tudo certo por aqui. Seu mês também, pelo que eu vejo.'],
    deboche: ['eu tô ótimo, não gasto nada. já você, {pace} do plano com {elapsed} do mês.', 'tudo bem, sim. a diferença é que eu não faço pix de madrugada.'],
    semfiltro: ['tô bem, porra, não pago conta. você, {pace} do plano com {elapsed} do mês, vamos ver.', 'beleza. e o seu bolso, como tá, hein?'],
  },
  summary: {
    sobrio: ['Sobra prevista de {free}. Faltam {d} dias e dá para gastar {per} por dia. Já foram {total} dos {budget} do dia a dia.', 'Hoje restam {left}. No mês, {free} previstos de sobra e {pace} do plano usado.'],
    parceiro: ['Seu mês tá assim: sobram {free} e dá pra gastar {per} por dia. Já usou {pace} do plano, tá no caminho.', 'Resumo rápido: {free} de sobra prevista, {left} liberados hoje e {d} dias pela frente.'],
    deboche: ['sobra prevista: {free}. faltam {d} dias e o teto é {per} por dia. pergunta o que quiser, eu não passo pano.', 'o mês tá com {pace} do plano usado e {elapsed} passado. {free} de sobra, se você se comportar.', 'hoje cabem {left}. o resto do mês cabe {free}. a conta é simples, o difícil é você.'],
    semfiltro: ['sobra prevista: {free}, porra. {d} dias pela frente e teto de {per} por dia. não complica.', '{pace} do plano usado com {elapsed} do mês. dá pra gastar {left} hoje, caralho, não é pra gastar tudo.', 'resumo sem enfeite: {free} de sobra e {per} por dia. quem estraga é você.'],
  },
  unknown_tip: {
    sobrio: ['Você pode perguntar: "posso comprar algo de 300?", "onde estou gastando mais?" ou "como está meu ritmo?".', 'Tente: "quanto posso gastar hoje?", "quanto vai sobrar no mês?" ou "tenho muita assinatura?".'],
    parceiro: ['Se quiser, me pergunta tipo "posso comprar um tênis de 300?" ou "onde tô gastando mais?".', 'Posso ajudar com ritmo, categorias, assinaturas, cofres e compras. É só mandar.'],
    deboche: ['não entendi a pergunta, mas tenta "posso comprar algo de 300?" que eu respondo e ainda zoo.', 'pergunta direito: "onde tô gastando mais?" ou "como tá meu ritmo?". eu sou esperto, mas não vidente.'],
    semfiltro: ['não entendi essa merda. tenta "posso comprar algo de 300?" ou "onde tô gastando mais?", porra.', 'fala direito, caralho: "como tá meu ritmo?", "me zoa" ou "posso comprar X de 200?".'],
  },
  pace_ok: {
    sobrio: ['Está no ritmo: você usou {pace} do plano do dia a dia e já passou {elapsed} do mês. Dá para gastar {per} por dia.', 'Ritmo dentro do plano ({pace} usados, {elapsed} do mês). Teto de {per} por dia.'],
    parceiro: ['Tá no ritmo, {name}! {pace} do plano com {elapsed} do mês. Pode gastar {per} por dia sem susto.', 'Bom ritmo: {pace} usado e o mês já tá em {elapsed}. Segue assim.'],
    deboche: ['no ritmo: {pace} do plano com {elapsed} do mês. dá pra gastar {per} por dia. não se acostuma.', 'tá dentro. {pace} usado, {elapsed} do mês passado. estranho, mas bom.', 'ritmo ok. se o dinheiro fosse nota, você ia de média sete.'],
    semfiltro: ['no ritmo, porra: {pace} com {elapsed} do mês. {per} por dia e sem inventar moda.', 'tá bom, caralho. {pace} do plano, {elapsed} do mês. não estraga agora.', 'ritmo de gente grande: {pace} usado e {elapsed} do mês. vai com calma.'],
  },
  pace_fast: {
    sobrio: ['Acelerado: {pace} do plano usado com {elapsed} do mês. O teto agora é {per} por dia.', 'Gasto à frente do mês ({pace} contra {elapsed}). Para fechar no plano, mire em {per} por dia.'],
    parceiro: ['Opa, {name}, o gasto passou na frente: {pace} do plano com {elapsed} do mês. Dá pra corrigir, mira em {per} por dia.', 'Tá um pouco acelerado ({pace} contra {elapsed}), mas ainda dá pra ajustar. Teto de {per} por dia.'],
    deboche: ['acelerado. {pace} do plano com {elapsed} do mês. o teto agora é {per} por dia. respira.', 'o gasto tá correndo mais que o calendário. {per} por dia daqui pra frente e a gente se entende.', '{pace} usado com {elapsed} do mês. alguém tá com pressa de chegar no fim do dinheiro.'],
    semfiltro: ['tá acelerado pra caralho: {pace} do plano com {elapsed} do mês. {per} por dia e fecha a boca do cartão.', 'o gasto passou o calendário, porra. {per} por dia daqui pra frente, sem choro.', '{pace} do plano com {elapsed} do mês. você tá com pressa de quebrar, é?'],
  },
  doing_good: {
    sobrio: ['Sim. Você usou {pace} do plano e já passou {elapsed} do mês. Está dentro do planejado.'],
    parceiro: ['Tá indo bem, {name}! {pace} do plano com {elapsed} do mês. Pode se orgulhar um pouquinho.', 'Bem mesmo. Dentro do plano e com folga. Continua assim.'],
    deboche: ['tá indo bem. irritante, mas é verdade. {pace} do plano com {elapsed} do mês.', 'surpreendentemente bem. eu tinha apostado no contrário.'],
    semfiltro: ['tá indo bem pra caralho: {pace} do plano com {elapsed} do mês. não vai se achar.', 'bem, porra. não esperava. segue assim e para de me pedir elogio.'],
  },
  doing_mid: {
    sobrio: ['Quase no ritmo: {pace} do plano com {elapsed} do mês. Um pouco à frente, mas dentro do controle.'],
    parceiro: ['Tá mais ou menos: um pouquinho à frente ({pace} contra {elapsed}), mas nada grave. Segura uns dias que volta.'],
    deboche: ['meio no limite. {pace} do plano com {elapsed} do mês. dá tempo de se redimir.'],
    semfiltro: ['na corda bamba, porra. {pace} do plano com {elapsed} do mês. um delivery a mais e já era.'],
  },
  doing_bad: {
    sobrio: ['O gasto está à frente do mês: {pace} do plano com {elapsed} passado. Vale reduzir para {per} por dia.'],
    parceiro: ['Hmm, o gasto passou bastante na frente ({pace} contra {elapsed}). Sem drama: mira em {per} por dia e a gente ajusta.'],
    deboche: ['não muito bem. {pace} do plano com {elapsed} do mês. mas confio na sua capacidade de mudar. de leve.'],
    semfiltro: ['mal, caralho. {pace} do plano com {elapsed} do mês. {per} por dia e para de gastar à toa.'],
  },
  today_ok: {
    sobrio: ['Hoje ainda cabem {left}. Já foram {today} e o teto do dia é {per}.', 'Você pode gastar mais {left} hoje.'],
    parceiro: ['Hoje ainda cabem {left}, {name}. Aproveita sem culpa.', 'Dá pra gastar {left} hoje e ainda ficar no plano.'],
    deboche: ['hoje cabem {left}. não quer dizer que você tem que gastar tudo.', 'ainda restam {left} hoje. o que sobra amanhã agradece.', 'o limite de hoje é {left}. use a cabeça, a carteira já está usando o resto.'],
    semfiltro: ['hoje cabem {left}, porra. não é convite pra gastar tudo.', 'tem {left} pra hoje. gasta o que precisa e some.', '{left} liberados hoje. o resto é seu e eu fico de olho, caralho.'],
  },
  today_over: {
    sobrio: ['Hoje você já passou do teto do dia ({today} lançados). O restante do mês ajusta para {per} por dia.'],
    parceiro: ['Hoje já passou um pouquinho do teto, mas sem drama: amanhã a gente compensa. Segue com {per} por dia.'],
    deboche: ['hoje já estourou o teto. amanhã é outro dia e eu ainda tenho paciência, pouca.'],
    semfiltro: ['hoje já estourou o teto, porra. amanhã é {per} e nenhum delivery.'],
  },
  biggest: {
    sobrio: ['O que mais pesa no mês é {top}: {topV}, {topP} do gasto. Esse é o maior item.', 'A maior categoria é {top}, com {topV} ({topP} do total).'],
    parceiro: ['O que mais pesou foi {top}: {topV}, uns {topP} do total. Se quiser economizar, é por aí.', '{top} lidera o mês, com {topV}. Dá pra olhar com carinho.'],
    deboche: ['{top} tá liderando: {topV}, {topP} de tudo. parabéns, é um campeonato que ninguém quer ganhar.', 'o culpado de sempre: {top}, {topV}. {topP} do mês é isso.'],
    semfiltro: ['{top}, porra: {topV}, {topP} de tudo que você gastou. é aí que o dinheiro escorre.', 'o vilão é {top}. {topV} do mês e {topP} do total. resolve isso e para de reclamar.'],
  },
  delivery: {
    sobrio: ['Nos últimos 14 dias foram {n14} lançamentos de comida pronta. O total de gastos nesse período foi {v14}.', 'Você lançou {n14} pedidos de comida fora de casa em 14 dias.'],
    parceiro: ['{n14} pedidos de comida nos últimos 14 dias. Delícia, mas dá pra espaçar um pouco, né?', 'Foram {n14} vezes comendo fora ou pedindo. Sem julgar, só te mostrando.'],
    deboche: ['{n14} delivery em 14 dias. o motoboy já salvou teu contato.', 'contei {n14} pedidos de comida em 14 dias. a cozinha tá de enfeite, é?', '{n14} vezes comendo fora em duas semanas. respeito o comprometimento com o app de entrega.'],
    semfiltro: ['{n14} delivery em 14 dias, porra. o fogão é decoração, caralho?', '{n14} pedidos em duas semanas. o motoboy já tá pagando a faculdade com a sua grana.', '{n14} vezes comendo fora. cozinha um ovo, pelo amor.'],
  },
  delivery_none: {
    sobrio: ['Não encontrei pedidos de comida lançados nos últimos 14 dias.'],
    parceiro: ['Nada de delivery nos últimos 14 dias, olha só! Tá cozinhando ou só não lançou?'],
    deboche: ['zero delivery em 14 dias. ou você virou chef ou esqueceu de lançar. eu aposto na segunda.'],
    semfiltro: ['nenhum delivery em 14 dias, caralho. orgulho, ou você não lançou e eu sou trouxa.'],
  },
  ride: {
    sobrio: ['Foram {u14} corridas de carro por aplicativo nos últimos 14 dias.'],
    parceiro: ['{u14} corridas em 14 dias. Se algumas forem curtas, dá pra ir a pé e economizar.'],
    deboche: ['{u14} corridas em 14 dias. o motorista já te chama pelo nome.', 'contei {u14} uber em duas semanas. andar a pé é grátis, tá?'],
    semfiltro: ['{u14} corridas em 14 dias, porra. anda que é cardio.', '{u14} uber em duas semanas. tá com preguiça ou com dinheiro sobrando, caralho?'],
  },
  ride_none: {
    sobrio: ['Não vi corridas lançadas nos últimos 14 dias.'],
    parceiro: ['Nenhum carro por aplicativo nos últimos 14 dias. Bom sinal pro bolso!'],
    deboche: ['zero corrida em 14 dias. ou tá caminhando, ou tá carona de alguém. respeito.'],
    semfiltro: ['nenhum uber em 14 dias, porra. tá andando, ou escondendo gasto de mim?'],
  },
  subs: {
    sobrio: ['Você tem {subsN} assinaturas ativas: {subsV} por mês, {subsY} por ano. Marque as que não usa e cancele pela lista.'],
    parceiro: ['São {subsN} assinaturas, {subsV} por mês. Dá uma olhada nas que você não usa, tem dinheiro parado aí.'],
    deboche: ['{subsN} assinaturas somam {subsV} por mês. {subsY} por ano. isso já é doação.', '{subsN} assinaturas ativas e você usa umas duas. {subsV} por mês indo embora.'],
    semfiltro: ['{subsN} assinaturas, porra, {subsV} por mês e {subsY} por ano. cancela essa merda que você nem usa.', '{subsY} por ano em assinatura. nem o seu chefe te paga tão bem pra isso, caralho.'],
  },
  subs_none: {
    sobrio: ['Não há assinaturas ativas cadastradas.'],
    parceiro: ['Nenhuma assinatura cadastrada. Se tiver alguma, vale lançar pra gente acompanhar.'],
    deboche: ['nenhuma assinatura? ou você é minimalista ou esqueceu de cadastrar a do streaming.'],
    semfiltro: ['zero assinatura, caralho. mentira, deve ter e você não lançou.'],
  },
  goals: {
    sobrio: ['Para guardar, o app sugere separar até metade da sobra prevista: {freeHalf}. Os cofres liberam a compra só quando o valor está guardado.'],
    parceiro: ['Guardar é um bom caminho, {name}. Da sobra de {free}, metade já faz diferença no cofre.'],
    deboche: ['guardar? quem diria. da sobra de {free}, separa metade antes de ela virar delivery.'],
    semfiltro: ['guardar, porra, enfim. pega metade da sobra de {free} e joga no cofre antes que você gaste.'],
  },
  cut: {
    sobrio: ['Onde cortar primeiro: {top} ({topP} do gasto) e as assinaturas sem uso. Eles tendem a dar mais retorno.'],
    parceiro: ['Se quiser apertar, começa por {top}, que é onde mais pesa, e revisa as assinaturas. Mexe pouco e sente a diferença.'],
    deboche: ['corta {top} primeiro, é o que mais pesa. depois as assinaturas que você jura que usa.'],
    semfiltro: ['corta {top} primeiro, porra, é o que mais pesa. depois cancela as assinaturas que você não usa, caralho.'],
  },
  close_ok: {
    sobrio: ['No ritmo atual o mês fecha com {free} de sobra prevista. Hoje cabem {left}.'],
    parceiro: ['O mês deve fechar com {free} de sobra, {name}. Tá bom!'],
    deboche: ['o mês fecha com {free} sobrando, se você se comportar. é um se grande.'],
    semfiltro: ['fecha com {free} sobrando, porra, se você não inventar moda no fim do mês.'],
  },
  close_red: {
    sobrio: ['No ritmo atual o mês fecha no vermelho. Revise assinaturas e o valor dos cofres.'],
    parceiro: ['O mês tá apertado e pode fechar no vermelho, mas dá tempo: revisa as assinaturas e o que dá pra segurar.'],
    deboche: ['do jeito que tá, fecha no vermelho. dá pra virar, mas começa fechando o app de delivery.'],
    semfiltro: ['vai fechar no vermelho, caralho. segura a mão, cancela o que não usa e para de fazer pix à toa.'],
  },
  buy_today: {
    sobrio: ['Cabe: {amt} está dentro do que sobra hoje ({left}).', 'Sim. O valor de {amt} cabe no limite de hoje.'],
    parceiro: ['Cabe sim, {name}! {amt} está dentro do que sobra hoje ({left}). Compra sem culpa.', 'Pode. Dentro do limite de hoje e ainda sobra um pouco.'],
    deboche: ['cabe. {amt} dentro dos {left} de hoje. aproveita, é raro.', 'pode comprar. a conta fecha. vou fingir que não vi o próximo delivery.'],
    semfiltro: ['cabe, porra. {amt} dentro dos {left} de hoje. compra sem culpa e sem choro.', 'pode. a conta bate, caralho. surpreendente.'],
  },
  buy_month: {
    sobrio: ['Hoje não cabe ({left} disponíveis), mas cabe na sobra do mês ({free}). Faltam {gap} para o limite de hoje.', 'Cabe no mês, mas passa do limite de hoje em {gap}.'],
    parceiro: ['Hoje passa um pouquinho ({gap} acima do limite), mas cabe na sobra do mês ({free}). Se segurar uns dias, dá.', 'Dá pra comprar sem rombo no mês, mas vai apertar o resto dos dias.'],
    deboche: ['cabe no mês, mas hoje passa {gap}. espera uns dias e compra sem tremer.', 'tecnicamente dá. na prática, vai te apertar. segura um pouco.'],
    semfiltro: ['hoje não, caralho: passa {gap} do limite. cabe no mês, mas vai pesar. espera uns dias.', 'dá pra comprar, porra, mas vai apertar o resto do mês. você que sabe.'],
  },
  buy_no: {
    sobrio: ['Não cabe: {amt} passa da sobra do mês em {over}.', 'Não recomendo agora. O valor de {amt} ultrapassa o que está previsto de sobra.'],
    parceiro: ['Melhor não agora, {name}. {amt} passa da sobra do mês em {over}. Que tal esperar o próximo mês?', 'Tá acima do que cabe, mas se for importante a gente planeja pro mês que vem.'],
    deboche: ['não. {amt} passa da sobra do mês em {over}. parcelar não é ter dinheiro.', 'cabe na vontade, não no orçamento. {over} acima da sobra. segura.'],
    semfiltro: ['não, caralho. {amt} passa da sobra em {over}. parcelar não é ter dinheiro, porra.', 'de jeito nenhum. {over} acima do que sobra. pensa de novo.'],
  },
  roast: {
    sobrio: ['Não faço humor com os seus gastos neste tom. Mas aqui vai o retrato: {top} pesa {topP}, e restam {free} no mês.'],
    parceiro: ['Zoar eu não zoo muito, né, {name}. Mas {top} tá pesando {topP} do mês, vale uma olhada, rs.'],
    deboche: ['quer que eu zoe? tá bom. {top} é {topP} do seu gasto. você e essa categoria, um casal.', 'primeiro: {top} lidera o mês, {topV}. segundo: {n14} pedidos de comida em 14 dias. terceiro: a dignidade ficou na loja.', 'você pediu. {top} com {topP} do gasto e ainda me pergunta se tá bem.'],
    semfiltro: ['quer que eu detone? {top} é {topP} do que você gasta, porra. esse é o seu hobby mais caro.', 'olha só: {top} com {topV}, {n14} delivery em duas semanas e {u14} corridas. o seu extrato é uma piada, caralho.', 'pediu, toma. {topP} do seu dinheiro vai em {top}. e você ainda faz pergunta?'],
  },
  praise: {
    sobrio: ['Pelos números, o seu mês está dentro do plano. Isso é um bom resultado.'],
    parceiro: ['Olha, {name}, tô orgulhoso. Mês no ritmo, sem susto. Você tá cuidando bem do seu dinheiro.', 'Parabéns! Dá pra ver o esforço nos números.'],
    deboche: ['quer elogio? tá no ritmo. é o máximo que eu dou por semana.', 'muito bem, {name}. dá pra ver que alguém acordou com disciplina hoje.'],
    semfiltro: ['elogio, porra? tá no ritmo, caralho. não se acostuma.', 'tá bom, tá bom. você tá indo bem. satisfeito?'],
  },
  who: {
    sobrio: ['Sou o conselheiro do Prumo. Respondo com os números do seu mês e não vejo nada fora do que você lançou.'],
    parceiro: ['Sou o Prumo, seu parceiro de finanças. Eu só enxergo o que você lançou aqui.'],
    deboche: ['sou o prumo, o app que não deixa você esquecer o extrato. só sei o que você lança, o resto é com a sua consciência.'],
    semfiltro: ['sou o prumo, porra. só sei o que você lançou. o resto é com você, caralho.'],
  },
  game: {
    sobrio: ['Você está na sequência de {streak} dias lançando. Cada ação real dá XP em Conquistas.'],
    parceiro: ['Sequência de {streak} dias, {name}! Continua lançando que o prêmio vem.'],
    deboche: ['sequência de {streak} dias. tá virando hábito, quase respeitável.'],
    semfiltro: ['{streak} dias seguidos, porra. mantém que o prêmio sai, sem choro.'],
  },
  tone_switch: {
    sobrio: ['Tom sóbrio ligado. Só fatos e números, sem piada. Exemplo: sobra prevista de {free}, teto de {per} por dia.'],
    parceiro: ['Tom parceiro ligado. Vou falar como amigo que entende de dinheiro. Exemplo: tá tudo nos trilhos, sobram {free}.'],
    deboche: ['tom ácido ligado. vou zoar a sua decisão, nunca você. exemplo: {n14} pedidos de comida em 14 dias. o motoboy já salvou teu contato.', 'ácido ligado. agora eu falo o que os outros apps têm medo de falar. exemplo: {top} é {topP} do seu mês. um casal.'],
    semfiltro: ['sem filtro ligado, 18+. vou falar a real com palavrão leve. exemplo: {top} é {topP} do seu gasto, porra. resolve isso.', 'sem filtro ligado. se doer, é porque é verdade, caralho. exemplo: {n14} delivery em duas semanas.'],
  },
  kick_delivery: {
    sobrio: ['Nota: {n14} pedidos de comida em 14 dias.'],
    parceiro: ['(Só reparando: {n14} pedidos de comida em 14 dias.)'],
    deboche: ['ah, {n14} deliveries em 14 dias. o motoboy manda um abraço.', 'e os {n14} pedidos de comida nos últimos 14 dias contam também.'],
    semfiltro: ['{n14} delivery em 14 dias, porra. cozinha um ovo.', 'sem falar nos {n14} pedidos de comida em duas semanas, caralho.'],
  },
  kick_ride: {
    sobrio: ['Nota: {u14} corridas por aplicativo em 14 dias.'],
    parceiro: ['(E foram {u14} corridas em 14 dias, vale lembrar.)'],
    deboche: ['{u14} corridas em 14 dias. andar é de graça, por sinal.'],
    semfiltro: ['{u14} uber em duas semanas, caralho. anda um pouco.'],
  },
  kick_top: {
    sobrio: ['Maior categoria do mês: {top}, {topP} do gasto.'],
    parceiro: ['Só lembrando: {top} é quem mais pesa, {topP} do mês.'],
    deboche: ['{top} segue sendo {topP} do que você gasta. consistência.'],
    semfiltro: ['{top} é {topP} do seu gasto, porra. o resto é sobra.'],
  },
  kick_streak: {
    sobrio: ['Você está há {streak} dias seguidos lançando.'],
    parceiro: ['E tá há {streak} dias seguidos lançando. Isso é hábito bom!'],
    deboche: ['{streak} dias lançando seguido. o app começa a confiar em você.'],
    semfiltro: ['{streak} dias seguidos, porra. mantém, não vai desistir agora.'],
  },
  kick_subs: {
    sobrio: ['Há {subsN} assinaturas ativas, {subsV} por mês.'],
    parceiro: ['E as {subsN} assinaturas, {subsV} por mês, vale revisar quando der.'],
    deboche: ['{subsN} assinaturas. aposto que você usa três.'],
    semfiltro: ['{subsN} assinaturas, caralho. cancela as que você não usa.'],
  },
  kick_good: {
    sobrio: ['O ritmo do mês está abaixo do planejado, o que dá folga.'],
    parceiro: ['E o mês tá com folga, viu? Boa!', 'O mês tá com folga, aliás. Parabéns!'],
    deboche: ['aliás, o mês tá com folga. eu também me assustei.', 'e o mês anda com folga, o que me deixou desconfiado.'],
    semfiltro: ['o mês tá com folga, porra. não vai gastar tudo agora.', 'tem folga no mês, caralho. aproveita sem fazer merda.'],
  },
  kick_fast: {
    sobrio: ['Atenção: o gasto está à frente do ritmo do mês.'],
    parceiro: ['Só um toque: o gasto tá um pouquinho à frente do mês.'],
    deboche: ['o gasto tá na frente do mês. alguém tem pressa.'],
    semfiltro: ['o gasto passou o mês, caralho. segura a mão.'],
  },
};


// ---------- the sharp end. Ácido gets warm barbs (a friend who loves you and still says it). Sem filtro swears and goes all in on
// the spending, the debts and the paycheck. Never on health, pets, grief or job loss, never on the person's body or identity.
const MORE = {
  pet_info: {
    sobrio: ['Pet: {petV} no mês, {petUsed} do limite da categoria.'],
    parceiro: ['Com pet eu não brinco, {name}: {petV} no mês, {petUsed} do limite. Cuidar custa e vale.'],
    deboche: ['com pet eu não zoo: {petV} no mês, {petUsed} do limite. quem cuida de bicho tem meu respeito.'],
    semfiltro: ['pet é sagrado, sem piada: {petV} no mês, {petUsed} do limite. o resto do seu extrato eu detono, esse não.'],
  },
  debt: {
    sobrio: ['Há {debtsN} pendência(s) em aberto, somando {debtsV}. Quitar primeiro libera crédito.'],
    parceiro: ['Tem {debtsV} em aberto, {name}. Dá pra sair dessa um passo por vez, e a gente faz junto.'],
    deboche: ['{debtsV} no seu nome, {name}. falo porque te quero bem: quita isso antes do próximo delivery.', 'tem {debtsV} em aberto. você chama de pendência, o banco chama de oportunidade.', 'dívida de {debtsV} e o app de comida ainda tá com saudade de você. fica a dica de quem te quer bem.'],
    semfiltro: ['{debtsV} de dívida e você pedindo ifood, caralho? o nome sujo combina com o extrato.', 'tá devendo {debtsV} e ainda gasta como milionário, porra. quita essa merda primeiro.', '{debtsV} no vermelho. você não tá endividado, tá patrocinando o banco, parabéns.', 'dívida de {debtsV} e o cartão ainda aceita você. o banco deve ser muito otimista.'],
  },
  debt_none: {
    sobrio: ['Nenhuma pendência em aberto.'],
    parceiro: ['Nenhuma pendência em aberto, {name}. Isso já é muita coisa boa.'],
    deboche: ['zero dívida. você é o tipo de pessoa que paga a fatura e ainda cobra o app de ter feito mais.'],
    semfiltro: ['sem dívida, caralho. milagre, ou você escondeu de mim. continua assim, porra.'],
  },
  salary: {
    sobrio: ['Entram {inc} por mês. Contas fixas e dia a dia somam {outP} disso.'],
    parceiro: ['Entram {inc} por mês, {name}. Contas e dia a dia levam {outP}. Dá pra respirar um pouco mais.'],
    deboche: ['entram {inc} e saem {outP} entre contas e dia a dia. o resto é o que sobra da sua boa vontade.', '{inc} de renda. {outP} vão embora antes de você escolher o que gastar. eu falo porque te quero bem.', 'seu salário de {inc} aparece, cumprimenta e {outP} dele já vai embora.'],
    semfiltro: ['{inc} de salário e {outP} evaporam em conta e dia a dia, porra. o salário entra e sai mais rápido que visita chata.', 'ganha {inc} e gasta {outP} antes de respirar, caralho. você não tem salário, tem uma passagem de ida.', '{inc} por mês e a conta zera. trabalha pra pagar a vida que você ainda nem aproveitou.', 'o salário de {inc} nem esquenta o lugar no extrato. cada centavo já tem destino, quase todos ruins.'],
  },
  salary_none: {
    sobrio: ['Não há entradas cadastradas ainda.'],
    parceiro: ['Ainda não vi entradas cadastradas. Quer lançar a primeira?'],
    deboche: ['sem entrada cadastrada. o dinheiro entra por osmose, é isso?'],
    semfiltro: ['nenhuma entrada cadastrada, porra. cadastra a renda ou para de reclamar.'],
  },
};
const HARD = {
  hello: {
    deboche: ['{tod}, {name}. o mês tá aí e eu tô aqui pra falar o que ninguém te fala. com carinho, claro.', 'oi, {name}. hoje cabem {left}. te falo isso porque eu me importo, e mereço respeito.'],
    semfiltro: ['{tod}, {name}. cabem {left} hoje, porra. vai pensando antes de gastar tudo e vir chorar.', 'e aí, {name}, o que você fez de novo com o dinheiro? pergunta logo, caralho.', '{tod}. sobram {free} no mês, se você não for burro. manda a pergunta.', 'fala, {name}. eu leio teu extrato todo dia e ainda tô aqui, isso é amor ou masoquismo.'],
  },
  how: {
    deboche: ['tô bem, e você? {pace} do plano com {elapsed} do mês, pergunto porque me importo e porque tô de olho.'],
    semfiltro: ['tô ótimo, porra, eu não pago boleto. você? {pace} do plano com {elapsed} do mês, tá aí a resposta.', 'melhor que o seu extrato, caralho.'],
  },
  summary: {
    deboche: ['sobra prevista de {free}. faltam {d} dias, teto de {per} por dia. falo isso porque eu quero seu bem, você que complica.', '{pace} do plano com {elapsed} do mês e {left} hoje. tá indo, só não se ilude.'],
    semfiltro: ['sobram {free} no mês, porra, e {per} por dia pelos próximos {d} dias. não gasta mais que isso, caralho.', '{pace} do plano com {elapsed} do mês. {left} hoje. você tá ok, mas eu conheço o seu histórico.', 'resumo: {free} sobrando e {d} dias pela frente. o único risco é você, como sempre.'],
  },
  pace_ok: {
    deboche: ['no ritmo: {pace} com {elapsed} do mês. fico até emocionado, mas não conta pra ninguém.'],
    semfiltro: ['{pace} do plano com {elapsed} do mês, caralho. tá ok, não ocorreu um milagre, é só o mínimo.', 'ritmo bom, porra. não vai ter desconto de gentileza amanhã.'],
  },
  pace_fast: {
    deboche: ['acelerou: {pace} do plano com {elapsed} do mês. te falo com amor, mas o bolso tá pedindo socorro.'],
    semfiltro: ['{pace} do plano com {elapsed} do mês, caralho. você gasta como se o mês fosse acabar amanhã.', 'tá gastando feito herdeiro, porra. {per} por dia daqui pra frente e fecha essa carteira.', '{pace} com {elapsed} do mês. o seu cartão ainda não te abandonou por pena.'],
  },
  doing_good: {
    deboche: ['tá indo bem, {name}. me dói admitir. fico orgulhoso e isso é raro.'],
    semfiltro: ['tá indo bem pra caralho, {pace} com {elapsed} do mês. eu esperava o pior, confesso.'],
  },
  doing_mid: {
    deboche: ['no limite. {pace} com {elapsed} do mês. um passo errado e a gente conversa de novo.'],
    semfiltro: ['{pace} com {elapsed} do mês, na corda bamba. um ifood a mais e você cai, porra.'],
  },
  doing_bad: {
    deboche: ['não tá bem, {name}. {pace} do plano com {elapsed} do mês. eu falo com carinho: respira e corta o que dá.'],
    semfiltro: ['tá mal, caralho. {pace} do plano com {elapsed} do mês. você tá torrando dinheiro como se tivesse herança.', 'péssimo, porra. {pace} com {elapsed} do mês. seu extrato é uma comédia, só que sem graça.'],
  },
  today_ok: {
    deboche: ['hoje cabem {left}. gasta com consciência, que eu tô olhando.'],
    semfiltro: ['hoje cabem {left}, porra. não é convite pra torrar tudo, caralho.', '{left} pra hoje e eu duvido que você segure.'],
  },
  today_over: {
    deboche: ['hoje já estourou. te falo porque gosto de você: amanhã segura a mão.'],
    semfiltro: ['hoje já passou do teto, caralho. quer que eu faça o quê, uma festa?', 'estourou o dia, porra. amanhã é {per}, nem um real a mais, entendeu?'],
  },
  biggest: {
    deboche: ['{top} lidera com {topV}, {topP} do mês. falo porque me importo: reduz isso.'],
    semfiltro: ['{top}, porra: {topV}, {topP} de tudo. você tem um relacionamento sério com essa categoria.', 'o seu maior vício é {top}: {topV} e {topP} do gasto, caralho. tem tratamento.', '{topV} em {top}. {topP} do seu dinheiro vira isso e você ainda reclama.'],
  },
  delivery: {
    deboche: ['{n14} pedidos em 14 dias. te falo com amor: até a cozinha já esqueceu seu rosto.'],
    semfiltro: ['{n14} delivery em 14 dias, caralho. você não tem fome, tem hábito, e um hábito caro.', '{n14} pedidos em duas semanas, porra. o entregador já tem nome no seu telefone e talvez cadastro no seu cartão.', '{n14} vezes comendo fora. o fogão tá de enfeite e a sua carteira de refém.'],
  },
  ride: {
    deboche: ['{u14} corridas em 14 dias. andar tá liberado, é por minha conta.'],
    semfiltro: ['{u14} corridas em duas semanas, caralho. você tem pernas, usa. de graça, porra.', '{u14} uber em 14 dias. o motorista já te conhece pelo nome e pelo endereço.'],
  },
  subs: {
    deboche: ['{subsN} assinaturas, {subsV} por mês. te falo com carinho: você usa três e paga {subsN}.'],
    semfiltro: ['{subsN} assinaturas, {subsV} por mês, porra. tá bancando streaming pra mundo inteiro e ainda reclama de estar sem dinheiro.', '{subsY} por ano em assinatura que você não usa, caralho. cancela essa merda e vai viver.'],
  },
  goals: {
    deboche: ['guardar {freeHalf} da sobra de {free} é um bom começo. falo porque quero te ver bem.'],
    semfiltro: ['separa {freeHalf} da sobra de {free} e joga no cofre, caralho, antes que você torre. isso é o mínimo.', 'guardar, porra. {freeHalf} no cofre e você finge que esse dinheiro nunca existiu.'],
  },
  cut: {
    deboche: ['corta {top} primeiro, e as assinaturas que você jura que usa. te falo porque me importo.'],
    semfiltro: ['corta {top} e as assinaturas inúteis, caralho. o resto é desculpa, você sabe.', 'começa por {top}, que é o seu maior vício. depois cancela o que você nem lembra que paga, porra.'],
  },
  close_ok: {
    deboche: ['o mês fecha com {free} de sobra. você conseguiu, e eu duvidei. peço desculpas, um pouco.'],
    semfiltro: ['fecha com {free} de sobra, caralho. se você não estragar nos últimos dias, que é a sua especialidade.'],
  },
  close_red: {
    deboche: ['vermelho. te falo com amor, {name}: ainda dá pra virar, mas o delivery vai ter que esperar.'],
    semfiltro: ['o mês fecha no vermelho, caralho. você é o único responsável e eu sou testemunha.', 'vermelho, porra. quem diria, gastar mais do que ganha dá nisso. surpresa nenhuma.'],
  },
  buy_today: {
    deboche: ['cabe. {amt} dentro dos {left}. aproveita, que dura pouco.'],
    semfiltro: ['cabe, porra. {amt} dentro dos {left} de hoje. compra, aproveita e não vem chorar.', 'pode comprar, caralho. a conta bate, uma vez na vida.'],
  },
  buy_month: {
    deboche: ['hoje passa {gap}, mas cabe no mês. te falo porque me importo: espera uns dias.'],
    semfiltro: ['hoje passa {gap} do teto, caralho. cabe no mês, mas vai apertar o resto, vai ver.', 'dá pra comprar, porra, mas você vai passar o resto do mês de miojo. você que escolhe.'],
  },
  buy_no: {
    deboche: ['não, {name}. {amt} passa da sobra em {over}. te falo porque te quero bem: respira antes de clicar.'],
    semfiltro: ['de jeito nenhum, caralho. {amt} passa da sobra em {over}. quer parcelar? parcelar não é ter dinheiro, porra.', '{amt} com {over} acima da sobra? você é ou não é ligado em dinheiro? não compra essa merda.', 'não. a sua carteira não tem esse dinheiro e o seu cartão não é remédio pra isso.'],
  },
  roast: {
    deboche: ['quer que eu zoe? tá, com carinho: {top} é {topP} do seu gasto, {n14} delivery em 14 dias. falo porque me importo com você e com a sua dignidade.', '{top} lidera com {topV}. você é o único pagando o salário do entregador, eu admiro, só não ajuda.'],
    semfiltro: ['quer que eu detone? {top} é {topP} do que você gasta, caralho. você não tem finanças, tem um hobby caro.', 'o seu extrato é um filme de terror: {top} com {topV}, {n14} delivery em duas semanas, {u14} uber. você é um mistério, porra.', 'pediu, toma: {topP} do seu dinheiro vai embora em {top}. o resto vai pra boleto, e o que sobra, porra, sobra nada.', 'você gasta como se tivesse herança e se queixa como quem não tem. o extrato não mente, caralho.'],
  },
  praise: {
    deboche: ['quer elogio? tá no ritmo, {name}. fico orgulhoso, e olha que eu não me emociono fácil.'],
    semfiltro: ['elogio, porra? tá bom, tá indo bem. mas não me pede de novo, caralho, eu não sou terapeuta.'],
  },
  thanks: {
    deboche: ['de nada. se quiser agradecer de verdade, gasta menos.'],
    semfiltro: ['de nada, porra. agradece gastando menos, caralho.', 'imagina. o que eu faço aqui é te salvar de você mesmo.'],
  },
};
Object.assign(BANK, MORE);
for (const [intent, tones] of Object.entries(HARD)) {
  BANK[intent] = BANK[intent] || {};
  if (tones.deboche) BANK[intent].deboche = [...(BANK[intent].deboche || []), ...tones.deboche];
  if (tones.semfiltro) BANK[intent].semfiltro = [...tones.semfiltro, ...(BANK[intent].semfiltro || []).slice(0, 1)];
}

// ---------- roast: two or three barbs picked from what is actually true about this person this month.
// Each barb only exists when the fact is real. Ácido says it like a friend who loves you; sem filtro does not hold back.
const BARBS = [
  { ok: f => f.n14 >= 3, deboche: ['{n14} pedidos de comida em 14 dias, {delV}. a cozinha da sua casa já pediu transferência de departamento.', 'você pediu comida {n14} vezes em duas semanas e gastou {delV}. o fogão tá virando peça de museu.'],
    semfiltro: ['{n14} delivery em 14 dias, {delV}, caralho. o seu fogão tem tanta poeira que virou patrimônio histórico.', '{delV} em comida pedida, porra. você não tem fome, tem assinatura de entregador.', '{n14} vezes o app de comida em duas semanas. {delV}. o entregador sabe em que andar você mora e em que mês você desistiu de cozinhar.'] },
  { ok: f => f.top && f.topShare >= 0.25, deboche: ['{top} é {topP} do que você gasta. isso já não é categoria, é relacionamento.', '{topP} do seu gasto vai em {top}. eu respeito a dedicação, só não sei se o seu bolso respeita.'],
    semfiltro: ['{top} é {topP} do que você gasta, porra. não é categoria, é relacionamento sério e você nem pediu em namoro.', '{topV} em {top}, {topP} de tudo, caralho. o resto da sua vida come as migalhas.'] },
  { ok: f => f.big && f.bigV, deboche: ['o maior gasto do mês foi "{big}", {bigV}. eu vi e fingi que não.', '"{big}" por {bigV}. a gente não vai falar disso, mas tá no histórico.'],
    semfiltro: ['o maior gasto do mês foi "{big}": {bigV}, caralho. quem faz isso com o próprio dinheiro?', '"{big}" por {bigV}. essa merda sozinha podia ter pago uma semana de vida decente, porra.'] },
  { ok: f => f.last && f.lastV, deboche: ['o último lançamento foi "{last}", {lastV}. continua a história, eu aguardo.', 'seu último movimento: "{last}", {lastV}. coerente com o resto.'],
    semfiltro: ['último lançamento: "{last}", {lastV}. é assim que você trata o próprio dinheiro, porra?', '"{last}", {lastV}. dava pra ser pior? dava. mas você tá se esforçando, caralho.'] },
  { ok: f => f.c14 >= 8, deboche: ['{c14} lançamentos em 14 dias somando {v14}. seu extrato lê como um diário de impulsos.'],
    semfiltro: ['{c14} lançamentos em 14 dias, {v14}, caralho. você não tem finanças, tem um diário de arrependimentos.'] },
  { ok: f => f.subsN >= 4, deboche: ['{subsN} assinaturas por {subsV} por mês. você usa uma e sustenta o streaming dos outros.'],
    semfiltro: ['{subsN} assinaturas, {subsV} por mês, porra. tá patrocinando empresa que nem sabe seu nome, caralho.'] },
  { ok: f => f.u14 >= 3, deboche: ['{u14} corridas em 14 dias, {rideV}. as suas pernas estão em greve e eu entendo, mas não apoio.'],
    semfiltro: ['{u14} corridas em 14 dias, {rideV}, porra. você tem perna, usa. o motorista já acha que mora no carro.'] },
  { ok: f => f.paceN > f.elapsedN + 0.05, deboche: ['você tá a {pace} do plano com {elapsed} do mês. gastando como se o mês tivesse acabado antes de você chegar.'],
    semfiltro: ['{pace} do plano com {elapsed} do mês, caralho. você gasta como se tivesse herança e nenhum parente.'] },
  { ok: f => f.incN && f.outN > 0.6, deboche: ['{outP} da sua renda de {inc} some antes de você decidir qualquer coisa. o salário só passa pra fazer visita.'],
    semfiltro: ['{inc} entram, {outP} já tem dono antes de você abrir o app, porra. o salário cai e vai embora mais rápido que visita chata.'] },
  { ok: f => f.debtsN > 0, deboche: ['{debtsV} em aberto e ainda sobra paciência pra pedir comida. isso é fé.'],
    semfiltro: ['{debtsV} de dívida e {n14} delivery, caralho. você tá financiando jantar com o nome sujo.', 'tá devendo {debtsV} e ainda gasta como se o banco te devesse, porra.'] },
];
const CLOSE = {
  deboche: ['falo isso porque te quero bem, e porque alguém precisa falar.', 'é com carinho. com um pouco de dó, mas com carinho.', 'se serve de consolo, eu sigo torcendo por você.', 'respira e corrige a rota, você consegue.'],
  semfiltro: ['agora para de chorar e vai economizar, porra.', 'isso não é xingamento, caralho, é o seu extrato falando.', 'o app só repete o que você fez. a culpa é sua, porra.', 'se doeu, ótimo. mudar dá trabalho, caralho.'],
};
function roast(f) {
  const tn = tone();
  if (tn !== 'deboche' && tn !== 'semfiltro') return line('roast', f) + ' ' + (kicker(f) || '');
  const pool = BARBS.filter(b => b.ok(f));
  if (!pool.length) return line('summary', f);
  const chosen = [];
  const bag = pool.slice();
  const n = Math.min(bag.length, 2 + (Math.random() > 0.85 ? 1 : 0));
  while (chosen.length < n && bag.length) chosen.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  const parts = chosen.map(b => fill(pick(b[tn], 'barb' + tn + BARBS.indexOf(b)), f));
  return parts.join(' ') + ' ' + pick(CLOSE[tn], 'close' + tn);
}
