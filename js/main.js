/* WBME — shared interactions */
(function () {
  'use strict';

  /* ---- scroll reveal + count-up ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-count]').forEach(function (el) {
        var to = parseInt(el.dataset.count, 10),
            suffix = el.dataset.suffix || '',
            c = 0,
            step = Math.max(1, Math.ceil(to / 26));
        var t = setInterval(function () {
          c += step;
          if (c >= to) { c = to; clearInterval(t); }
          el.textContent = c + suffix;
        }, 26);
      });
      io.unobserve(en.target);
    });
  }, { threshold: 0.14 });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  /* ---- sticky header shadow ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('sc', window.scrollY > 20);
    });
  }

  /* ---- mobile drawer ---- */
  var drawer = document.getElementById('drawer');
  function openDrawer() { if (drawer) { drawer.classList.add('open'); document.body.style.overflow = 'hidden'; } }
  function closeDrawer() { if (drawer) { drawer.classList.remove('open'); document.body.style.overflow = ''; } }
  document.querySelectorAll('[data-burger]').forEach(function (b) { b.addEventListener('click', openDrawer); });
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
  if (drawer) drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });

  /* ---- lightbox (projects) ---- */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img'),
        triggers = Array.prototype.slice.call(document.querySelectorAll('[data-lb]')),
        idx = 0;
    function show(i) {
      idx = (i + triggers.length) % triggers.length;
      lbImg.src = triggers[idx].getAttribute('data-lb');
    }
    function openLb(i) { show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeLb() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    triggers.forEach(function (t, i) { t.addEventListener('click', function () { openLb(i); }); });
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---- contact form (client-side validation) ---- */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var field = input.closest('.field'), valid = input.value.trim() !== '';
        if (input.type === 'email' && valid) {
          valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        }
        field.classList.toggle('invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) return;
      // Build a mailto fallback (swap for a real endpoint later)
      var name = form.querySelector('[name=name]').value.trim(),
          email = form.querySelector('[name=email]').value.trim(),
          service = form.querySelector('[name=service]') ? form.querySelector('[name=service]').value : '',
          msg = form.querySelector('[name=message]').value.trim();
      var body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + (service ? '\nService: ' + service : '') + '\n\n' + msg);
      var subject = encodeURIComponent('Quote request — ' + name);
      window.location.href = 'mailto:info@wbme.com.na?subject=' + subject + '&body=' + body;
      form.style.display = 'none';
      var okMsg = document.querySelector('.form-ok');
      if (okMsg) okMsg.style.display = 'block';
    });
    form.querySelectorAll('input,textarea').forEach(function (i) {
      i.addEventListener('input', function () { i.closest('.field').classList.remove('invalid'); });
    });
  }

  /* ---- services scroll showcase (sticky cross-fade) ---- */
  var showItems = document.querySelectorAll('.show-list .item');
  if (showItems.length) {
    var layers = document.querySelectorAll('.show-media .layer'),
        cNow = document.getElementById('cNow');
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = parseInt(en.target.dataset.i, 10);
        layers.forEach(function (l) { l.classList.toggle('active', parseInt(l.dataset.i, 10) === i); });
        showItems.forEach(function (it) { it.classList.toggle('active', parseInt(it.dataset.i, 10) === i); });
        if (cNow) cNow.textContent = ('0' + (i + 1)).slice(-2);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    showItems.forEach(function (it) { sio.observe(it); });
  }

  /* ---- ship silhouette in footer ---- */
  var ft = document.querySelector('footer');
  if (ft && !ft.querySelector('.ship')) {
    var ship = document.createElement('div');
    ship.className = 'ship';
    ship.setAttribute('aria-hidden', 'true');
    ship.innerHTML =
      '<svg viewBox="0 0 1400 150" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M150 112 L1280 112 L1230 136 L210 136 C175 136 160 126 150 118 Z"/>' +
      '<path d="M980 112 L980 70 L1150 70 L1150 112 Z"/>' +
      '<path d="M1075 70 L1075 44 L1110 44 L1110 70 Z"/>' +
      '<path d="M1030 44 L1030 18 L1035 18 L1035 44 Z"/>' +
      '<path d="M420 112 L420 30 L432 30 L432 112 Z"/>' +
      '<path d="M426 36 L250 78 L254 88 L430 46 Z"/>' +
      '<path d="M426 36 L640 80 L636 90 L424 48 Z"/>' +
      '<path d="M720 112 L720 56 L732 56 L732 112 Z"/>' +
      '<path d="M726 62 L900 100 L896 109 L723 71 Z"/>' +
      '</svg>';
    ft.insertBefore(ship, ft.firstChild);
  }

  /* ---- footer year ---- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
