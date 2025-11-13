const CACHE_NAME = 'smartfit-cache-v1';

const ASSETS = [
  './src/index.html',
  './manifest.json',
  './src/style.css',
  './src/app.css',
  './src/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Evento 'install' → se ejecuta cuando el Service Worker se instala
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Archivos en caché');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Activa el nuevo Service Worker inmediatamente
});

// Evento 'activate' → limpia caches antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Reclama el control de las páginas abiertas
});

// Evento 'fetch' → intercepta las peticiones de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Sirviendo desde caché:', event.request.url);
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Guardamos la nueva respuesta en caché
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
