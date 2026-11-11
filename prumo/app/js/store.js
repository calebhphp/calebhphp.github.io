// App state for the demo persona. Lives in localStorage; reset any time.
import { ymOf, addMonths, isoDay } from './format.js';
import { t } from './i18n.js';

const KEY = 'prumo.state.v1';
const listeners = new Set();
let state = null;

const uid = () => Math.random().toString(36).slice(2, 9);

export const MODULES = ['inicio', 'gastos', 'conselheiro', 'retro', 'cartao', 'contas', 'bancos', 'entradas', 'mei', 'assinaturas', 'cofres', 'conquistas'];

export const TEMPLATES = {
  'clt-pj': { modules: MODULES },
  'pj': { modules: MODULES },
  'clt': { modules: MODULES.filter(m => m !== 'mei') },
  'freela': { modules: MODULES },
  'dev': { base: 'clt-pj', pack: 'dev', modules: MODULES },
  'dev-usd': { base: 'pj', pack: 'devUsd', modules: MODULES },
  'artista': { base: 'freela', pack: 'artista', modules: MODULES },
  'criador': { base: 'freela', pack: 'criador', modules: MODULES },
  'estudante': { base: 'clt', pack: 'estudante', modules: MODULES.filter(m => m !== 'mei') },
};

// Profession packs: what each kind of person actually pays, earns and saves for.
const devTools = (st, uid) => {
  st.subs.push(
    { id: uid(), name: 'GitHub Copilot', amount: 10, cur: 'USD', used: true, cancelled: false },
    { id: uid(), name: 'Claude Pro', amount: 20, cur: 'USD', used: true, cancelled: false },
    { id: uid(), name: t('seed.vps'), amount: 6, cur: 'USD', used: null, cancelled: false },
    { id: uid(), name: t('seed.domain'), amount: 5, used: true, cancelled: false },
  );
  st.budgets.trabalho = 250;
  st.goals.splice(2, 1, { id: 'g3', name: t('seed.goalLaptop'), target: 12000, saved: 3100, monthly: 900, kind: 'outro' });
  st.wishlist.unshift({ id: uid(), name: t('seed.wMonitor'), price: 1700, goal: 'g2', bought: false }, { id: uid(), name: t('seed.wChair'), price: 1400, goal: 'g2', bought: false });
  st.game.rewards[0].text = t('seed.rDev');
};
const PACKS = {
  dev: (st, { uid }) => devTools(st, uid),
  devUsd: (st, { uid, end }) => {
    devTools(st, uid);
    const pj = st.incomes.find(i => i.kind === 'pj');
    Object.assign(pj, { name: t('seed.incUsd'), amount: 2200, cur: 'USD', endsOn: null });
    st.incomes.push({ id: uid(), name: t('seed.incFreelaBr'), kind: 'pj', amount: 1800, day: 20, account: 'a2', endsOn: end.toISOString().slice(0, 10) });
  },
  artista: (st, { uid, end }) => {
    st.incomes = [
      { id: uid(), name: t('seed.incGig'), kind: 'pj', amount: 2400, day: 12, account: 'a2', endsOn: null },
      { id: uid(), name: t('seed.incSales'), kind: 'pj', amount: 1300, day: 25, account: 'a2', endsOn: null },
      { id: uid(), name: t('seed.incGrant'), kind: 'pj', amount: 3000, day: 5, account: 'a2', endsOn: end.toISOString().slice(0, 10) },
    ];
    st.subs.push({ id: uid(), name: t('seed.subCreative'), amount: 124, used: true, cancelled: false });
    st.budgets.trabalho = 400;
    st.goals[0] = { id: 'g1', name: t('seed.goalLean'), target: 15000, saved: 4200, monthly: 1200, kind: 'reserva' };
    st.wishlist.unshift({ id: uid(), name: t('seed.wMaterials'), price: 600, goal: 'g2', bought: false });
    st.game.rewards[0].text = t('seed.rArt');
  },
  criador: (st, { uid }) => {
    st.incomes = [
      { id: uid(), name: t('seed.incPubli'), kind: 'pj', amount: 3500, day: 15, account: 'a2', endsOn: null },
      { id: uid(), name: t('seed.incAds'), kind: 'pj', amount: 180, cur: 'USD', day: 21, account: 'a2', endsOn: null },
      { id: uid(), name: t('seed.incClientA'), kind: 'pj', amount: 1500, day: 8, account: 'a2', endsOn: null },
    ];
    st.subs.push({ id: uid(), name: t('seed.subEditor'), amount: 33, used: true, cancelled: false }, { id: uid(), name: t('seed.subDesign'), amount: 35, used: null, cancelled: false });
    st.budgets.trabalho = 350;
    st.wishlist.unshift({ id: uid(), name: t('seed.wMic'), price: 900, goal: 'g2', bought: false }, { id: uid(), name: t('seed.wLight'), price: 450, goal: 'g2', bought: false });
    st.game.rewards[0].text = t('seed.rCreator');
  },
  estudante: (st, { uid }) => {
    st.incomes = [
      { id: uid(), name: t('seed.incIntern'), kind: 'clt', amount: 1800, day: 5, account: 'a1', endsOn: null },
      { id: uid(), name: t('seed.incFamily'), kind: 'clt', amount: 500, day: 10, account: 'a1', endsOn: null },
    ];
    st.bills = st.bills.filter(b => ![t('seed.condo'), t('seed.gym'), t('seed.card')].includes(b.name)).map(b => b.name === t('seed.rent') ? { ...b, name: t('seed.room'), amount: 900 } : b);
    st.budgets = { mercado: 300, restaurante: 200, transporte: 150, casa: 50, saude: 60, lazer: 120, pet: 0, compras: 80, outros: 50, trabalho: 100 };
    st.goals = [{ id: 'g1', name: t('seed.goalReserve'), target: 3000, saved: 450, monthly: 150, kind: 'reserva' }, { id: 'g2', name: t('seed.goalStudy'), target: 2500, saved: 300, monthly: 100, kind: 'outro' }];
    st.wishlist = [{ id: uid(), name: t('seed.wCourse'), price: 700, goal: 'g2', bought: false }];
    st.debts = [];
    st.game.rewards[0].text = t('seed.rStudent');
  },
};

