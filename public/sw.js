// WhiteVault™ Service Worker — PWA + Push
//
// La versión llega en la URL de registro (/sw.js?v=APP_VERSION). ANTES estaba
// escrita a mano y nunca se tocó, así que los nombres de caché no cambiaban
// jamás: el activate no borraba nada y el index.html precargado meses atrás
// seguía dentro. En cuanto la red fallaba un instante —constante en un móvil—
// la navegación caía a esa copia antigua, que apuntaba al JS antiguo (también
// cacheado para siempre), y la app arrancaba en una versión de hace meses sin
// forma de actualizarse. Si tocas esto, mantén la versión ligada al build.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const SHELL_CACHE = `wv-shell-${VERSION}`;
const RUNTIME_CACHE = `wv-runtime-${VERSION}`;

// El HTML NO se precachea nunca. Es el que decide qué bundle se carga, así que
// una copia vieja envenena todo lo demás. Sólo assets que no cambian de nombre.
const SHELL_ASSETS = [
  '/manifest.json',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: VERSION })))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase y CDNs externos: nunca se tocan.
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('esm.sh') || url.hostname.includes('cdn.tailwindcss.com')) {
    return;
  }

  // El propio SW: siempre de red, para que una versión nueva pueda entrar.
  if (url.pathname === '/sw.js') return;

  // Navegación: SIEMPRE de red. Sólo se cae a caché si de verdad no hay red, y
  // esa copia se guarda aparte para no mezclarla con el precache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((m) => m || Response.error()))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Assets con hash en el nombre (/assets/index-AbC123.js): son inmutables, así
  // que cache-first es seguro. Al cambiar de versión, el activate los purga.
  const esAssetConHash = url.pathname.startsWith('/assets/');
  if (esAssetConHash) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  // El resto (iconos, manifest): red primero y caché como red de seguridad, para
  // que nunca se queden congelados.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── PUSH NOTIFICATIONS ────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'WhiteVault', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'WhiteVault';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon-32.png',
    image: data.image,
    tag: data.tag || 'wv-default',
    renotify: data.renotify === true,
    requireInteraction: data.requireInteraction === true,
    silent: data.silent === true,
    vibrate: data.vibrate || [60, 40, 60],
    timestamp: Date.now(),
    data: {
      url: data.url || '/',
      type: data.type || 'generic',
      payload: data.payload || null,
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Notify all clients to re-subscribe
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGE' }));
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
