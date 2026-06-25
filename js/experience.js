/* WBME — Cinematic Experience engine */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = function () { return window.matchMedia('(max-width:860px)').matches; };

  var cards = [
    { key:'about',    bg:'images/1.jpg',   img:'images/1.jpg', s:'Est. 1999 · Walvis Bay', t:'About',    d:'Marine engineering built on craftsmanship since 1999 — no job too big, no job too small.' },
    { key:'services', bg:'images/bg1.jpg', img:'images/6.jpg', s:'Six disciplines',        t:'Services', d:'Rigging, fabrication, machining and welding — full-service marine engineering under one roof.' },
    { key:'projects', bg:'images/2.jpg',   img:'images/2.jpg', s:'Our work',               t:'Projects', d:'From dry-dock repairs to precision machining — a look at what we build and restore.' },
    { key:'contact',  bg:'images/5.jpg',   img:'images/5.jpg', s:'Get in touch',           t:'Contact',  d:'8th Street East, Walvis Bay. Tell us about your project — we will get back fast.' }
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
      el.addEventListener('click', function () { openPanel(el.dataset.key, el); });
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
    copy.innerHTML = '<div class="swap"><div class="ey">' + c.s + '</div><h1 class="ti">' + c.t + '</h1>' +
      '<p class="de">' + c.d + '</p><button class="explore" data-key="' + c.key + '">Explore ' + c.t + ' →</button></div>';
    copy.querySelector('.explore').addEventListener('click', function () { openPanel(c.key, firstCard(c.key)); });
    navA.forEach(function (a) { a.classList.toggle('act', a.dataset.key === c.key); });
    if (cnEl) cnEl.textContent = '0' + (i + 1);
    if (progB) progB.style.transform = 'translateX(' + (i * 100) + '%)';
  }

  /* continuous drift loop */
  var offset = 0, speed = 0.7, paused = false, lastActive = -1;
  function loop () {
    if (!reduce && !current && !paused) offset += speed;
    var wrap = cardStep * N;
    var x = ((offset % wrap) + wrap) % wrap;
    rail.style.transform = 'translateX(' + (-x) + 'px)';
    var active = ((Math.round(offset / cardStep) % N) + N) % N;
    if (active !== lastActive) { lastActive = active; setVisual(active); }
    requestAnimationFrame(loop);
  }
  if (railWrap) {
    railWrap.addEventListener('mouseenter', function () { paused = true; });
    railWrap.addEventListener('mouseleave', function () { paused = false; });
  }

  navA.forEach(function (a) { a.addEventListener('click', function () { openPanel(a.dataset.key, firstCard(a.dataset.key)); }); });

  /* ===== PANEL (modal morph) ===== */
  var current = null, animating = false;
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
    var cardEl = firstCard(key);
    if (reduce || !cardEl) { panel.classList.remove('open', 'shown'); panel.setAttribute('aria-hidden', 'true'); unlock(); return; }
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
    var fin = function () { if (m.parentNode) m.parentNode.removeChild(m); animating = false; unlock(); };
    m.addEventListener('transitionend', function (e) { if (e.propertyName === 'transform') fin(); });
    setTimeout(function () { if (animating) fin(); }, 720);
  }

  function openPanel (key, cardEl) {
    if (animating || current === key || !panelEl(key)) return;
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

  /* ===== DRAWER ===== */
  var drawer = document.getElementById('drawer');
  function openDrawer () { drawer.classList.add('open'); lock(); }
  function closeDrawer () { drawer.classList.remove('open'); if (!current) unlock(); }
  document.getElementById('burger').addEventListener('click', openDrawer);
  document.querySelector('[data-drawer-close]').addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a[data-key]').forEach(function (a) {
    a.addEventListener('click', function () { closeDrawer(); var k = a.dataset.key; setTimeout(function () { openPanel(k, firstCard(k)); }, 280); });
  });

  /* ===== LIGHTBOX ===== */
  var lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img'), gThumbs = [], gIdx = 0;
  function refreshThumbs () { gThumbs = Array.prototype.slice.call(document.querySelectorAll('[data-lb]')); }
  function showLb (i) { gIdx = (i + gThumbs.length) % gThumbs.length; lbImg.src = gThumbs[gIdx].getAttribute('data-lb'); }
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
      var body = encodeURIComponent('Name: ' + g('name') + '\nEmail: ' + g('email') + '\nPhone: ' + g('phone') + '\nService: ' + g('service') + '\n\n' + g('message'));
      window.location.href = 'mailto:info@wbme.com.na?subject=' + encodeURIComponent('Quote request — ' + g('name')) + '&body=' + body;
      form.style.display = 'none';
      document.querySelector('.form-ok').style.display = 'block';
    });
    form.querySelectorAll('input,textarea').forEach(function (i) {
      i.addEventListener('input', function () { i.closest('.field').classList.remove('invalid'); });
    });
  }

  /* ===== INIT ===== */
  setVisual(0);
  requestAnimationFrame(loop);
  var initKey = location.hash ? location.hash.slice(1) : '';
  if (initKey && panelEl(initKey)) {
    current = initKey;
    history.replaceState({ panel: initKey }, '', '#' + initKey);
    setTimeout(function () { doOpen(initKey, firstCard(initKey)); }, 450);
  }
})();