function seed(template = 'clt-pj') {
  if (!TEMPLATES[template]) template = 'clt-pj';
  const pack = TEMPLATES[template].pack;
  const base = TEMPLATES[template].base || template;
  const now = new Date();
  const ym = ymOf(now);
  const year = now.getFullYear();
  // PJ contract ends at the end of the month after next, to show the income-drop warning.
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
  const hasClt = base === 'clt-pj' || base === 'clt';
  const hasPj = base !== 'clt';

  const accounts = [
    { id: 'a1', name: t('seed.accMain'), kind: 'pf', balance: 4320.5 },
    { id: 'a2', name: t('seed.accPj'), kind: 'pj', balance: hasPj ? 6180 : 0 },
    { id: 'a3', name: t('seed.accExtra'), kind: 'pf', balance: 640.15 },
  ].filter(a => hasPj || a.kind === 'pf');

  const incomes = [];
  if (hasClt) incomes.push({ id: uid(), name: t('seed.incClt'), kind: 'clt', amount: 6800, day: 5, account: 'a1', endsOn: null });
  if (hasPj) incomes.push({ id: uid(), name: base === 'freela' ? t('seed.incClientA') : t('seed.incPj'), kind: 'pj', amount: base === 'pj' ? 9400 : 5200, day: 10, account: 'a2', endsOn: isoDay(end) });
  if (base === 'freela') incomes.push({ id: uid(), name: t('seed.incClientB'), kind: 'pj', amount: 2600, day: 18, account: 'a2', endsOn: null });

  const paid = d => (d < now.getDate() ? { [ym]: true } : {});
  const bills = [
    { id: uid(), name: t('seed.rent'), amount: 2750, day: 5, cat: 'fixo', paid: paid(5) },
    { id: uid(), name: t('seed.condo'), amount: 420, day: 8, cat: 'fixo', paid: paid(8) },
    { id: uid(), name: t('seed.power'), amount: 168.4, day: 12, cat: 'fixo', paid: paid(12) },
    { id: uid(), name: t('seed.internet'), amount: 99.9, day: 15, cat: 'fixo', paid: paid(15) },
    { id: uid(), name: t('seed.card'), amount: 0, day: 17, cat: 'fixo', card: 'c1', paid: paid(17) },
    { id: uid(), name: t('seed.phone'), amount: 59.9, day: 20, cat: 'fixo', paid: paid(20) },
    { id: uid(), name: t('seed.gym'), amount: 119.9, day: 25, cat: 'fixo', paid: paid(25) },
    { id: uid(), name: t('seed.pet'), amount: 180, day: 28, cat: 'fixo', paid: paid(28) },
  ];

  const subs = [
    { id: uid(), name: t('seed.subMusic'), amount: 21.9, used: true, cancelled: false },
    { id: uid(), name: t('seed.subVideoA'), amount: 44.9, used: null, cancelled: false },
    { id: uid(), name: t('seed.subVideoB'), amount: 29.9, used: null, cancelled: false },
    { id: uid(), name: t('seed.cloud'), amount: 9.9, used: true, cancelled: false },
    { id: uid(), name: t('seed.appCourse'), amount: 67, used: null, cancelled: false },
  ];

  const invoices = [];
  if (hasPj) {
    const monthly = incomes.filter(i => i.kind === 'pj').reduce((s, i) => s + i.amount, 0);
    for (let m = 0; m < now.getMonth(); m++) invoices.push({ month: `${year}-${String(m + 1).padStart(2, '0')}`, amount: m < 3 ? Math.round(monthly * 0.55) : monthly });
  }

  const goals = [
    { id: 'g1', name: t('seed.goalReserve'), target: 18000, saved: 6400, monthly: 1500, kind: 'reserva' },
    { id: 'g2', name: t('seed.goalHome'), target: 6000, saved: 1850, monthly: 800, kind: 'casa' },
    { id: 'g3', name: t('seed.goalTrip'), target: 4000, saved: 300, monthly: 200, kind: 'outro' },
  ];
  const dayAgo = n => new Date(now.getTime() - n * 864e5).toISOString().slice(0, 10);
  const wishlist = [
    { id: uid(), name: t('seed.wSofa'), price: 2400, goal: 'g2', bought: false, target: 2100, seen: [{ d: dayAgo(34), v: 2290 }, { d: dayAgo(15), v: 2590 }, { d: dayAgo(1), v: 2399 }] },
    { id: uid(), name: t('seed.wPaint'), price: 900, goal: 'g2', bought: false },
    { id: uid(), name: t('seed.wDesk'), price: 1300, goal: 'g2', bought: false, target: 1100, seen: [{ d: dayAgo(28), v: 1300 }, { d: dayAgo(2), v: 1049 }] },
    { id: uid(), name: t('seed.wWallpaper'), price: 650, goal: 'g2', bought: false },
    { id: uid(), name: t('seed.wLamp'), price: 280, goal: 'g3', bought: false, addedAt: new Date(now.getTime() - 20 * 3600 * 1000).toISOString() },
  ];

  const debts = [{ id: uid(), name: t('seed.debt'), amount: 2380, paid: false }];

  // Game history: a few days of actions so the streak and level look alive.
  const log = [];
  for (let d = 4; d >= 1; d--) {
    const day = new Date(now); day.setDate(now.getDate() - d);
    log.push({ at: isoDay(day), key: 'xp.pay', xp: 15 }, { at: isoDay(day), key: 'xp.save', xp: 10 });
  }
  // Day-to-day spending so far this month, so the quick-entry screen opens with history.
  const budgets = { mercado: 900, restaurante: 450, transporte: 280, casa: 150, saude: 160, lazer: 220, pet: 120, compras: 250, trabalho: 120, outros: 100 };
  const pattern = [
    ['seed.tLunch', 34.9, 'restaurante'], ['seed.tUber', 18.5, 'transporte'], ['seed.tMarket', 142.3, 'mercado'],
    ['seed.tCoffee', 8, 'restaurante'], ['seed.tPharmacy', 46.8, 'saude'], ['seed.tDelivery', 52.4, 'restaurante'],
    ['seed.tBakery', 15.2, 'mercado'], ['seed.tUber', 22.9, 'transporte'], ['seed.tCinema', 38, 'lazer'],
    ['seed.tPetFood', 89.9, 'pet'], ['seed.tLunch', 29.5, 'restaurante'], ['seed.tMarket', 96.1, 'mercado'],
  ];
  const tx = [];
  // Last month in full (so the Retrospectiva has a closed month), then this month so far.
  const prev = addMonths(ym, -1);
  const prevDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  for (let d = 1, k = 3; d <= prevDays; d++) {
    for (let j = 0; j < (d % 4 === 0 ? 3 : d % 2 ? 1 : 2); j++, k++) {
      const [key, amount, cat] = pattern[k % pattern.length];
      tx.push({ id: uid(), date: `${prev}-${String(d).padStart(2, '0')}`, desc: t(key), amount: Math.round(amount * (0.8 + (k % 5) / 10) * 100) / 100, cat, pay: k % 3 ? 'credito' : 'pix' });
    }
  }
  for (let d = 1, k = 0; d < now.getDate(); d++) {
    for (let j = 0; j < (d % 3 === 0 ? 2 : 1); j++, k++) {
      const [key, amount, cat] = pattern[k % pattern.length];
      tx.push({ id: uid(), date: `${ym}-${String(d).padStart(2, '0')}`, desc: t(key), amount, cat, pay: k % 2 ? 'credito' : 'pix' });
    }
  }
  const st = {
    v: 4, template, fx: { USD: 5.4 },
    cards: [{ id: 'c1', name: t('seed.cardName'), limit: 6500, close: 10, due: 17 }],
    installments: [
      { id: uid(), desc: t('seed.iFridge'), total: 3290, n: 10, start: addMonths(ym, -3), card: 'c1' },
      { id: uid(), desc: t('seed.iPhone'), total: 2399, n: 12, start: addMonths(ym, -7), card: 'c1' },
      { id: uid(), desc: t('seed.iTrip'), total: 1180, n: 6, start: addMonths(ym, -1), card: 'c1' },
    ],
    profile: { name: 'John Doe' },
    modules: TEMPLATES[template].modules,
    budgets, tx,
    accounts, incomes, bills, subs, goals, wishlist, debts,
    mei: { enabled: hasPj, limit: 81000, das: 81.9, dasDay: 20, invoices, dasPaid: {} },
    game: { xp: 250, log, missions: {}, rewards: [
      { level: 4, text: t('seed.r4') },
      { level: 6, text: t('seed.r6') },
      { level: 8, text: t('seed.r8') },
    ] },
  };
  if (pack && PACKS[pack]) PACKS[pack](st, { now, end, uid });
  return st;
}

export function load() {
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || state.v !== 4) { state = seed(); persist(); }
  return state;
}
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

export const get = () => state;
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

// Every change goes through here so the UI and the game stay in sync.
export function update(mutator, meta = {}) {
  const prev = state;
  state = structuredClone(state);
  mutator(state);
  persist();
  listeners.forEach(fn => fn(state, prev, meta));
}

// Restore from a backup the person exported earlier.
export function replace(next) {
  state = next;
  persist();
  listeners.forEach(fn => fn(state, state, { reset: true }));
}

export function reset(template, patch) {
  state = seed(template || state?.template || 'clt-pj');
  if (patch) patch(state);
  persist();
  listeners.forEach(fn => fn(state, state, { reset: true }));
}

export { uid };

// One row from quick entry: '10x' or more becomes an installment on the card, the rest a transaction.
export function pushRow(s, r, date) {
  if (r.n > 1) s.installments.push({ id: uid(), desc: r.desc, total: r.amount, n: r.n, start: date.slice(0, 7), card: (s.cards[0] || {}).id });
  else s.tx.push({ id: uid(), date, desc: r.desc, amount: r.amount, cat: r.cat, pay: r.pay || null });
}
