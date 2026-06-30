/* WBME — Cinematic Experience engine */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = function () { return window.matchMedia('(max-width:860px)').matches; };
  var bucketAsset = window.WBME_BUCKET_ASSET || function (path) {
    var base = 'https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/object/public/WBME/';
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    return base + String(path).split('/').map(encodeURIComponent).join('/');
  };

  var cards = [
    { key:'about',      bg:bucketAsset('wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg'), img:bucketAsset('wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg'), s:'Est. 1999 · Walvis Bay', t:'About',      d:'25 years of service excellence in marine engineering, ship repair and metal work.' },
    { key:'why',        bg:bucketAsset('wbme photos for web 2026/New Complete Ships Rudder/12.jpg'), img:bucketAsset('wbme photos for web 2026/New Complete Ships Rudder/12.jpg'), s:'The standard',           t:'Why WBME',   d:'Skilled professionals, a reputation for excellence and partnerships built through commitment.' },
    { key:'services',   bg:bucketAsset('wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg'), img:bucketAsset('wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg'), s:'Six disciplines',        t:'Services',   d:'Ship repair, maintenance, fitting, rigging, pipe works, boiler making, fabrication and welding.' },
    { key:'industries', bg:bucketAsset('wbme photos for web 2026/Pics for T/Machining/new thordon bushes.jpg'), img:bucketAsset('wbme photos for web 2026/Pics for T/Machining/new thordon bushes.jpg'), s:'Who we serve',           t:'Industries', d:'Serving the local marine industry while expanding into new metal-work sectors.' },
    { key:'safety',     bg:bucketAsset('wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 1.jpg'), img:bucketAsset('wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 1.jpg'), s:'Quality assured',        t:'Safety',     d:'Reliable solutions focused on safety, quality, efficiency and cost-effectiveness.' },
    { key:'projects',   bg:bucketAsset('wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg'), img:bucketAsset('wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg'), s:'Our work',               t:'Projects',   d:'From dry-dock repairs to precision machining — a look at what we build and restore.' },
    { key:'reviews',    bg:bucketAsset('wbme photos for web 2026/Complete new propeller shaft bushes and stuffing box/20240807_110555.jpg'), img:bucketAsset('wbme photos for web 2026/Complete new propeller shaft bushes and stuffing box/20240807_110555.jpg'), s:'Ready for the job',       t:'Readiness',  d:'Wide service range, historical knowledge and practical support for demanding work.' },
    { key:'contact',    bg:bucketAsset('wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg'), img:bucketAsset('wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg'), s:'Get in touch',           t:'Contact',    d:'Headquarters: 8th Street East, Industrial Area, Walvis Bay. Call +264 (0)64 285 700.' }
  ];
  var N = cards.length;

  var bgs   = document.querySelectorAll('.bg'),
      rail  = document.getElementById('rail'),
      railWrap = document.querySelector('.rail-wrap'),
      copy  = document.getElementById('copy'),
      navA  = document.querySelectorAll('#nav a[data-key]'),
      progB = document.getElementById('progBar'),
      cnEl  = document.getElementById('cn'),
      backdrop = document.getElementById('panelBackdrop');

  bgs.forEach(function (b) { b.style.backgroundImage = "url('" + cards[+b.dataset.i].bg + "')"; });

  /* build looping rail (3x duplicated) */
  var REPEAT = 3, railCards = [];
  (function build () {
    var html = '';
    for (var k = 0; k < N * REPEAT; k++) {
      var c = cards[k % N];
      html += '<div class="card" data-key="' + c.key + '" data-i="' + (k % N) + '">' +
              '<img src="' + c.img + '" alt="' + c.t + '">' +
              '<div class="lbl"><div class="s">' + c.s + '</div><div class="b">' + c.t + '</div></div></div>';
    }
    rail.innerHTML = html;
    railCards = rail.querySelectorAll('.card');
    railCards.forEach(function (el) {
      el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Open ' + cards[+el.dataset.i].t);
      el.addEventListener('click', function () { if (didDrag) return; openPanel(el.dataset.key, el); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(el.dataset.key, el); } });
    });
  })();

  var cardStep = 218;
  function measure () {
    if (railCards.length > 1) {
      var d = railCards[1].getBoundingClientRect().left - railCards[0].getBoundingClientRect().left;
      if (d > 10) cardStep = d;
    }
  }
  measure();
  window.addEventListener('resize', measure);

  /* visual state (no transform) */
  function setVisual (i) {
    bgs.forEach(function (b) { b.classList.toggle('on', +b.dataset.i === i); });
    var c = cards[i];
    copy.innerHTML = '<div class="swap"><div class="ey">' + c.s + '</div><div class="ti" aria-hidden="true">' + c.t + '</div>' +
      '<div class="hero-actions"><button class="explore" data-key="' + c.key + '">Explore ' + c.t + ' →</button><a class="hero-call" href="tel:+26464285700">Call WBME</a></div></div>';
    copy.querySelector('.explore').addEventListener('click', function () { openPanel(c.key, firstCard(c.key)); });
    navA.forEach(function (a) { a.classList.toggle('act', a.dataset.key === c.key); });
    railCards.forEach(function (el) { el.classList.toggle('focus', +el.dataset.i === i); });
    if (copy) copy.classList.toggle('anim', !dragging && Math.abs(velocity) < speed * 1.7);
    if (cnEl) cnEl.textContent = '0' + (i + 1);
    if (progB) progB.style.transform = 'translateX(' + (i * 100) + '%)';
  }

  /* continuous drift loop */
  var offset = 0, speed = 96, lastActive = -1, ready = false;
  var dragging = false, dragStartX = 0, dragStartOffset = 0, didDrag = false;
  var velocity = speed, lastOffset = 0, lastFrame = 0;
  function loop (now) {
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
    lastFrame = now;
    if (dragging) {
      velocity = (offset - lastOffset) / Math.max(dt, 1 / 120); // capture fling velocity
    } else {
      var target = (current || reduce) ? 0 : speed;
      velocity += (target - velocity) * Math.min(1, dt * 4.2);  // momentum eases back into the ambient drift
      offset += velocity * dt;
    }
    lastOffset = offset;
    var wrap = cardStep * N;
    var x = ((offset % wrap) + wrap) % wrap;
    rail.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
    if (copy) {                                       // motion blur on the headline at speed
      var b = reduce ? 0 : Math.min(6, Math.max(0, (Math.abs(velocity) - speed) * 0.018));
      copy.style.filter = b > 0.3 ? 'blur(' + b.toFixed(2) + 'px)' : '';
    }
    var active = ((Math.round(offset / cardStep) % N) + N) % N;
    if (active !== lastActive) { lastActive = active; setVisual(active); }
    requestAnimationFrame(loop);
  }
  function keyActivate (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }
  navA.forEach(function (a) {
    a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button');
    a.addEventListener('click', function () { openPanel(a.dataset.key, firstCard(a.dataset.key)); });
    a.addEventListener('keydown', keyActivate);
  });

  /* ===== CORE START (guaranteed, before enhancements) ===== */
  document.body.classList.add('ready');
  if (progB) progB.style.width = (100 / N) + '%';
  if (copy) copy.classList.add('first');
  setVisual(0);
  setTimeout(function () { if (copy) copy.classList.remove('first'); }, 900);
  requestAnimationFrame(loop);

  /* ===== GRAB TO SCROLL (mouse + touch) with momentum ===== */
  if (railWrap) {
    var pdown = false;
    railWrap.addEventListener('pointerdown', function (e) { pdown = true; didDrag = false; dragStartX = e.clientX; });
    window.addEventListener('pointermove', function (e) {
      if (!pdown) return;
      if (!dragging) {
        if (Math.abs(e.clientX - dragStartX) <= 4) return;
        dragging = true; didDrag = true; dragStartX = e.clientX; dragStartOffset = offset; railWrap.classList.add('grabbing');
      }
      offset = dragStartOffset - (e.clientX - dragStartX);
    });
    var endDrag = function () { pdown = false; if (dragging) { dragging = false; railWrap.classList.remove('grabbing'); } };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  /* ===== PANEL (modal morph) ===== */
  var current = null, animating = false, lastTrigger = null;
  function restoreFocus () { if (lastTrigger && lastTrigger.focus) { try { lastTrigger.focus(); } catch (_) {} } }
  function panelEl (key) { return document.getElementById('panel-' + key); }
  function firstCard (key) { return document.querySelector('.card[data-key="' + key + '"]'); }
  function cardImg (key) { for (var i = 0; i < N; i++) if (cards[i].key === key) return cards[i].img; return ''; }
  function lock () { document.body.classList.add('locked'); }
  function unlock () { document.body.classList.remove('locked'); }

  function modalRect () {
    var vw = window.innerWidth, vh = window.innerHeight, width, height, top;
    if (isMobile()) { width = vw * 0.94; height = vh * 0.92; top = vh * 0.04; }
    else { width = Math.min(1100, vw * 0.92); height = vh * 0.86; top = vh * 0.07; }
    return { left: (vw - width) / 2, top: top, width: width, height: height, radius: isMobile() ? 20 : 26 };
  }

  function makeMorph (key, M) {
    var m = document.createElement('div');
    m.className = 'morph';
    m.style.backgroundImage = "url('" + cardImg(key) + "')";
    m.style.width = M.width + 'px'; m.style.height = M.height + 'px';
    m.style.top = '0'; m.style.left = '0'; m.style.transformOrigin = 'top left';
    document.body.appendChild(m);
    return m;
  }
  function cardToModalTransform (r, M) {
    return 'translate(' + r.left + 'px,' + r.top + 'px) scale(' + (r.width / M.width) + ',' + (r.height / M.height) + ')';
  }

  function showPanelContent (panel) {
    panel.classList.add('open');
    requestAnimationFrame(function () { panel.classList.add('shown'); });
    var sc = panel.querySelector('.panel-scroll'); if (sc) sc.scrollTop = 0;
    panel.setAttribute('aria-hidden', 'false');
    var mp = document.getElementById('modalProgress'); if (mp) { mp.classList.add('on'); mp.querySelector('i').style.transform = 'scaleX(0)'; }
    var cb = panel.querySelector('[data-close]'); if (cb) cb.focus();
    panel.querySelectorAll('[data-count]').forEach(function (el) {
      var to = +el.dataset.count, sf = el.dataset.suffix || '', c = 0, st = Math.max(1, Math.ceil(to / 26));
      var t = setInterval(function () { c += st; if (c >= to) { c = to; clearInterval(t); } el.textContent = c + sf; }, 26);
    });
  }

  function doOpen (key, cardEl) {
    var panel = panelEl(key); if (!panel) return;
    backdrop.classList.add('open');
    if (reduce || !cardEl) { showPanelContent(panel); lock(); return; }
    var r = cardEl.getBoundingClientRect(), M = modalRect();
    var m = makeMorph(key, M);
    m.style.transition = 'none';
    m.style.transform = cardToModalTransform(r, M);
    m.style.borderRadius = '14px';
    void m.offsetHeight;
    animating = true; lock();
    requestAnimationFrame(function () {
      m.style.transition = 'transform .6s cubic-bezier(.65,0,.35,1),border-radius .6s ease';
      m.style.transform = 'translate(' + M.left + 'px,' + M.top + 'px) scale(1,1)';
      m.style.borderRadius = M.radius + 'px';
    });
    var done = function () {
      m.removeEventListener('transitionend', onEnd);
      showPanelContent(panel);
      m.style.transition = 'opacity .3s'; m.style.opacity = '0';
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); animating = false; }, 320);
    };
    var onEnd = function (e) { if (e.propertyName === 'transform') done(); };
    m.addEventListener('transitionend', onEnd);
    setTimeout(function () { if (animating) done(); }, 780);
  }

  function doClose () {
    var key = current, panel = panelEl(key); if (!panel) return;
    backdrop.classList.remove('open');
    var mp = document.getElementById('modalProgress'); if (mp) mp.classList.remove('on');
    var cardEl = firstCard(key);
    if (reduce || !cardEl) { panel.classList.remove('open', 'shown'); panel.setAttribute('aria-hidden', 'true'); unlock(); restoreFocus(); return; }
    var r = cardEl.getBoundingClientRect(), M = modalRect();
    var m = makeMorph(key, M);
    m.style.transition = 'none';
    m.style.transform = 'translate(' + M.left + 'px,' + M.top + 'px) scale(1,1)';
    m.style.borderRadius = M.radius + 'px';
    void m.offsetHeight;
    panel.classList.remove('open', 'shown'); panel.setAttribute('aria-hidden', 'true');
    animating = true;
    requestAnimationFrame(function () {
      m.style.transition = 'transform .54s cubic-bezier(.65,0,.35,1),border-radius .54s ease';
      m.style.transform = cardToModalTransform(r, M);
      m.style.borderRadius = '14px';
    });
    var fin = function () { if (m.parentNode) m.parentNode.removeChild(m); animating = false; unlock(); restoreFocus(); };
    m.addEventListener('transitionend', function (e) { if (e.propertyName === 'transform') fin(); });
    setTimeout(function () { if (animating) fin(); }, 720);
  }

  function openPanel (key, cardEl) {
    if (animating || current === key || !panelEl(key)) return;
    lastTrigger = cardEl || document.activeElement;
    current = key;
    history.pushState({ panel: key }, '', '#' + key);
    doOpen(key, cardEl);
  }
  function closePanel () {
    if (!current || animating) return;
    if (history.state && history.state.panel) { history.back(); }
    else { doClose(); current = null; history.replaceState(null, '', location.pathname + location.search); }
  }
  window.addEventListener('popstate', function (e) {
    var key = (e.state && e.state.panel) || null;
    if (key && panelEl(key)) { if (current !== key) { current = key; doOpen(key, firstCard(key)); } }
    else if (current) { doClose(); current = null; }
  });

  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closePanel); });
  backdrop.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('lightbox').classList.contains('open')) return closeLb();
    if (drawer.classList.contains('open')) return closeDrawer();
    if (current) closePanel();
  });
  document.addEventListener('keydown', function (e) {
    var ae = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && ae && ae.hasAttribute && ae.hasAttribute('data-lb')) { e.preventDefault(); ae.click(); return; }
    if (e.key === 'Tab' && current) {               // focus trap inside the open panel
      var panel = panelEl(current); if (!panel) return;
      var f = Array.prototype.filter.call(panel.querySelectorAll('button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && ae === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
    }
  });

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

  var chatbotFab = document.getElementById('chatbotFab');
  if (chatbotFab) {
    chatbotFab.addEventListener('click', function () { openPanel('contact', firstCard('contact')); });
  }

  /* ===== LIGHTBOX ===== */
  var lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img'), lbCaption = document.getElementById('lbCaption'), gThumbs = [], gIdx = 0;
  function refreshThumbs () { gThumbs = Array.prototype.slice.call(document.querySelectorAll('[data-lb]')); }
  function showLb (i) {
    gIdx = (i + gThumbs.length) % gThumbs.length;
    lbImg.src = gThumbs[gIdx].getAttribute('data-lb');
    lbImg.alt = gThumbs[gIdx].querySelector('img') ? gThumbs[gIdx].querySelector('img').alt : 'Selected project image';
    if (lbCaption) lbCaption.textContent = gThumbs[gIdx].getAttribute('data-caption') || lbImg.alt;
  }
  function openLb (i) { refreshThumbs(); showLb(i); lb.classList.add('open'); }
  function closeLb () { lb.classList.remove('open'); }
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('[data-lb]');
    if (g) { refreshThumbs(); openLb(gThumbs.indexOf(g)); }
  });
  lb.querySelector('.lc').addEventListener('click', closeLb);
  lb.querySelector('.lp').addEventListener('click', function () { showLb(gIdx - 1); });
  lb.querySelector('.lnx').addEventListener('click', function () { showLb(gIdx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });

  /* ===== CONTACT FORM ===== */
  // To send enquiries in-page: create a form at https://formspree.io (send to info@wbme.com.na)
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
        window.location.href = 'mailto:info@wbme.com.na?subject=' + encodeURIComponent('Quote request - ' + g('name')) + '&body=' + body;
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
    var pre = document.getElementById('preloader'), bar = document.getElementById('plBar');
    if (!pre) { ready = true; document.body.classList.add('ready'); return; }
    if (reduce) { pre.classList.add('done'); document.body.classList.add('ready'); ready = true; return; }
    var n = 0;
    var t = setInterval(function () {
      n += Math.floor(Math.random() * 8) + 5;
      if (n >= 100) { n = 100; clearInterval(t); setTimeout(function () { pre.classList.add('done'); document.body.classList.add('ready'); ready = true; }, 260); }
      if (bar) bar.style.transform = 'scaleX(' + (n / 100) + ')';
    }, 80);
  })();

  /* ===== MAGNETIC · CARD TILT ===== */
  if (window.matchMedia('(hover:hover)').matches) {
    railCards.forEach(function (el) {
      el.addEventListener('mouseleave', function () { el.style.transform = ''; var im = el.querySelector('img'); if (im) im.style.transform = ''; });
      el.addEventListener('mousemove', function (e) {
        if (dragging) return;
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(800px) rotateY(' + (px * 11) + 'deg) rotateX(' + (-py * 11) + 'deg) translateY(-8px)';
        var im = el.querySelector('img'); if (im) im.style.transform = 'scale(1.12) translate(' + (px * -14) + 'px,' + (py * -14) + 'px)';
      });
    });
    var mag = function (el, k) {
      el.addEventListener('mousemove', function (e) { var r = el.getBoundingClientRect(); el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * k) + 'px,' + ((e.clientY - r.top - r.height / 2) * k) + 'px)'; });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    };
    navA.forEach(function (a) { mag(a, 0.3); });
  }

  /* ===== EMBERS ===== */
  (function embers () {
    var cv = document.getElementById('embers'); if (!cv || reduce) return;
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
      var hero = sc.querySelector('.panel-hero');
      if (hero) hero.style.backgroundPosition = 'center calc(50% + ' + (sc.scrollTop * 0.12) + 'px)';
      var mp = document.getElementById('modalProgress');
      if (mp) { var max = sc.scrollHeight - sc.clientHeight; mp.querySelector('i').style.transform = 'scaleX(' + (max > 0 ? (sc.scrollTop / max) : 0) + ')'; }
    });
  });

  } catch (err) { /* enhancements are optional — core experience already running */ }

  /* ===== DEEP LINK ===== */
  var initKey = location.hash ? location.hash.slice(1) : '';
  if (initKey && panelEl(initKey)) {
    current = initKey;
    history.replaceState({ panel: initKey }, '', '#' + initKey);
    setTimeout(function () { doOpen(initKey, firstCard(initKey)); }, 450);
  }
})();
