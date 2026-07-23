/* WBME glass surfaces — cursor-tracked spotlight highlight.
   Purely cosmetic: sets --mx/--my on the hovered card so its ::before
   radial-gradient (see experience.css) follows the pointer. */
(function () {
  'use strict';
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var SEL = '.svc,.ind,.work-card,.ready-card,.explore,.btn-brass';
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

  /* "Face the cursor" — the About card logo subtly turns toward the pointer
     anywhere on the page (not just on hover), like it's tracking you. */
  var faceLogo = document.querySelector('.about-mark-logo');
  if (faceLogo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var FACE_MAX_TILT = 16, FACE_RANGE = 700;
    document.addEventListener('pointermove', function (e) {
      var r = faceLogo.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = Math.max(-1, Math.min(1, (e.clientX - cx) / FACE_RANGE));
      var dy = Math.max(-1, Math.min(1, (e.clientY - cy) / FACE_RANGE));
      faceLogo.style.setProperty('--tiltx', (dx * FACE_MAX_TILT).toFixed(1) + 'deg');
      faceLogo.style.setProperty('--tilty', (-dy * FACE_MAX_TILT).toFixed(1) + 'deg');
    }, { passive: true });
  }
})();
