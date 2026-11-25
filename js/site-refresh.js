/* Clears what a browser may still hold from the OLD WBME website, which
   lived on this same domain before the new site went live (Oct 2026).

   Runs once per browser (bump VER to run it again for everyone):
   - unregisters any service worker the old site installed, so it can't
     keep serving old pages;
   - deletes Cache Storage left by that worker;
   - fetches /cache-reset.txt, whose response carries
     `Clear-Site-Data: "cache"` (see _headers), so the browser drops its
     HTTP cache for the domain.
   Cookies, localStorage and the assistant's chat memory are not touched.
   Nothing here blocks the page or is needed for it to work. */
(function () {
  var KEY = 'wbme:site-refresh', VER = '1', store = null;
  try { store = window.localStorage; if (store.getItem(KEY) === VER) return; } catch (e) { store = null; }

  var jobs = [];
  if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
    jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.unregister(); }));
    }));
  }
  if ('caches' in window) {
    jobs.push(caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }));
  }
  /* Only when we can remember it was done: otherwise (storage blocked)
     the HTTP cache would be wiped on every page view. */
  if (store && window.fetch) {
    jobs.push(fetch('/cache-reset.txt', { cache: 'no-store', credentials: 'same-origin' }));
  }

  Promise.all(jobs.map(function (p) { return p.then(null, function () {}); })).then(function () {
    try { if (store) store.setItem(KEY, VER); } catch (e) {}
  });
})();
