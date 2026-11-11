// Offline: the whole app is cached on install, so it keeps working with the wi-fi off.
// Data never goes through here; it lives in localStorage. Bump VERSION on every deploy.
const VERSION = 'prumo-mwcly03j';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'fonts/fonts.css',
  'fonts/onest-latin-ext.woff2',
  'fonts/onest-latin.woff2',
  'css/app.css',
  'css/login.css',
  'css/tokens.css',
  'js/a11y.js',
  'js/actions.js',
  'js/advisor-chart.js',
  'js/advisor.js',
  'js/ai.js',
  'js/brands-data.js',
  'js/brands.js',
  'js/captcha.js',
  'js/chart.js',
  'js/cloud.js',
  'js/config.js',
  'js/export.js',
  'js/finance.js',
  'js/format.js',
  'js/game.js',
  'js/i18n-extra.js',
  'js/i18n-tone.js',
  'js/i18n.js',
  'js/main.js',
  'js/prefs.js',
  'js/quick.js',
  'js/store.js',
  'js/tone.js',
  'js/tour.js',
  'js/ui.js',
  'js/views/admin.js',
  'js/views/assinaturas.js',
  'js/views/bancos.js',
  'js/views/bf.js',
  'js/views/cartao.js',
  'js/views/cofres.js',
  'js/views/comecar.js',
  'js/views/conquistas.js',
  'js/views/conselheiro.js',
  'js/views/contas.js',
  'js/views/dados.js',
  'js/views/entradas.js',
  'js/views/gastos.js',
  'js/views/home-hero.js',
  'js/views/inicio.js',
  'js/views/mei.js',
  'js/views/parts.js',
  'js/views/personalizar.js',
  'js/views/retro.js',
  'js/views/welcome.js',
  'icons/3d/bag.png',
  'icons/3d/bulb.png',
  'icons/3d/calculator.png',
  'icons/3d/calender.png',
  'icons/3d/card.png',
  'icons/3d/chart.png',
  'icons/3d/chat-bubble.png',
  'icons/3d/computer.png',
  'icons/3d/dollar.png',
  'icons/3d/fire.png',
  'icons/3d/gift.png',
  'icons/3d/lock.png',
  'icons/3d/medal.png',
  'icons/3d/money-bag.png',
  'icons/3d/notebook.png',
  'icons/3d/rocket.png',
  'icons/3d/scissor.png',
  'icons/3d/sheild.png',
  'icons/3d/star.png',
  'icons/3d/target.png',
  'icons/3d/tick.png',
  'icons/3d/travel.png',
  'icons/3d/trophy.png',
  'icons/3d/wallet.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first: a new deploy shows up on the next open. The cache is only for offline use.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key, { ignoreSearch: true })));
});
