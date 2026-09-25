// Сервис-воркер архива: отдаёт расшифрованные файлы из Cache Storage по путям …/app/*.
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!url.pathname.includes('/app/')) return;
  e.respondWith((async () => {
    const cache = await caches.open('biosignal-vault');
    let path = url.pathname; if (path.endsWith('/')) path += 'index.html';
    return (await cache.match(path)) || new Response('Архив заблокирован — введите пароль на главной.', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
