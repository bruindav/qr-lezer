// Eenvoudige service worker: maakt de app installeerbaar (zonder adresbalk) en werkt ook offline.
const CACHE = 'qr-lezer-v4';
const SHARE_CACHE = 'qr-gedeeld';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './help.html', './privacy.html', './disclaimer.html', './info.css', './icons/logo-mark.png',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SHARE_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Eerst het netwerk (altijd de nieuwste versie), bij geen verbinding de opgeslagen versie.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Plaatje gedeeld vanuit WhatsApp, mail enz.: tijdelijk bewaren en de app openen
  if (e.request.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      try {
        const data = await e.request.formData();
        const file = data.get('image');
        if (file) {
          const c = await caches.open(SHARE_CACHE);
          await c.put('gedeeld-plaatje', new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }));
        }
      } catch (err) {}
      return Response.redirect(new URL('./?gedeeld=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
