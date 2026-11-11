// Offline: the whole app is cached on install, so it keeps working with the wi-fi off.
// Data never goes through here; it lives in localStorage. Bump VERSION on every deploy.
const VERSION = 'prumo-mwc5skyz';
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
  'js/chart.js',
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
  'js/ui.js',
  'js/views/assinaturas.js',
  'js/views/bancos.js',
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
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Cache first, refresh in the background. Pages fall back to the cached app.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const key = req.mode === 'navigate' ? 'index.html' : req;
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res.ok) cache.put(req.mode === 'navigate' ? 'index.html' : req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
