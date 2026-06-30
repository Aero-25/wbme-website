/* WBME public Supabase Storage assets */
(function () {
  'use strict';

  var BUCKET_BASE = 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/object/public/WBME/';

  function bucketAsset (path) {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    return BUCKET_BASE + String(path).split('/').map(encodeURIComponent).join('/');
  }

  function setBackground (el, url) {
    el.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
  }

  function hydrateBucketAssets (root) {
    root = root || document;

    root.querySelectorAll('[data-bucket-bg]').forEach(function (el) {
      setBackground(el, bucketAsset(el.getAttribute('data-bucket-bg')));
    });

    root.querySelectorAll('[data-bucket-src]').forEach(function (el) {
      el.setAttribute('src', bucketAsset(el.getAttribute('data-bucket-src')));
    });

    root.querySelectorAll('[data-bucket-lb]').forEach(function (el) {
      el.setAttribute('data-lb', bucketAsset(el.getAttribute('data-bucket-lb')));
    });
  }

  window.WBME_BUCKET_ASSET = bucketAsset;
  window.WBME_HYDRATE_BUCKET_ASSETS = hydrateBucketAssets;
  hydrateBucketAssets(document);
})();
