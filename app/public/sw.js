// キャッシュバージョン: 新しいデプロイ時にバージョン番号を更新すること
const CACHE_NAME = 'study-app-v1';
const URLS_TO_CACHE = [
  './',
  './css/quiz.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(
      (response) => response || fetch(event.request).catch(() => new Response('', { status: 503 }))
    )
  );
});
