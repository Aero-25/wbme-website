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
    params.set('format', options.format || 'webp');
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

    function loadBackground (el) {
      setBackground(el, bucketAsset(el.getAttribute('data-bucket-bg'), {
        width: window.matchMedia('(max-width:860px)').matches ? 900 : 1600,
        quality: 74,
        resize: 'cover',
        format: 'webp'
      }));
    }

    var backgrounds = Array.prototype.slice.call(root.querySelectorAll('[data-bucket-bg]'));
    if ('IntersectionObserver' in window) {
      var backgroundObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          loadBackground(entry.target);
          backgroundObserver.unobserve(entry.target);
        });
      }, { rootMargin: '500px 0px' });
      backgrounds.forEach(function (el) { backgroundObserver.observe(el); });
    } else {
      backgrounds.forEach(loadBackground);
    }

    var imageObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (entry.target._wbmeLoadRemote) entry.target._wbmeLoadRemote();
        imageObserver.unobserve(entry.target);
      });
    }, { rootMargin: '600px 0px' }) : null;

    root.querySelectorAll('[data-bucket-src]').forEach(function (el) {
      var path = el.getAttribute('data-bucket-src');
      var eager = el.getAttribute('fetchpriority') === 'high' || el.hasAttribute('data-eager');
      var isHero = !!el.closest('.page-hero__media,.hero__media');
      var isGallery = !!el.closest('.gallery-item');
      var width = isHero
        ? (window.matchMedia('(max-width: 760px)').matches ? 900 : 1800)
        : (isGallery ? 720 : (window.matchMedia('(max-width: 760px)').matches ? 800 : 1200));
      el.setAttribute('loading', eager ? 'eager' : 'lazy');
      el.setAttribute('decoding', 'async');

      function loadRemote () {
        if (navigator.connection && navigator.connection.saveData) return;
        var remoteUrl = bucketImage(path, { width: width, quality: 76, resize: 'cover', format: 'webp' });
        var upgrade = new Image();
        upgrade.decoding = 'async';
        if (eager) upgrade.fetchPriority = 'high';
        upgrade.onload = function () {
          el.removeAttribute('srcset');
          el.removeAttribute('sizes');
          el.src = remoteUrl;
        };
        upgrade.src = remoteUrl;
      }

      el._wbmeLoadRemote = loadRemote;
      if (eager || !imageObserver) loadRemote();
      else imageObserver.observe(el);
    });

    root.querySelectorAll('[data-bucket-lb]').forEach(function (el) {
      el.setAttribute('data-lb', bucketAsset(el.getAttribute('data-bucket-lb'), {
        width: 1800,
        quality: 82,
        resize: 'contain',
        format: 'webp'
      }));
    });
  }

  window.WBME_BUCKET_ASSET = bucketAsset;
  window.WBME_BUCKET_IMAGE = bucketImage;
  window.WBME_BUCKET_OBJECT = bucketObject;
  window.WBME_HYDRATE_BUCKET_ASSETS = hydrateBucketAssets;
  hydrateBucketAssets(document);
})();
