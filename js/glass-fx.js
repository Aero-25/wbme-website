/* WBME glass surfaces — cursor-tracked spotlight highlight.
   Purely cosmetic: sets --mx/--my on the hovered card so its ::before
   radial-gradient (see experience.css) follows the pointer. */
(function () {
  'use strict';
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var SEL = '.svc,.ind,.work-card,.ready-card,.explore,.btn-brass,.about-card,.svc-tile,.blog-card,.blog-feature,.cc-card,.founder-panel-grid';
  document.addEventListener('pointermove', function (e) {
    var t = e.target.closest && e.target.closest(SEL);
    if (!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  }, { passive: true });

  var MAGNETIC_SEL = '.explore,.hero-call,.btn-brass,.nav-cta';
  document.querySelectorAll(MAGNETIC_SEL).forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var relX = e.clientX - r.left - r.width / 2;
      var relY = e.clientY - r.top - r.height / 2;
      el.style.setProperty('--tx', (relX * 0.18).toFixed(1) + 'px');
      el.style.setProperty('--ty', (relY * 0.18).toFixed(1) + 'px');
    });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--tx', '0px');
      el.style.setProperty('--ty', '0px');
    });
  });

  /* "Face the cursor" — the About card logo turns toward the pointer
     anywhere on the page, like a medallion swivelling to track you.
     Deliberately NOT gated on prefers-reduced-motion (owner requirement:
     must work on every machine — the OS "reduce animations" setting was
     silently disabling it before). Normalised across the viewport so the
     turn is unmistakable: cursor at a screen edge = full tilt. */
  var faceLogo = document.querySelector('.about-mark-logo');
  if (faceLogo) {
    var FACE_MAX_TILT = 38;
    document.addEventListener('pointermove', function (e) {
      var r = faceLogo.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
      var dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
      faceLogo.style.setProperty('--tiltx', (dx * FACE_MAX_TILT).toFixed(1) + 'deg');
      faceLogo.style.setProperty('--tilty', (-dy * FACE_MAX_TILT).toFixed(1) + 'deg');
    }, { passive: true });
  }

  /* Founder portrait: subtle tilt toward the pointer within the frame. */
  var founderFrame = document.querySelector('.founder-portrait-frame');
  if (founderFrame) {
    founderFrame.addEventListener('pointermove', function (e) {
      var r = founderFrame.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      founderFrame.style.setProperty('--tiltx', ((px - 0.5) * 10).toFixed(1) + 'deg');
      founderFrame.style.setProperty('--tilty', ((0.5 - py) * 8).toFixed(1) + 'deg');
    });
    founderFrame.addEventListener('pointerleave', function () {
      founderFrame.style.setProperty('--tiltx', '0deg');
      founderFrame.style.setProperty('--tilty', '0deg');
    });
  }

  /* Service tile hover-tilt: each card leans toward the pointer within it. */
  document.querySelectorAll('.svc-tile').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', ((px - 0.5) * 14).toFixed(1) + 'deg');
      el.style.setProperty('--ry', ((0.5 - py) * 10).toFixed(1) + 'deg');
    });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
})();
