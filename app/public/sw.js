// キャッシュバージョン: 新しいデプロイ時にバージョン番号を更新すること
const CACHE_NAME = 'study-app-v1';
// アプリシェル: オフライン時にも必ず返せるリソースをキャッシュする
const SHELL_URLS = [
  './',
  './favicon.ico',
  './favicon.svg',
  './manifest.json',
  './css/quiz.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
});

self.addEventListener('activate', (event) => {
  // 古いキャッシュを削除する
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ナビゲーションリクエスト（HTMLページ）: キャッシュ優先、失敗時は index.html フォールバック
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./').then(
        (cached) => cached || fetch(request).catch(() => caches.match('./').then((r) => r || new Response('', { status: 503 })))
      )
    );
    return;
  }

  // 同一オリジンのリソース: キャッシュ優先、未キャッシュはネットワークから取得してキャッシュ
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch((err) => {
              console.warn('[SW] キャッシュの保存に失敗しました:', err);
            });
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // 外部リソース: ネットワーク優先
  event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
});
