// Retrospectiva: a closed month as five vertical cards, sized for stories.
import { t } from '../i18n.js';
import { say, tone } from '../tone.js';
import { money, pct, esc, monthLabel, monthIn, ymOf, addMonths, dayLabel } from '../format.js';
import { wishlistStatus } from '../finance.js';
import { head } from './parts.js';
import { icon, toast } from '../ui.js';

// The month shown: last month while the current one is still running.
const retroYm = ym => (ym === ymOf(new Date()) ? addMonths(ym, -1) : ym);

function recap(s, ym) {
  const list = s.tx.filter(x => x.date.startsWith(ym));
  if (!list.length) return null;
  const [y, m] = ym.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const spent = list.reduce((a, x) => a + x.amount, 0);
  const budget = Object.values(s.budgets).reduce((a, v) => a + v, 0);
  const byCat = {};
  for (const x of list) byCat[x.cat] = (byCat[x.cat] || 0) + x.amount;
  const [topCat, topV] = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const monk = spent <= budget * 0.85;
  const byDay = Array.from({ length: days }, () => 0);
  for (const x of list) byDay[+x.date.slice(8) - 1] += x.amount;
  const maxV = Math.max(...byDay);
  const maxD = byDay.indexOf(maxV) + 1;
  const maxItem = list.filter(x => +x.date.slice(8) === maxD).sort((a, b) => b.amount - a.amount)[0];
  const allowance = budget / days;
  const inside = byDay.filter(v => v <= allowance).length;
  const prevSpent = s.tx.filter(x => x.date.startsWith(addMonths(ym, -1))).reduce((a, x) => a + x.amount, 0);
  const reserve = s.goals.find(g => g.kind === 'reserva');
  const next = wishlistStatus(s).find(w => w.state !== 'bought');
  return { list, days, spent, budget, topCat, topV, monk, maxD, maxV, maxItem, allowance, inside, prevSpent, reserve, next };
}

export function retroBanner(s, ctx) {
  if (!s.modules.includes('retro') || !s.profile.quiz || ctx.ym !== ymOf(new Date())) return '';
  const ym = retroYm(ctx.ym);
  if (!s.tx.some(x => x.date.startsWith(ym))) return '';
  return `<div class="banner banner-retro span-12"><div><h2>${t('retro.banner', { m: esc(monthIn(ym, { month: 'long' })) })}</h2></div>
    <a class="btn btn-primary" href="#retro">${icon('i-star')}${t('retro.bannerCta')}</a></div>`;
}

function cards(s, ym, r) {
  const m = monthLabel(ym, { month: 'long' });
  const catName = ['deboche', 'semfiltro'].includes(tone()) ? t('cat.' + r.topCat).toLowerCase() : t('cat.' + r.topCat);
  const charName = say('retro.c.' + (r.monk ? 'monge' : r.topCat));
  const date = new Date(`${ym}-${String(r.maxD).padStart(2, '0')}T12:00`);
  const vs = r.prevSpent ? t('retro.vs', { p: pct(Math.abs(r.spent - r.prevSpent) / r.prevSpent), dir: t(r.spent < r.prevSpent ? 'retro.less' : 'retro.more'), m: monthIn(addMonths(ym, -1), { month: 'long' }) }) : '';
  const resPct = r.reserve ? pct(r.reserve.saved / r.reserve.target) : '';
  return [
    { k: 'cover', kicker: esc(m), big: t('retro.cover'), line: say('retro.coverSub', { n: r.list.length }) },
    { k: 'char', kicker: t('retro.char'), big: esc(charName),
      line: r.monk ? t('retro.monkLine', { p: pct(r.spent / r.budget) }) : say('retro.charLine', { cat: catName, v: money(r.topV), p: pct(r.topV / r.spent) }) },
    { k: 'day', kicker: t('retro.day'), big: esc(dayLabel(date)), sub: money(r.maxV),
      line: say('retro.dayLine', { item: esc(r.maxItem.desc), v: money(r.maxItem.amount) }) },
    { k: 'pace', kicker: t('retro.pace'), big: `${r.inside}<small>/${r.days}</small>`,
      line: say('retro.paceLine', { n: r.inside, d: r.days, o: r.days - r.inside, v: money(r.allowance) }) },
    { k: 'end', kicker: t('retro.end'), big: money(r.spent), sub: t('retro.plan', { v: money(r.budget) }) + (vs ? `<br>${esc(vs)}` : ''),
      line: (r.reserve ? (r.next ? t('retro.savedLine', { p: resPct, item: esc(r.next.name) }) : t('retro.savedNone', { p: resPct })) + ' ' : '') + say('retro.endLine') },
  ];
}

export function render(s, ctx) {
  const ym = retroYm(ctx.ym);
  const r = recap(s, ym);
  const title = `${t('retro.title')}: ${esc(monthLabel(ym))}`;
  if (!r) return `${head(title, t('retro.sub'))}<div class="grid"><section class="card span-12"><p class="empty">${t('retro.empty')}</p></section></div>`;
  const list = cards(s, ym, r);
  return `${head(title, t('retro.sub'), `<div class="btn-row"><button class="btn btn-primary" type="button" id="retro-img">${icon('i-down')}${t('retro.image')}</button><button class="btn" type="button" id="retro-share">${icon('i-swap')}${t('retro.share')}</button></div>`)}
  <div class="retro-wrap">
    <button type="button" class="btn icon-btn retro-nav" data-dir="-1" aria-label="${esc(t('retro.prev'))}">${icon('i-left')}</button>
    <ol class="retro" id="retro" tabindex="0" aria-label="${esc(title)}">
      ${list.map((c, i) => `<li class="rc rc-${c.k}" aria-label="${esc(t('retro.card', { i: i + 1, n: list.length }))}">
        <div class="rc-top"><svg class="rc-mark" aria-hidden="true"><use href="#logo-mark"/></svg><span>${i + 1}/${list.length}</span></div>
        <p class="rc-kicker">${c.kicker}</p>
        <p class="rc-big">${c.big}</p>
        ${c.sub ? `<p class="rc-sub">${c.sub}</p>` : ''}
        <p class="rc-line">${c.line}</p>
        <p class="rc-foot">prumo</p>
      </li>`).join('')}
    </ol>
    <button type="button" class="btn icon-btn retro-nav" data-dir="1" aria-label="${esc(t('retro.next'))}">${icon('i-right')}</button>
  </div>`;
}

