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

  /* ---- footer year ---- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
