/* 一次性清理脚本（自愈用）
 * 旧版 service worker 在大陆网络下把"半截/失败响应"缓存住，导致 PWA 白屏。
 * 本文件仅在旧 SW 自动更新时被执行一次：清空所有缓存 → 刷新页面让其从网络重新加载 → 注销自身。
 * 之后本应用不再使用 service worker（vercel.app 在大陆不稳定，缓存风险大于收益）。
 * 手机自愈后可删除本文件。
 */
self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) {}
    try {
      var cls = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      cls.forEach(function (c) { try { c.reload(); } catch (e) {} });
    } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
  })());
});

/* 不拦截任何请求，全部走网络，避免再缓存到坏内容 */