// Card colours for the image, same as the .rc-* rules in app.css.
const SKIN = { cover: ['#17221f', '#f3efe4'], char: ['#e0b25a', '#17221f'], day: ['#2b2620', '#f3efe4'], pace: ['#ede6d3', '#17221f'], end: ['#e0b25a', '#17221f'] };
// The card text is already escaped HTML; this turns it back into plain lines for the canvas.
const plain = html => new DOMParser().parseFromString(String(html).replace(/<br>/g, '\n'), 'text/html').body.textContent;

// Draws one card at story size (1080 x 1920) from the same data the screen uses. Nothing leaves the browser.
async function cardImage(c, i, n) {
  const W = 1080, H = 1920, P = 96;
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = cv.getContext('2d');
  const [bg, ink] = SKIN[c.k];
  const font = getComputedStyle(document.body).fontFamily;
  try { await document.fonts.load('700 120px ' + font); } catch (e) { /* falls back to the system font */ }
  const wrap = (text, size, weight, maxW) => {
    g.font = weight + ' ' + size + 'px ' + font;
    const out = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const test = line ? line + ' ' + w : w;
        if (line && g.measureText(test).width > maxW) { out.push(line); line = w; } else line = test;
      }
      out.push(line);
    }
    return out;
  };
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = ink; g.textBaseline = 'alphabetic';
  g.globalAlpha = .75; g.font = '500 40px ' + font;
  g.fillText('prumo', P, 150);
  g.textAlign = 'right'; g.fillText(i + 1 + '/' + n, W - P, 150); g.textAlign = 'left';
  g.globalAlpha = .16; g.fillRect(P, 200, W - P * 2, 3);
  const big = wrap(plain(c.big), 150, 700, W - P * 2);
  const sub = c.sub ? wrap(plain(c.sub), 54, 500, W - P * 2) : [];
  const line = wrap(plain(c.line), 56, 400, W - P * 2);
  let y = 1000 - (big.length * 156 + sub.length * 70 + line.length * 76) / 2;
  g.globalAlpha = .8; g.font = '500 40px ' + font;
  g.fillText(plain(c.kicker).toUpperCase(), P, y - 60);
  g.globalAlpha = 1; g.font = '700 150px ' + font;
  for (const l of big) { y += 156; g.fillText(l, P, y); }
  g.globalAlpha = .85; g.font = '500 54px ' + font; y += 30;
  for (const l of sub) { y += 70; g.fillText(l, P, y); }
  g.globalAlpha = 1; g.font = '400 56px ' + font; y += 60;
  for (const l of line) { y += 76; g.fillText(l, P, y); }
  g.globalAlpha = .7; g.font = '700 52px ' + font;
  g.fillText('prumo', P, H - 110);
  return new Promise(res => cv.toBlob(res, 'image/png'));
}

export function mount(root, s, ctx) {
  const ym = retroYm(ctx.ym);
  const r = recap(s, ym);
  if (!r) return;
  const strip = root.querySelector('#retro');
  root.querySelectorAll('.retro-nav').forEach(b => b.addEventListener('click', () => {
    const w = strip.querySelector('.rc').getBoundingClientRect().width + 16;
    strip.scrollBy({ left: w * +b.dataset.dir, behavior: document.documentElement.dataset.motion === 'off' ? 'auto' : 'smooth' });
  }));
  // Saves the card that is in view. On a phone it opens the share sheet; elsewhere it downloads the PNG.
  root.querySelector('#retro-img').addEventListener('click', async () => {
    const list = cards(s, ym, r);
    const els = [...strip.querySelectorAll('.rc')];
    const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2;
    const i = els.reduce((best, el, k) => {
      const b = el.getBoundingClientRect();
      return Math.abs(b.left + b.width / 2 - mid) < Math.abs(els[best].getBoundingClientRect().left + els[best].getBoundingClientRect().width / 2 - mid) ? k : best;
    }, 0);
    const blob = await cardImage(list[i], i, list.length).catch(() => null);
    if (!blob) { toast(t('retro.imageFail')); return; }
    const file = new File([blob], 'prumo-' + ym + '-' + (i + 1) + '.png', { type: 'image/png' });
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch (e) { /* closed the share sheet */ }
      return;
    }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(t('retro.imageDone', { i: i + 1 }));
  });
  root.querySelector('#retro-share').addEventListener('click', async () => {
    const c = cards(s, ym, r);
    const text = t('retro.shareText', { m: monthIn(ym, { month: 'long' }), char: c[1].big, day: `${c[2].big} (${c[2].sub})`, n: r.inside, d: r.days });
    try { await navigator.clipboard.writeText(text); toast(t('retro.copied')); } catch (e) { toast(text); }
  });
}
