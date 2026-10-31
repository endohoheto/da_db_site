// オフラインでも起動できるよう、アプリ本体をまとめてキャッシュする。
// 電波があるときはいつも最新を取りに行き、取れなかったときだけキャッシュを使う
// (キャッシュを先に出すと、ホーム画面のアプリに古い版が残り続けた)。
// 中身を変えたら VERSION も上げる(オフライン用の控えを入れ替えるため)
const VERSION = 'v12';
const CACHE = 'nonogram-' + VERSION;
const FILES = [
  './', 'index.html', 'app.css', 'app.js', 'gen.js', 'config.js', 'puzzles.json', 'manifest.webmanifest',
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
    try {
      // 3秒で返ってこなければ、電波が弱いとみなしてキャッシュを使う
      const res = await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3000))]);
      if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch {
      return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('index.html')) || Response.error();
    }
  })());
});
