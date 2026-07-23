/* WBME glass surfaces — cursor-tracked spotlight highlight.
   Purely cosmetic: sets --mx/--my on the hovered card so its ::before
   radial-gradient (see experience.css) follows the pointer.
   On touch devices there's no cursor to track, so a parallel touch path
   below lights the same spotlight at the tap point instead of the whole
   effect silently vanishing on mobile. */
(function () {
  'use strict';
  var HAS_HOVER = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  var SEL = '.svc,.ind,.work-card,.ready-card,.explore,.btn-brass,.about-card,.svc-tile,.blog-card,.blog-feature,.cc-card,.founder-panel-grid';

  if (HAS_HOVER) {
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
  } else {
    /* Touch: light the spotlight at the tap point, then fade it — a
       tactile stand-in for the desktop hover glow (see .is-touched rules
       alongside every :hover spotlight reveal in experience.css). */
    document.addEventListener('touchstart', function (e) {
      var t = e.target.closest && e.target.closest(SEL);
      if (!t) return;
      var touch = e.touches[0];
      if (!touch) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', ((touch.clientX - r.left) / r.width * 100) + '%');
      t.style.setProperty('--my', ((touch.clientY - r.top) / r.height * 100) + '%');
      t.classList.add('is-touched');
      clearTimeout(t._touchGlowTimer);
      t._touchGlowTimer = setTimeout(function () { t.classList.remove('is-touched'); }, 1000);
    }, { passive: true });
  }

  /* "Face the cursor" — the About card logo turns toward the pointer
     anywhere on the page, like a medallion swivelling to track you.
     Deliberately NOT gated on prefers-reduced-motion (owner requirement:
     must work on every machine — the OS "reduce animations" setting was
     silently disabling it before). Normalised across the viewport so the
     turn is unmistakable: cursor at a screen edge = full tilt.
     On touch devices there's no pointer to face, so it gets a continuous
     idle sway instead (see @media(hover:none) in experience.css) rather
     than sitting dead still. */
  var faceLogo = document.querySelector('.about-mark-logo');
  if (faceLogo && HAS_HOVER) {
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

  /* Founder portrait: subtle tilt toward the pointer within the frame
     (touch gets the same idle-sway substitute as the About logo). */
  var founderFrame = document.querySelector('.founder-portrait-frame');
  if (founderFrame && HAS_HOVER) {
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
  if (HAS_HOVER) {
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
  }
})();
