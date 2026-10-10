// オフラインでも起動できるよう、アプリ本体をまとめてキャッシュする。
// 中身を変えたら VERSION を上げる(上げないと古い版が配られ続ける)
const VERSION = 'v2';
const CACHE = 'nonogram-' + VERSION;
const FILES = [
  './', 'index.html', 'app.css', 'app.js', 'gen.js', 'puzzles.json', 'manifest.webmanifest',
  'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nonogram-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// 画面側の「更新する」ボタンから呼ばれる
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); }
    catch { return (await caches.match('index.html')) || Response.error(); }
  })());
});
