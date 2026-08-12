/* 基金记账 PWA 离线缓存
 * 策略：同域 GET 走 stale-while-revalidate（缓存优先、后台静默更新）
 *  - 桌面图标第二次起直接秒开，不再重新下载 1MB 的 index.html
 *  - 用户数据全在 localStorage，与缓存的 HTML 无关，绝不丢数据
 *  - 跨域资源（ECharts CDN / 新浪行情）不拦截，照常走网络
 */
const CACHE = 'ft-shell-v1';
const ASSETS = ['./', './index.html', './pu-core.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域走网络
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
