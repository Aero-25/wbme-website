/* WBME — Cinematic Experience engine */
(function () {
  'use strict';
  (function () { var l = document.createElement('link'); l.rel = 'preconnect'; l.href = 'https://kbmgpqwmgthswjkfmqfe.supabase.co'; l.crossOrigin = ''; document.head.appendChild(l); })();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ENABLE_CARD_TILT = false;

  /* ===== SCROLL REVEAL (IntersectionObserver-driven .p-rv) ===== */
  function initScrollReveal () {
    var els = document.querySelectorAll('.p-rv');
    if (!els.length) return;
    if (reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ===== PARALLAX DRIFT (transform-based, not scroll-jacking) ===== */
  var parallaxEls = [], parallaxTicking = false;
  function initParallax () {
    parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!parallaxEls.length || reduce) return;
    window.addEventListener('scroll', onParallaxScroll, { passive: true });
    onParallaxScroll();
  }
  function onParallaxScroll () {
    if (parallaxTicking) return;
    parallaxTicking = true;
    requestAnimationFrame(function () {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
        var offset = (rect.top - vh / 2) * speed * -1;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0) scale(1.12)';
      });
      parallaxTicking = false;
    });
  }

  /* ===== HEADER SCROLL STATE ===== */
  function initHeaderScrollState () {
    var hdr = document.querySelector('.site-hdr');
    if (!hdr) return;
    function update () { hdr.classList.toggle('scrolled', window.scrollY > 40); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ===== ACTIVE NAV (current page, not scroll-spy — this is a multi-page site) ===== */
  function markActiveNav () {
    var path = (location.pathname.split('/').pop() || 'index.html');
    document.querySelectorAll('.site-nav a[href],.drawer a[href]').forEach(function (a) {
      var href = a.getAttribute('href').split('/').pop();
      if (href === path) a.classList.add('active');
    });
  }

  /* ===== SCROLL PROGRESS BAR ===== */
  function initScrollProgress () {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;
    var fill = bar.querySelector('i');
    function update () {
      var h = document.documentElement;
      var scrollTop = h.scrollTop || document.body.scrollTop;
      var height = h.scrollHeight - h.clientHeight;
      var pct = height > 0 ? scrollTop / height : 0;
      fill.style.transform = 'scaleX(' + pct.toFixed(4) + ')';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ===== SCROLL-TRIGGERED COUNTERS (data-count) ===== */
  function initScrollCounters () {
    // exclude counters that live inside the old rail-loop panels (index.html) — those are
    // owned exclusively by showPanelContent()'s own count-up, which fires on panel open and
    // would otherwise be restarted from 0 by this observer once the panel's internal scroll
    // container brings the element into view.
    var els = Array.prototype.filter.call(document.querySelectorAll('[data-count]'), function (el) {
      return !el.closest('.panel');
    });
    if (!els.length) return;
    function run (el) {
      var to = +el.dataset.count, sf = el.dataset.suffix || '', c = 0, st = Math.max(1, Math.ceil(to / 26));
      if (reduce) { el.textContent = to + sf; return; }
      var t = setInterval(function () { c += st; if (c >= to) { c = to; clearInterval(t); } el.textContent = c + sf; }, 26);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); } });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }
  var ENABLE_EMBERS = false;
  var isMobile = function () { return window.matchMedia('(max-width:860px)').matches; };
  var EMAIL = ['info', 'wbme.com.na'].join('@'); // built at runtime so the address isn't scrapable from page source
  function mailHref (subject) { return 'mailto:' + EMAIL + (subject ? '?subject=' + encodeURIComponent(subject) : ''); }
  function hydrateEmailLinks () {
    document.querySelectorAll('[data-mail]').forEach(function (a) {
      a.setAttribute('href', mailHref(a.getAttribute('data-subject') || ''));
      if (a.hasAttribute('data-mail-text')) a.textContent = EMAIL;
    });
  }
  hydrateEmailLinks();
  var bucketAsset = window.WBME_BUCKET_ASSET || function (path, width) {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    var enc = String(path).split('/').map(encodeURIComponent).join('/');
    // serve resized + compressed via Supabase's render endpoint (raw photos are 3-4 MB each)
    return 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/' + enc +
           '?width=' + (width || 1280) + '&quality=72&resize=contain';
  };

  var bgs = document.querySelectorAll('.bg');

  function lock () { document.body.classList.add('locked'); }
  function unlock () { document.body.classList.remove('locked'); }
  function keyActivate (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }
  var ready = false;

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var lb = document.getElementById('lightbox');
    if (lb && lb.classList.contains('open')) return closeLb();
    if (drawer.classList.contains('open')) return closeDrawer();
  });
  document.addEventListener('keydown', function (e) {
    var ae = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && ae && ae.hasAttribute && ae.hasAttribute('data-lb')) { e.preventDefault(); ae.click(); return; }
  });

  /* ===== CORE START (guaranteed, before enhancements) ===== */
  document.body.classList.add('ready');

  /* ===== DRAWER ===== */
  var drawer = document.getElementById('drawer');
  var burgerBtn = document.getElementById('burger');
  function openDrawer () { drawer.classList.add('open'); if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'true'); lock(); }
  function closeDrawer () { drawer.classList.remove('open'); if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false'); if (!current) unlock(); }
  if (burgerBtn) burgerBtn.addEventListener('click', openDrawer);
  document.querySelector('[data-drawer-close]').addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a[data-key]').forEach(function (a) {
    a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button');
    a.addEventListener('click', function () { closeDrawer(); var k = a.dataset.key; setTimeout(function () { openPanel(k, firstCard(k)); }, 280); });
    a.addEventListener('keydown', keyActivate);
  });

  /* ===== NEW ENGINE: reveal / parallax / header state / active nav / progress / counters ===== */
  initScrollReveal();
  initParallax();
  initHeaderScrollState();
  markActiveNav();
  initScrollProgress();
  initScrollCounters();

  var chatbotFab = document.getElementById('chatbotFab');
  if (chatbotFab) {
    chatbotFab.addEventListener('click', function () {
      if (window.WBME_CHATBOT) { window.WBME_CHATBOT.toggle(); return; }
      window.location.href = 'contact.html';   // fallback if the assistant script fails to load
    });
  }

  /* hooks for the assistant (js/chatbot.js) */
  window.WBME_MAIL = mailHref;
  window.WBME_EMAIL = EMAIL;

  /* ===== LIGHTBOX ===== */
  var lb = document.getElementById('lightbox'), lbImg = lb ? lb.querySelector('img') : null, lbCaption = document.getElementById('lbCaption'), gThumbs = [], gIdx = 0;
  function refreshThumbs () { gThumbs = Array.prototype.slice.call(document.querySelectorAll('[data-lb]')); }
  function showLb (i) {
    gIdx = (i + gThumbs.length) % gThumbs.length;
    lbImg.src = gThumbs[gIdx].getAttribute('data-lb');
    lbImg.alt = gThumbs[gIdx].querySelector('img') ? gThumbs[gIdx].querySelector('img').alt : 'Selected project image';
    if (lbCaption) lbCaption.textContent = gThumbs[gIdx].getAttribute('data-caption') || lbImg.alt;
  }
  function openLb (i) { refreshThumbs(); showLb(i); lb.classList.add('open'); }
  function closeLb () { if (lb) lb.classList.remove('open'); }
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('[data-lb]');
    if (g) { refreshThumbs(); openLb(gThumbs.indexOf(g)); }
  });
  if (lb) {
    lb.querySelector('.lc').addEventListener('click', closeLb);
    lb.querySelector('.lp').addEventListener('click', function () { showLb(gIdx - 1); });
    lb.querySelector('.lnx').addEventListener('click', function () { showLb(gIdx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  }

  /* ===== CONTACT FORM ===== */
  // To send enquiries in-page: create a form at https://formspree.io (send to the address in EMAIL above)
  // and paste its endpoint below. Until then, the form opens the visitor's email app.
  var FORM_ENDPOINT = 'https://formspree.io/f/REPLACE_WITH_YOUR_ID';
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (inp) {
        var f = inp.closest('.field'), v = inp.value.trim() !== '';
        if (inp.type === 'email' && v) v = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
        f.classList.toggle('invalid', !v); if (!v) ok = false;
      });
      if (!ok) return;
      var g = function (n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; };
      var done = function () { form.style.display = 'none'; var okMsg = document.querySelector('.form-ok'); if (okMsg) okMsg.style.display = 'block'; };
      var mailto = function () {
        var body = encodeURIComponent('Name: ' + g('name') + '\nEmail: ' + g('email') + '\nPhone: ' + g('phone') + '\nService: ' + g('service') + '\n\n' + g('message'));
        window.location.href = mailHref('Quote request - ' + g('name')) + '&body=' + body;
        done();
      };
      if (FORM_ENDPOINT.indexOf('REPLACE_WITH_YOUR_ID') !== -1) { mailto(); return; }
      var btn = form.querySelector('[type=submit]'); if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (r) { r.ok ? done() : mailto(); })
        .catch(mailto);
    });
    form.querySelectorAll('input,textarea').forEach(function (i) {
      i.addEventListener('input', function () { i.closest('.field').classList.remove('invalid'); });
    });
  }

  /* ===== ENHANCEMENTS (optional; never block the core) ===== */
  try {
  /* ===== PRELOADER ===== */
  (function preload () {
    var pre = document.getElementById('preloader'), ring = document.getElementById('plRing'), pct = document.getElementById('plPct');
    if (!pre) { ready = true; document.body.classList.add('ready'); return; }
    var SEEN_KEY = 'wbme_preloader_seen';
    var seenBefore = false;
    try { seenBefore = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { /* sessionStorage unavailable (privacy mode) — fall back to full gauge */ }
    if (seenBefore) {
      pre.classList.add('fast-skip');
      setTimeout(function () { pre.classList.add('done'); document.body.classList.add('ready'); ready = true; }, 220);
      return;
    }
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
    var MIN = 1150, CAP = 2600, start = Date.now();             // keep the loader crisp; MIN covers a full propeller-spin rotation (1.08s)
    var heroBg = document.querySelector('.bg');
    var heroBgUrl = heroBg && heroBg.style.backgroundImage ? heroBg.style.backgroundImage.replace(/^url\((['"]?)(.*)\1\)$/, '$2') : '';
    var urls = [heroBgUrl].filter(Boolean); // wait only for the first visible hero image, if this page has one
    var total = urls.length + 1, loaded = 0, finished = false;
    function setBar (p) {
      p = Math.max(0, Math.min(1, p));
      if (ring) ring.style.setProperty('--p', (p * 360) + 'deg');
      if (pct) pct.textContent = Math.round(p * 100) + '%';
    }
    function bump () { loaded++; }
    function finish () { if (finished) return; finished = true; setBar(1); setTimeout(function () { pre.classList.add('done'); document.body.classList.add('ready'); ready = true; }, 280); }
    urls.forEach(function (u) { var im = new Image(); im.onload = bump; im.onerror = bump; im.src = u; }); // wait for the real photos
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(bump, bump); } else { bump(); }
    (function tick () {
      var el = Date.now() - start, assetsDone = loaded >= total, timeP = Math.min(1, el / MIN);
      setBar(assetsDone ? timeP : Math.min(0.92, timeP));      // fill quickly; hold at 92% only while the first image arrives
      if ((el >= MIN && assetsDone) || el >= CAP) { finish(); return; }
      requestAnimationFrame(tick);
    })();
  })();

  /* ===== EMBERS ===== */
  (function embers () {
    var cv = document.getElementById('embers'); if (!ENABLE_EMBERS || !cv || reduce) return;
    var ctx = cv.getContext('2d'), parts = [];
    function resize () { cv.width = window.innerWidth; cv.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    for (var i = 0; i < 40; i++) parts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.5 + 0.4, s: Math.random() * 0.4 + 0.12, o: Math.random() * 0.5 + 0.15, d: Math.random() * 6.28 });
    (function draw () {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i]; p.y -= p.s; p.d += 0.01; p.x += Math.sin(p.d) * 0.3;
        if (p.y < -6) { p.y = cv.height + 6; p.x = Math.random() * cv.width; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = 'rgba(227,195,114,' + (p.o * (0.55 + 0.45 * Math.sin(p.d * 3))) + ')'; ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  })();

  /* ===== LOCAL TIME (Walvis Bay) ===== */
  (function clock () {
    var lt = document.getElementById('localtime'); if (!lt) return;
    function up () {
      var s;
      try { s = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Windhoek', hour: '2-digit', minute: '2-digit' }); }
      catch (e) { s = ''; }
      lt.innerHTML = s ? ('Walvis Bay <b>' + s + '</b> · 22°57′S') : 'Walvis Bay · Namibia';
    }
    up(); setInterval(up, 15000);
  })();

  /* ===== MODAL SCROLL: parallax hero + progress ===== */
  document.querySelectorAll('.panel-scroll').forEach(function (sc) {
    sc.addEventListener('scroll', function () {
      var mp = document.getElementById('modalProgress');
      if (mp) { var max = sc.scrollHeight - sc.clientHeight; mp.querySelector('i').style.transform = 'scaleX(' + (max > 0 ? (sc.scrollTop / max) : 0) + ')'; }
    });
  });

  } catch (err) { /* enhancements are optional — core experience already running */ }

})();
