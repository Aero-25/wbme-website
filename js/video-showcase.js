/* WBME video showcase — plays muted only while actually in view, pauses
   when scrolled away (saves bandwidth/battery, doesn't autoplay before the
   visitor ever scrolls to it). Sound toggle: first click plays with sound
   (if paused) or unmutes (if already playing muted). */
(function () {
  'use strict';
  var section = document.querySelector('.video-showcase');
  var vid = document.getElementById('wbmeVideo');
  var btn = document.getElementById('videoSoundToggle');
  if (!section || !vid || !btn) return;

  function tryPlay () { vid.play().catch(function () {}); }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) tryPlay();
        else vid.pause();
      });
    }, { threshold: 0.35 });
    io.observe(section);
  } else {
    tryPlay(); // no IO support — fall back to eager play
  }

  function updateBtn () {
    var live = !vid.muted && !vid.paused;
    btn.classList.toggle('is-unmuted', live);
    btn.setAttribute('aria-pressed', String(live));
    btn.setAttribute('aria-label', live ? 'Mute video' : 'Play with sound');
  }

  btn.addEventListener('click', function () {
    if (vid.paused) { vid.muted = false; tryPlay(); }
    else { vid.muted = !vid.muted; }
    updateBtn();
  });
  vid.addEventListener('play', updateBtn);
  vid.addEventListener('pause', updateBtn);
  updateBtn();
})();
