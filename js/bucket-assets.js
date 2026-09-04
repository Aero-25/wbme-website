/* WBME public Supabase Storage assets */
(function () {
  'use strict';

  var BUCKET_OBJECT_BASE = 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/object/public/WBME/';
  var BUCKET_RENDER_BASE = 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/';
  var IMAGE_RE = /\.(avif|gif|jpe?g|png|webp)$/i;

  /* The render endpoint is Supabase's image-transformation service, which is not
     available on every plan. When it is off it answers every request with an
     error, which takes every bucket image on the page down with it. Treat it as
     an optimisation we can lose: probe it once, and fall back to plain object
     URLs (which are always served) the moment it misbehaves. */
  var TRANSFORM_FLAG_KEY = 'wbme:bucket-transforms';
  var TRANSFORM_PROBE_PATH = 'propeller.png';
  var transformsEnabled = readTransformFlag();

  function readTransformFlag () {
    try {
      return window.sessionStorage.getItem(TRANSFORM_FLAG_KEY) !== 'off';
    } catch (err) {
      return true;
    }
  }

  function writeTransformFlag (value) {
    try {
      window.sessionStorage.setItem(TRANSFORM_FLAG_KEY, value);
    } catch (err) { /* private mode — the in-memory flag still holds for this page */ }
  }

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

  function isExternal (path) {
    return /^(https?:|data:|blob:)/i.test(path);
  }

  function bucketObject (path) {
    if (!path) return '';
    if (isExternal(path)) return path;
    return BUCKET_OBJECT_BASE + encodePath(path);
  }

  function renderUrl (path, options) {
    var params = new URLSearchParams();
    params.set('width', options.width || 1280);
    if (options.height) params.set('height', options.height);
    params.set('quality', options.quality || 70);
    params.set('resize', options.resize || 'contain');
    return BUCKET_RENDER_BASE + encodePath(path) + '?' + params.toString();
  }

  function bucketImage (path, options) {
    if (!path) return '';
    if (isExternal(path)) return path;
    if (!transformsEnabled) return bucketObject(path);
    return renderUrl(path, normaliseOptions(options));
  }

  function bucketAsset (path, options) {
    if (!path) return '';
    if (isExternal(path)) return path;
    options = normaliseOptions(options);
    if (options.raw || !isImagePath(path)) return bucketObject(path);
    return bucketImage(path, options);
  }

  /* Rewrite an already-built render URL into its plain object equivalent.
     Returns '' for anything that is not a render URL, so callers can tell
     "nothing to do" from "here is your fallback". */
  function toObjectUrl (url) {
    url = String(url || '');
    if (url.indexOf(BUCKET_RENDER_BASE) !== 0) return '';
    return BUCKET_OBJECT_BASE + url.slice(BUCKET_RENDER_BASE.length).split('?')[0];
  }

  function setBackground (el, url) {
    el.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
  }

  function backgroundUrl (el) {
    var raw = el.style.backgroundImage || '';
    var match = raw.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
    return match ? match[1] : '';
  }

  /* Swap every render URL already committed to the DOM over to object URLs. */
  function repairDocument (root) {
    root = root || document;

    root.querySelectorAll('img[src]').forEach(function (el) {
      var fallback = toObjectUrl(el.getAttribute('src'));
      if (fallback) el.setAttribute('src', fallback);
    });

    root.querySelectorAll('[style*="render/image"]').forEach(function (el) {
      var fallback = toObjectUrl(backgroundUrl(el));
      if (fallback) setBackground(el, fallback);
    });

    root.querySelectorAll('[data-lb]').forEach(function (el) {
      var fallback = toObjectUrl(el.getAttribute('data-lb'));
      if (fallback) el.setAttribute('data-lb', fallback);
    });
  }

  function disableTransforms () {
    if (!transformsEnabled) return;
    transformsEnabled = false;
    writeTransformFlag('off');
    repairDocument(document);
  }

  function probeTransforms () {
    if (!transformsEnabled) {
      repairDocument(document);
      return;
    }
    var probe = new Image();
    probe.onerror = disableTransforms;
    probe.src = renderUrl(TRANSFORM_PROBE_PATH, { width: 16, quality: 20, resize: 'contain' });
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

  /* Per-image safety net: catches a single asset the probe cannot speak for.
     Capture phase, because image errors do not bubble. */
  document.addEventListener('error', function (ev) {
    var el = ev.target;
    if (!el || el.tagName !== 'IMG') return;
    var fallback = toObjectUrl(el.getAttribute('src'));
    if (fallback) el.setAttribute('src', fallback);
  }, true);

  window.WBME_BUCKET_ASSET = bucketAsset;
  window.WBME_BUCKET_IMAGE = bucketImage;
  window.WBME_BUCKET_OBJECT = bucketObject;
  window.WBME_HYDRATE_BUCKET_ASSETS = hydrateBucketAssets;
  hydrateBucketAssets(document);
  probeTransforms();
})();
