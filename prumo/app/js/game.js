// Gamification: XP only for real actions, levels unlock rewards the person chose.
import { isoDay } from './format.js';

export const levelStart = n => 50 * n * (n - 1);

export function levelInfo(xp) {
  let n = 1;
  while (xp >= levelStart(n + 1)) n++;
  const from = levelStart(n), to = levelStart(n + 1);
  return { level: n, into: xp - from, need: to - from, pct: (xp - from) / (to - from), toNext: to - xp };
}

export const MISSIONS = [
  { id: 'pay', key: 'xp.pay', xp: 20, label: 'mission.pay' },
  { id: 'save', key: 'xp.save', xp: 20, label: 'mission.save' },
  { id: 'review', key: 'xp.review', xp: 20, label: 'mission.review' },
];

export function missionsToday(s, today = isoDay(new Date())) {
  const done = new Set(s.game.log.filter(l => l.at === today).map(l => l.key));
  return MISSIONS.map(m => ({ ...m, done: done.has(m.key) }));
}

// Mutates a draft state. Returns what happened so the UI can celebrate.
export function grant(s, key, xp) {
  const today = isoDay(new Date());
  const before = levelInfo(s.game.xp).level;
  s.game.log.push({ at: today, key, xp });
  s.game.xp += xp;
  let bonus = null;
  const m = MISSIONS.find(x => x.key === key);
  const claimed = s.game.missions[today] || [];
  if (m && !claimed.includes(m.id)) {
    s.game.missions[today] = [...claimed, m.id];
    s.game.xp += m.xp;
    s.game.log.push({ at: today, key: 'xp.mission', xp: m.xp });
    bonus = m;
  }
  const after = levelInfo(s.game.xp).level;
  return { key, xp, bonus, levelUp: after > before ? after : null };
}

export function streak(s, now = new Date()) {
  const days = new Set(s.game.log.map(l => l.at));
  const last7 = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); last7.push(days.has(isoDay(d))); }
  let count = 0;
  const d = new Date(now);
  if (!days.has(isoDay(d))) d.setDate(d.getDate() - 1);
  while (days.has(isoDay(d))) { count++; d.setDate(d.getDate() - 1); }
  return { count, last7 };
}

export function achievements(s) {
  const keys = new Set(s.game.log.map(l => l.key));
  const reserve = s.goals.find(g => g.kind === 'reserva');
  return [
    { id: 'first', icon: 'i-check', got: keys.has('xp.pay') },
    { id: 'streak7', icon: 'i-flame', got: streak(s).count >= 7 },
    { id: 'half', icon: 'i-safe', got: !!reserve && reserve.saved >= reserve.target / 2 },
    { id: 'cut', icon: 'i-sub', got: s.subs.some(x => x.cancelled) },
    { id: 'clean', icon: 'i-star', got: s.debts.every(d => d.paid) },
    { id: 'buy', icon: 'i-home', got: s.wishlist.some(w => w.bought) },
    { id: 'das', icon: 'i-mei', got: keys.has('xp.das') },
    { id: 'lvl5', icon: 'i-trophy', got: levelInfo(s.game.xp).level >= 5 },
  ];
}
