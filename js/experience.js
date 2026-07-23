/* WBME — Cinematic Experience engine */
(function () {
  'use strict';
  (function () { var l = document.createElement('link'); l.rel = 'preconnect'; l.href = 'https://kbmgpqwmgthswjkfmqfe.supabase.co'; l.crossOrigin = ''; document.head.appendChild(l); })();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===== SCROLL REVEAL (IntersectionObserver-driven .p-rv) ===== */
  var revealObserver = null;
  function initScrollReveal () {
    var els = document.querySelectorAll('.p-rv');
    if (!els.length) return;
    if (reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); revealObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { revealObserver.observe(el); });
  }
  /* public hook: register newly-injected .p-rv content (e.g. dynamically
     rendered blog cards) with the same reveal system used for static markup */
  window.WBME_OBSERVE_REVEAL = function (root) {
    var els = (root || document).querySelectorAll('.p-rv:not(.in)');
    if (reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    if (!revealObserver) { initScrollReveal(); return; }
    els.forEach(function (el) { revealObserver.observe(el); });
  };

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
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0) scale(1.06)';
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
    var els = document.querySelectorAll('[data-count]');
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
  var EMAIL = ['info', 'wbme.com.na'].join('@'); // built at runtime so the address isn't scrapable from page source
  function mailHref (subject) { return 'mailto:' + EMAIL + (subject ? '?subject=' + encodeURIComponent(subject) : ''); }
  function hydrateEmailLinks () {
    document.querySelectorAll('[data-mail]').forEach(function (a) {
      a.setAttribute('href', mailHref(a.getAttribute('data-subject') || ''));
      if (a.hasAttribute('data-mail-text')) a.textContent = EMAIL;
    });
  }
  hydrateEmailLinks();

  function lock () { document.body.classList.add('locked'); }
  function unlock () { document.body.classList.remove('locked'); }
  function keyActivate (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }
  var ready = false;

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var lb = document.getElementById('lightbox');
    if (lb && lb.classList.contains('open')) return closeLb();
    var cm = document.getElementById('contactModal');
    if (cm && cm.classList.contains('open')) return closeContactModal();
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
  function closeDrawer () { drawer.classList.remove('open'); if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false'); unlock(); }
  if (burgerBtn) burgerBtn.addEventListener('click', openDrawer);
  document.querySelector('[data-drawer-close]').addEventListener('click', closeDrawer);

  /* ===== CONTACT MODAL (replaces the standalone Contact page as the primary contact flow) ===== */
  var contactModal = document.getElementById('contactModal');
  var serviceModal = document.getElementById('serviceModal');
  function openContactModal () {
    if (!contactModal) return;
    closeDrawer();
    if (serviceModal) serviceModal.classList.remove('open'); // swap straight over from a service popup, no double lock/unlock
    contactModal.classList.add('open');
    lock();
    var firstField = contactModal.querySelector('input,textarea,select');
    if (firstField) firstField.focus();
  }
  function closeContactModal () { if (contactModal) { contactModal.classList.remove('open'); unlock(); } }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest && e.target.closest('[data-contact-open]');
    if (opener) { e.preventDefault(); openContactModal(); return; }
    var closer = e.target.closest && e.target.closest('[data-contact-close]');
    if (closer) { closeContactModal(); return; }
    var topBtn = e.target.closest && e.target.closest('[data-scroll-top]');
    if (topBtn) window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ===== SERVICE DETAIL MODAL (Services page "Learn more" popups) ===== */
  if (serviceModal) {
    var SERVICES_DATA = {
      rigging: {
        num: '01 → 06', title: 'Rigging',
        images: ['wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg', 'wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg'],
        desc: "Rigging is the first job on almost every propulsion or plant repair — safely lifting, aligning and positioning propeller shafts, rudder shafts, engines, alternators, generators, compressors, pumps and motors before any strip-down or refit can begin. WBME plans the lift around the vessel or plant's own constraints: tight engine rooms, awkward access, and equipment that can't simply be craned out in one piece. Get the rigging wrong and everything downstream — machining tolerances, seal fit, alignment — is compromised, so it's treated as precision work in its own right, not a preliminary step.",
        scope: 'Components prepared for installation, plus pipe work, tanks, burners and steel structures.',
        tags: ['Shafts', 'Engines', 'Pumps', 'Motors']
      },
      fitting: {
        num: '02 → 06', title: 'Fitting & Turning',
        images: ['wbme photos for web 2026/Pics for T/Machining/new thordon bushes.jpg', 'wbme photos for web 2026/Pics for T/Machining/Machining of new seal liners.jpg'],
        desc: "Fitting and turning covers the full strip-overhaul-rebuild cycle: stripping worn components down, machining new parts or repairing existing ones to tolerance, then re-assembling and installing them back into service. This is where WBME's machine shop does its work — new thordon bushes, seal liners and shaft components turned to the exact dimensions a vessel or plant needs, so equipment goes back into service fitting as well as it did the day it was built.",
        scope: 'Machined replacements, overhauls, precision repairs and fit-for-install components.',
        tags: ['Overhaul', 'New parts', 'Install']
      },
      boiler: {
        num: '03 → 06', title: 'Boiler Making',
        images: ['wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 1.jpg', 'wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 2.jpg'],
        desc: 'Boiler making covers the structural steelwork a vessel or plant depends on: hull plate, deck, bridge, walkways, ladders, masts, trawl doors, gantries, A-frames and ducting. WBME handles renewal and modification of existing structures as well as complete new builds, working from design and templates through to material preparation and fabrication in mild steel, stainless and aluminium — matched to the corrosion and load demands of the marine environment.',
        scope: 'Hull, deck, bridge, walkways, ladders, masts, trawl doors, gantries, A-frames and ducting.',
        tags: ['Mild steel', 'Stainless', 'Aluminium']
      },
      fabrication: {
        num: '04 → 06', title: 'Fabrication',
        images: ['wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 1.jpg', 'wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 2.jpg'],
        desc: 'Fabrication turns raw steel into the domes, tanks, burners, droppers, condensers, skips, base plates and custom structural work a job calls for. WBME profile-cuts, rolls and bends material to spec, then manufactures and installs the finished structure on site or in the workshop — stainless steel tanks and pressure vessels built to hold up under continuous marine and industrial use.',
        scope: 'Domes, tanks, burners, droppers, condensers, skips, base plates and custom structural work.',
        tags: ['Cutting', 'Rolling', 'Bending', 'Install']
      },
      pipework: {
        num: '05 → 06', title: 'Pipe Works',
        images: ['wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg', 'wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 2.jpg'],
        desc: 'Pipe works covers the renewal, modification and complete replacement of piping systems across pumps, motors, manifolds, auxiliaries, main engines, tanks, condensers, water refiners and valves — sea water inlet strainers included. WBME designs the run, builds the jigs and prepares every material in steel, copper and galvanized pipe before installation, so systems go back into service without a leak or a misaligned joint.',
        scope: 'Pumps, motors, manifolds, auxiliaries, main engines, tanks, condensers, water refiners and valves.',
        tags: ['Steel', 'Copper', 'Galvanized', 'Valves']
      },
      welding: {
        num: '06 → 06', title: 'Welding',
        images: ['wbme photos for web 2026/New Complete Ships Rudder/6.jpg', 'wbme photos for web 2026/New Complete Ships Rudder/11.jpg'],
        desc: "Welding underpins almost every other discipline at WBME — gas welding, brazing, silver soldering, MIG, TIG and arc welding across mild steel, stainless steel, aluminium and cast iron. It's the joining and repair work that turns fabricated parts and structural steel into a finished, load-bearing result, and the strengthening work that keeps an ageing structure or hull in service rather than being scrapped.",
        scope: 'Mild steel, stainless steel, aluminium, cast iron, strengthening and repairs to existing structures.',
        tags: ['MIG', 'TIG', 'Arc', 'Cast iron']
      }
    };
    var smGallery = document.getElementById('smGallery');
    var smNum = document.getElementById('smNum');
    var smTitle = document.getElementById('serviceModalTitle');
    var smDesc = document.getElementById('smDesc');
    var smScope = document.getElementById('smScope');
    var smTags = document.getElementById('smTags');
    function openServiceModal (key) {
      var d = SERVICES_DATA[key];
      if (!d) return;
      if (smGallery) {
        smGallery.innerHTML = d.images.map(function (path) {
          var url = window.WBME_BUCKET_IMAGE ? window.WBME_BUCKET_IMAGE(path, { width: 900, quality: 75, resize: 'cover' }) : '';
          return '<div class="sm-shot" style="background-image:url(\'' + url.replace(/'/g, '%27') + '\')"></div>';
        }).join('');
      }
      if (smNum) smNum.textContent = d.num;
      if (smTitle) smTitle.textContent = d.title;
      if (smDesc) smDesc.textContent = d.desc;
      if (smScope) smScope.textContent = d.scope;
      if (smTags) smTags.innerHTML = d.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('');
      closeDrawer();
      serviceModal.classList.add('open');
      lock();
    }
    function closeServiceModal () {
      serviceModal.classList.remove('open');
      if (!(contactModal && contactModal.classList.contains('open'))) unlock();
    }
    document.addEventListener('click', function (e) {
      var opener = e.target.closest && e.target.closest('[data-service-open]');
      if (opener) { e.preventDefault(); openServiceModal(opener.getAttribute('data-service-open')); return; }
      var closer = e.target.closest && e.target.closest('[data-service-close]');
      if (closer) closeServiceModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && serviceModal.classList.contains('open')) closeServiceModal();
    });
  }

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
  function refreshThumbs (scope) { gThumbs = Array.prototype.slice.call((scope || document).querySelectorAll('[data-lb]')); }
  function showLb (i) {
    gIdx = (i + gThumbs.length) % gThumbs.length;
    lbImg.src = gThumbs[gIdx].getAttribute('data-lb');
    lbImg.alt = gThumbs[gIdx].querySelector('img') ? gThumbs[gIdx].querySelector('img').alt : 'Selected project image';
    if (lbCaption) lbCaption.textContent = gThumbs[gIdx].getAttribute('data-caption') || lbImg.alt;
  }
  function openLb (i) { showLb(i); lb.classList.add('open'); }
  function closeLb () { if (lb) lb.classList.remove('open'); }
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('[data-lb]');
    if (g) { refreshThumbs(g.closest('[data-lb-scope]')); openLb(gThumbs.indexOf(g)); }
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
  function wireContactForm (form) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (inp) {
        var f = inp.closest('.ticket-field,.field'), v = inp.value.trim() !== '';
        if (inp.type === 'email' && v) v = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
        f.classList.toggle('invalid', !v); if (!v) ok = false;
      });
      if (!ok) return;
      var g = function (n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; };
      var done = function () { form.style.display = 'none'; var okMsg = form.parentElement.querySelector('.form-ok'); if (okMsg) okMsg.style.display = 'block'; };
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
      i.addEventListener('input', function () { var f = i.closest('.ticket-field,.field'); if (f) f.classList.remove('invalid'); });
    });
  }
  wireContactForm(document.getElementById('contactForm'));
  wireContactForm(document.getElementById('contactModalForm'));

  /* ===== ENHANCEMENTS (optional; never block the core) ===== */
  try {
  /* ===== PRELOADER ===== */
  (function preload () {
    var pre = document.getElementById('preloader'), rail = document.getElementById('plRail'), pct = document.getElementById('plPercent');
    if (!pre) { ready = true; document.body.classList.add('ready'); return; }
    /* Always plays the full minimum-3s sequence on every page load — this is
       a deliberate owner requirement (a per-session "seen before" skip was
       tried earlier and made the loader flash for ~150ms after the first
       page view, which read as broken). */
    var MIN = 3000, CAP = 6000, start = Date.now();
    var total = 1, loaded = 0, finished = false;
    function setBar (p) {
      p = Math.max(0, Math.min(1, p));
      if (rail) rail.style.transform = 'scaleX(' + p + ')';
      if (pct) pct.textContent = Math.round(p * 100) + '%';
    }
    function bump () { loaded++; }
    function finish () { if (finished) return; finished = true; setBar(1); setTimeout(function () { pre.classList.add('done'); document.body.classList.add('ready'); ready = true; }, 150); }
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(bump, bump); } else { bump(); }
    (function tick () {
      var el = Date.now() - start, assetsDone = loaded >= total, timeP = Math.min(1, el / MIN);
      setBar(assetsDone ? timeP : Math.min(0.92, timeP));
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

  /* ===== PROPELLER SPIN WATCHDOG =====
     The FAB propeller must visibly spin on every machine, always (owner
     requirement). If the CSS animation isn't running for any reason —
     stale cached stylesheet, an OS/browser setting stripping animations,
     an overriding rule — drive the rotation from JS instead. */
  (function propellerWatchdog () {
    setTimeout(function () {
      document.querySelectorAll('.chatbot-ring img, .cb-prop img').forEach(function (img) {
        var cs = getComputedStyle(img);
        if (cs.animationName !== 'none' && cs.animationPlayState !== 'paused') return;
        var angle = 0, last = null;
        (function spin (ts) {
          if (last !== null) angle = (angle + (ts - last) * 0.4) % 360; // 0.4deg/ms ≈ 0.9s per rotation
          last = ts;
          img.style.transform = 'rotate(' + angle.toFixed(1) + 'deg)';
          requestAnimationFrame(spin);
        })(performance.now());
      });
    }, 600);
  })();

})();
