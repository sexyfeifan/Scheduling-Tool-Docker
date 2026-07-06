/**
 * Service Worker — PWA 离线支持
 * v3.22: 静态资源改为网络优先，确保更新及时生效
 */

const CACHE_NAME = 'scheduling-tool-v3.22';
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
  '/css/animal-island-components.css',
  '/css/animal-island-forms.css',
  '/css/animal-island-icons.css',
  '/js/main.js',
  '/js/vendor/html2canvas.min.js',
  '/js/modules/api.js',
  '/js/modules/date.js',
  '/js/modules/filters.js',
  '/js/modules/undo.js',
  '/js/modules/utils.js',
  '/js/modules/ui.js',
  '/js/modules/schedule.js',
  '/js/modules/schedule-card.js',
  '/js/modules/schedule-notice.js',
  '/js/modules/schedule-copy.js',
  '/js/modules/modal.js',
  '/js/modules/modal-project.js',
  '/js/modules/modal-export.js',
  '/js/modules/modal-backup.js',
  '/js/modules/export.js',
  '/js/modules/webhook.js',
  '/js/modules/settings.js',
  '/js/modules/settings-role.js',
  '/js/modules/settings-template.js',
  '/js/modules/clipboard.js',
  '/js/modules/dragdrop.js',
  '/js/modules/mobile.js',
  '/js/modules/sse.js',
  '/js/modules/heatmap.js',
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
  '/js/modules/mobileGestures.js',
  '/js/modules/offlineIndicator.js',
  '/js/modules/animal-icons.js',
  '/js/modules/validation.js',
  '/manifest.json'
];

// 安装：跳过等待，立即激活
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

// 激活：删除所有旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只处理 http/https 请求
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // API 请求：网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 同源静态资源：网络优先（确保更新及时生效）
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || (event.request.destination === 'document' ? caches.match('/index.html') : undefined);
        });
      })
    );
  }
});
