/* Kill switch for a service worker left behind by the OLD WBME website.
   The new site has no service worker. Browsers re-check an installed
   worker's script on each visit; when they find this one it takes over,
   deletes the old worker's caches, removes itself and reloads open tabs
   from the network, so returning visitors see the new site.
   _redirects serves this same file at the other common worker paths. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (tabs) { tabs.forEach(function (t) { if (t.navigate) t.navigate(t.url); }); })
  );
});
