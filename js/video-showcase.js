/* WBME video showcase — plays muted while in view, pauses when scrolled away.
   Sound toggle: first click plays with sound (if paused) or unmutes (if already
   playing muted); respects prefers-reduced-motion by never autoplaying. */
(function () {
  'use strict';
  var section = document.querySelector('.video-showcase');
  var vid = document.getElementById('wbmeVideo');
  var btn = document.getElementById('videoSoundToggle');
  if (!section || !vid || !btn) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateBtn () {
    var live = !vid.muted && !vid.paused;
    btn.classList.toggle('is-unmuted', live);
    btn.setAttribute('aria-pressed', String(live));
    btn.setAttribute('aria-label', live ? 'Mute video' : 'Play with sound');
  }

  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { vid.play().catch(function () {}); }
        else { vid.pause(); }
      });
    }, { threshold: 0.35 });
    io.observe(section);
  }

  btn.addEventListener('click', function () {
    if (vid.paused) { vid.muted = false; vid.play().catch(function () {}); }
    else { vid.muted = !vid.muted; }
    updateBtn();
  });
  vid.addEventListener('play', updateBtn);
  vid.addEventListener('pause', updateBtn);
  updateBtn();
})();
