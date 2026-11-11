// Small hand-made SVG charts. Hover and keyboard focus show the same tooltip.
import { money, moneyShort, monthLabel, esc } from './format.js';
import { t } from './i18n.js';

// Income bars per month + dashed line for planned spending (same unit, one axis).
export function projectionChart(rows, currentYm) {
  const W = 640, H = 230, L = 52, R = 12, T = 14, B = 30;
  const max = Math.max(...rows.map(r => Math.max(r.income, r.out))) * 1.12 || 1;
  const step = (W - L - R) / rows.length;
  const bw = Math.min(46, step * 0.55);
  const y = v => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => max * f);
  const linePts = rows.map((r, i) => `${L + step * i + step / 2},${y(r.out)}`).join(' ');
  const label = rows.map(r => `${monthLabel(r.ym, { month: 'short' })}: ${t('chart.income')} ${money(r.income)}, ${t('chart.out')} ${money(r.out)}`).join('; ');

  const svg = `
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chart.projAria'))}. ${esc(label)}">
    <g class="axis">
      ${ticks.map(v => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>
        <text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${moneyShort(v)}</text>`).join('')}
      ${rows.map((r, i) => `<text x="${L + step * i + step / 2}" y="${H - 8}" text-anchor="middle">${esc(monthLabel(r.ym, { month: 'short' }))}</text>`).join('')}
    </g>
    ${rows.map((r, i) => {
      const x = L + step * i + step / 2 - bw / 2;
      const top = Math.min(y(r.income), y(0) - 2);
      // 4px rounded top, square at baseline
      const d = `M${x},${y(0)} V${top + 4} Q${x},${top} ${x + 4},${top} H${x + bw - 4} Q${x + bw},${top} ${x + bw},${top + 4} V${y(0)} Z`;
      return `<rect class="hit" x="${L + step * i}" y="${T}" width="${step}" height="${H - T - B}" tabindex="0" data-i="${i}" role="button" aria-label="${esc(monthLabel(r.ym))}"/>
        <path class="bar${r.ym > currentYm ? ' proj' : ''}" d="${d}" style="pointer-events:none"/>`;
    }).join('')}
    <polyline class="ref" points="${linePts}" style="pointer-events:none"/>
    ${rows.map((r, i) => `<circle cx="${L + step * i + step / 2}" cy="${y(r.out)}" r="4" fill="var(--surface)" stroke="var(--s2)" stroke-width="2" style="pointer-events:none"/>`).join('')}
  </svg>`;

  return `<div class="chart" data-chart="proj">${svg}<div class="tip" hidden></div></div>
    <div class="legend-inline"><span><i class="sw" style="background:var(--s1)"></i>${t('chart.income')}</span><span><i class="dash-sw"></i>${t('chart.out')}</span><span><i class="sw" style="background:var(--s1);opacity:.45"></i>${t('chart.future')}</span></div>`;
}

export function bindChart(root, rows) {
  const box = root.querySelector('[data-chart="proj"]');
  if (!box) return;
  const tip = box.querySelector('.tip');
  const show = el => {
    const r = rows[+el.dataset.i];
    const bb = el.getBoundingClientRect(), cb = box.getBoundingClientRect();
    tip.innerHTML = `<strong>${esc(monthLabel(r.ym))}</strong><br>${t('chart.income')}: ${money(r.income)}<br>${t('chart.out')}: ${money(r.out)}<br>${t('chart.free')}: ${money(r.free)}`;
    tip.style.left = `${bb.left - cb.left + bb.width / 2}px`;
    tip.style.top = `${Math.max(40, bb.top - cb.top + 20)}px`;
    tip.hidden = false;
  };
  const hide = () => { tip.hidden = true; };
  box.querySelectorAll('.hit').forEach(h => {
    h.addEventListener('mouseenter', () => show(h));
    h.addEventListener('focus', () => show(h));
    h.addEventListener('mouseleave', hide);
    h.addEventListener('blur', hide);
  });
}

export function tableFor(rows) {
  return `<table class="data"><caption class="sr-only">${t('chart.projAria')}</caption>
    <thead><tr><th scope="col">${t('chart.month')}</th><th scope="col" class="n">${t('chart.income')}</th><th scope="col" class="n">${t('chart.out')}</th><th scope="col" class="n">${t('chart.free')}</th></tr></thead>
    <tbody>${rows.map(r => `<tr><th scope="row">${esc(monthLabel(r.ym))}</th><td class="n">${money(r.income)}</td><td class="n">${money(r.out)}</td><td class="n">${money(r.free)}</td></tr>`).join('')}</tbody></table>`;
}
