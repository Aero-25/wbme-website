/* WBME public Supabase Storage assets */
(function () {
  'use strict';

  var BUCKET_OBJECT_BASE = 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/object/public/WBME/';
  var BUCKET_RENDER_BASE = 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/';
  var IMAGE_RE = /\.(avif|gif|jpe?g|png|webp)$/i;

  function encodePath (path) {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  function normaliseOptions (options) {
    if (typeof options === 'number') return { width: options };
    return options || {};
  }

  function isImagePath (path) {
    return IMAGE_RE.test(String(path).split('?')[0]);
  }

  function bucketObject (path) {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    return BUCKET_OBJECT_BASE + encodePath(path);
  }

  function bucketImage (path, options) {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    options = normaliseOptions(options);
    var params = new URLSearchParams();
    params.set('width', options.width || 1280);
    if (options.height) params.set('height', options.height);
    params.set('quality', options.quality || 70);
    params.set('resize', options.resize || 'contain');
    return BUCKET_RENDER_BASE + encodePath(path) + '?' + params.toString();
  }

  function bucketAsset (path, options) {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    options = normaliseOptions(options);
    if (options.raw || !isImagePath(path)) return bucketObject(path);
    return bucketImage(path, options);
  }

  function setBackground (el, url) {
    el.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
  }

  function hydrateBucketAssets (root) {
    root = root || document;

    root.querySelectorAll('[data-bucket-bg]').forEach(function (el) {
      setBackground(el, bucketAsset(el.getAttribute('data-bucket-bg'), {
        width: window.matchMedia('(max-width:860px)').matches ? 900 : 1400,
        quality: 70,
        resize: 'contain'
      }));
    });

    root.querySelectorAll('[data-bucket-src]').forEach(function (el) {
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
      el.setAttribute('src', bucketAsset(el.getAttribute('data-bucket-src'), {
        width: 640,
        quality: 68,
        resize: 'contain'
      }));
    });

    root.querySelectorAll('[data-bucket-lb]').forEach(function (el) {
      el.setAttribute('data-lb', bucketAsset(el.getAttribute('data-bucket-lb'), {
        width: 1600,
        quality: 82,
        resize: 'contain'
      }));
    });
  }

  window.WBME_BUCKET_ASSET = bucketAsset;
  window.WBME_BUCKET_IMAGE = bucketImage;
  window.WBME_BUCKET_OBJECT = bucketObject;
  window.WBME_HYDRATE_BUCKET_ASSETS = hydrateBucketAssets;
  hydrateBucketAssets(document);
})();
