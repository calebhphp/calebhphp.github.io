// Logos next to what the person pays for: subscriptions, banks and cards.
// A known service gets its glyph on its own colour. Banks that have no free glyph get a monogram tile on the
// brand colour, so nothing here is a copy of a logo we do not have the right to ship.
import { GLYPHS } from './brands-data.js';
import { esc } from './format.js';

// [pattern on the name, glyph slug, tile colour override, monogram]
const RULES = [
  [/netflix/i, 'netflix'], [/spotify/i, 'spotify'], [/youtube\s*(music|premium)|yt\s*music/i, 'youtubemusic'], [/youtube/i, 'youtube'],
  [/hbo|\bmax\b/i, 'hbomax'], [/apple\s*tv/i, 'appletv'], [/apple\s*music/i, 'applemusic'], [/icloud/i, 'icloud'], [/deezer/i, 'deezer'],
  [/crunchyroll/i, 'crunchyroll'], [/paramount/i, 'paramountplus'], [/copilot/i, 'githubcopilot'], [/github/i, 'github'],
  [/claude|anthropic/i, 'claude'], [/figma/i, 'figma'], [/notion/i, 'notion'], [/google\s*(drive|one)/i, 'googledrive'], [/dropbox/i, 'dropbox'],
  [/\buber\b/i, 'uber'], [/ifood/i, 'ifood'], [/duolingo/i, 'duolingo'], [/playstation|\bps\s*plus/i, 'playstation'], [/steam/i, 'steam'], [/twitch/i, 'twitch'],
  [/nubank|\bnu\b/i, 'nubank'], [/mercado\s*pago/i, 'mercadopago'], [/picpay/i, 'picpay'], [/\bpix\b/i, 'pix'],
  [/visa/i, 'visa'], [/master\s*card|mastercard/i, 'mastercard'], [/amex|american\s*express/i, 'americanexpress'], [/wise/i, 'wise'], [/paypal/i, 'paypal'],
  [/\bvivo\b/i, 'vivo'],
  // no free glyph: coloured monogram
  [/ita[uú]/i, null, '#EC7000', 'It'], [/\binter\b|banco\s*inter/i, null, '#FF7A00', 'In'], [/bradesco/i, null, '#CC092F', 'Br'],
  [/santander/i, null, '#EC0000', 'Sa'], [/caixa/i, null, '#005CA9', 'Cx'], [/banco\s*do\s*brasil|\bbb\b/i, null, '#FCFC30', 'BB', '#0B3C8F'],
  [/c6/i, null, '#242424', 'C6'], [/disney/i, null, '#113CCF', 'D+'], [/prime|amazon/i, null, '#00A8E1', 'P'], [/xp\b/i, null, '#111111', 'XP'],
];

// Which tile belongs to a name, or null when it is just a name.
export function brandOf(name) {
  const n = String(name || '');
  for (const [re, slug, color, mono, ink] of RULES) {
    if (!re.test(n)) continue;
    if (slug && GLYPHS[slug]) return { slug, hex: '#' + GLYPHS[slug].hex, d: GLYPHS[slug].d };
    if (!slug) return { mono, hex: color, ink };
  }
  return null;
}

const luminance = hex => {
  const h = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4));
  return .2126 * r + .7152 * g + .0722 * b;
};

// A small rounded tile. Decorative: the name is always written next to it.
export function logo(name, size = 36) {
  const b = brandOf(name);
  const letter = (String(name || '?').trim()[0] || '?').toUpperCase();
  if (!b) return `<span class="logo logo-plain" style="--sz:${size}px" aria-hidden="true">${esc(letter)}</span>`;
  const ink = b.ink || (luminance(b.hex) > .45 ? '#111' : '#fff');
  if (b.d) return `<span class="logo" style="--sz:${size}px;background:${b.hex}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="${ink}"><path d="${b.d}"/></svg></span>`;
  return `<span class="logo logo-mono" style="--sz:${size}px;background:${b.hex};color:${ink}" aria-hidden="true">${esc(b.mono)}</span>`;
}
