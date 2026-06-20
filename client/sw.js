/**
 * Service Worker — PWA 离线支持
 * 缓存静态资源，支持离线访问
 */

const CACHE_NAME = 'scheduling-tool-v2.60';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/schedule.css',
  '/css/modal.css',
  '/css/panels.css',
  '/css/animations.css',
  '/css/mobile.css',
  '/css/theme.css',
  '/css/overlays.css',
  '/css/viewSwitcher.css',
  '/js/main.js',
  '/js/modules/api.js',
  '/js/modules/viewSwitcher.js',
  '/js/modules/monthView.js',
  '/js/modules/personnelView.js',
  '/js/modules/dashboardView.js',
  '/js/modules/quickAdd.js',
  '/js/modules/historyPanel.js',
  '/js/modules/search.js',
  '/js/modules/clientExport.js',
  '/js/modules/conflict.js',
  '/js/modules/keyboardNav.js',
  '/js/modules/validation.js',
  '/manifest.json'
];

// 安装事件 — 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] 部分资源缓存失败:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活事件 — 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截 — 网络优先，回退到缓存
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 请求：网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 缓存 GET 请求的响应
          if (event.request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败时回退到缓存
          return caches.match(event.request);
        })
    );
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // 离线回退页面
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
