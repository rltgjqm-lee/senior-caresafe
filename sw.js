// 시니어안심살핌 (senior-caresafe) 서비스 워커 - 오프라인 에어갭 캐시
const CACHE_NAME = 'senior-caresafe-v1.0.8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './css/common.css',
  './css/sgds.css',
  './css/mobile.css',
  './css/tablet.css',
  './css/desktop.css',
  './js/app.js',
  './js/core/uid.js',
  './js/core/addressData.json',
  './js/config/districts.js',
  './js/utils/notifier.js',
  './js/utils/masking.js',
  './js/session/sessionManager.js',
  './js/services/validationService.js',
  './js/api/client.js',
  './js/views/step1AgencyView.js',
  './js/views/step2TargetView.js',
  './js/views/step3WorkSelectView.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('캐시 등록 중 일부 리소스 누락:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 네트워크 우선, 실패 시 캐시 폴백 (Network First with Cache Fallback)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
