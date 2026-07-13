/* WBME glass surfaces — cursor-tracked spotlight highlight.
   Purely cosmetic: sets --mx/--my on the hovered card so its ::before
   radial-gradient (see experience.css) follows the pointer. */
(function () {
  'use strict';
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var SEL = '.svc,.ind,.work-card,.ready-card,.explore,.btn-lime';
  document.addEventListener('pointermove', function (e) {
    var t = e.target.closest && e.target.closest(SEL);
    if (!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  }, { passive: true });
})();
