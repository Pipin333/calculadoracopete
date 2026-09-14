/**
 * Service Worker - Cuánto Rinde PWA v1.0
 * Habilita instalación en pantalla de inicio y arranque instantáneo.
 */

const CACHE_NAME = 'cuantorinde-v1.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './presupuesto.html',
  './terminos.html',
  './privacidad.html',
  './css/styles.css?v=5.5',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './javascript/script.js?v=5.4',
  './javascript/solver.js',
  './javascript/catalog.js',
  './javascript/helpers.js',
  './javascript/renderer.js',
  './javascript/productApi.js',
  './javascript/productImages.js',
  './javascript/budgetSliders.js',
  './javascript/mixerPreferences.js',
  './javascript/shorturl.js',
  './javascript/config.js'
];

// Instalación: Cachear assets estáticos del App Shell de forma resiliente
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('⚡ [PWA] Cacheando App Shell resiliente');
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[PWA] Advertencia cacheando recurso individual:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [PWA] Purgando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Estrategia Network-First con fallback a caché
self.addEventListener('fetch', (event) => {
  // Ignorar requests que no sean GET o que vayan a Firebase/Google APIs
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  
  if (url.origin.includes('firebaseio.com') || url.origin.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Guardar copia fresca en caché si la respuesta es válida
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback a caché si no hay internet
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
