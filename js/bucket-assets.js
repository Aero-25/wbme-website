/* WBME media — served from Cloudflare Pages, with Supabase Storage for new uploads.

   Every image the site ships with lives in /media as pre-sized WebP. Paths
   that are not mirrored locally (photos uploaded later through the admin
   portal) are served straight from the public Supabase "WBME" bucket.
   To mirror a new upload, add it to /media and to LOCAL_MEDIA below. */
(function () {
  'use strict';

  var BUCKET_OBJECT_BASE = 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/object/public/WBME/';

  /* Bucket path -> local file. A value without an extension is a photo stem
     with -800.webp and -1600.webp variants. */
  var LOCAL_MEDIA = {
   "44487799-6892-4b24-8c55-bc27cac35ce6.png": "media/brand/roundel-768.webp",
   "ChatGPT Image Jul 23, 2026, 06_25_06 AM.png": "media/hero/projects-showcase-1672.webp",
   "Hero Boat.png": "media/hero/hero-boat-1672.webp",
   "New Logo Big.png": "media/brand/logo-768.webp",
   "propeller.png": "media/brand/propeller-320.webp",
   "wbme photos for web 2026/New Complete Ships Rudder/1.jpg": "media/photos/new-complete-ships-rudder/1",
   "wbme photos for web 2026/New Complete Ships Rudder/11.jpg": "media/photos/new-complete-ships-rudder/11",
   "wbme photos for web 2026/New Complete Ships Rudder/21.jpg": "media/photos/new-complete-ships-rudder/21",
   "wbme photos for web 2026/New Complete Ships Rudder/6.jpg": "media/photos/new-complete-ships-rudder/6",
   "wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 1.jpg": "media/photos/pics-for-t/boilermaking/bottom-hull-plate-replacement-1",
   "wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 2.jpg": "media/photos/pics-for-t/boilermaking/bottom-hull-plate-replacement-2",
   "wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 1.jpg": "media/photos/pics-for-t/fabrication/stainless-steel-tank-1",
   "wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 2.jpg": "media/photos/pics-for-t/fabrication/stainless-steel-tank-2",
   "wbme photos for web 2026/Pics for T/Machining/Machining of new seal liners.jpg": "media/photos/pics-for-t/machining/machining-of-new-seal-liners",
   "wbme photos for web 2026/Pics for T/Machining/new thordon bushes.jpg": "media/photos/pics-for-t/machining/new-thordon-bushes",
   "wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg": "media/photos/pics-for-t/pipe-works/sea-water-inlet-strainer-1",
   "wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 2.jpg": "media/photos/pics-for-t/pipe-works/sea-water-inlet-strainer-2",
   "wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg": "media/photos/pics-for-t/propulsion/cpp-complete-refit-1",
   "wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg": "media/photos/pics-for-t/propulsion/cpp-complete-refit-2",
   "wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg": "media/photos/remove-and-fit-new-vessel-kort-nozzel-change-shaft-from-cpp-to-fixed/1",
   "wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/12.jpg": "media/photos/remove-and-fit-new-vessel-kort-nozzel-change-shaft-from-cpp-to-fixed/12",
   "wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/4.jpg": "media/photos/remove-and-fit-new-vessel-kort-nozzel-change-shaft-from-cpp-to-fixed/4",
   "wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/8.jpg": "media/photos/remove-and-fit-new-vessel-kort-nozzel-change-shaft-from-cpp-to-fixed/8"
  };

  function isExternal (path) {
    return /^(https?:|data:|blob:|\/|media\/|images\/)/i.test(path);
  }

  function encodePath (path) {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  function wantedWidth (options) {
    if (typeof options === 'number') return options;
    return (options && options.width) || 1280;
  }

  function localMedia (path, options) {
    var hit = LOCAL_MEDIA[path];
    if (!hit) return '';
    if (/\.[a-z0-9]+$/i.test(hit)) return hit;
    return hit + (wantedWidth(options) <= 900 ? '-800.webp' : '-1600.webp');
  }

  function bucketObject (path) {
    if (!path) return '';
    if (isExternal(path)) return path;
    return BUCKET_OBJECT_BASE + encodePath(path);
  }

  function bucketAsset (path, options) {
    if (!path) return '';
    if (isExternal(path)) return path;
    return localMedia(path, options) || bucketObject(path);
  }

  function setBackground (el, url) {
    el.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
  }

  function hydrateBucketAssets (root) {
    root = root || document;
    var wide = window.matchMedia('(max-width:860px)').matches ? 900 : 1600;

    root.querySelectorAll('[data-bucket-bg]').forEach(function (el) {
      setBackground(el, bucketAsset(el.getAttribute('data-bucket-bg'), wide));
    });

    root.querySelectorAll('[data-bucket-src]').forEach(function (el) {
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
      el.setAttribute('src', bucketAsset(el.getAttribute('data-bucket-src'), 640));
    });

    root.querySelectorAll('[data-bucket-lb]').forEach(function (el) {
      el.setAttribute('data-lb', bucketAsset(el.getAttribute('data-bucket-lb'), 1600));
    });
  }

  /* A bucket image that fails (project paused, file removed) is hidden rather
     than left as a broken-image icon. Capture phase: image errors don't bubble. */
  document.addEventListener('error', function (ev) {
    var el = ev.target;
    if (el && el.tagName === 'IMG' && String(el.getAttribute('src') || '').indexOf(BUCKET_OBJECT_BASE) === 0) {
      el.style.visibility = 'hidden';
    }
  }, true);

  window.WBME_BUCKET_ASSET = bucketAsset;
  window.WBME_BUCKET_IMAGE = bucketAsset;
  window.WBME_BUCKET_OBJECT = bucketObject;
  window.WBME_HYDRATE_BUCKET_ASSETS = hydrateBucketAssets;
  hydrateBucketAssets(document);
})();
