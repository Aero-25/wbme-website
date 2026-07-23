/* WBME video showcase — always autoplays muted, including on mobile, per
   explicit direction (overrides the usual reduced-motion-disables-autoplay
   pattern used elsewhere on the site: this video is core content, not
   decorative motion). Sound toggle: first click plays with sound (if
   somehow paused) or unmutes (if already playing muted). */
(function () {
  'use strict';
  var vid = document.getElementById('wbmeVideo');
  var btn = document.getElementById('videoSoundToggle');
  if (!vid || !btn) return;

  function tryPlay () { vid.play().catch(function () {}); }

  tryPlay();
  document.addEventListener('DOMContentLoaded', tryPlay);
  window.addEventListener('load', tryPlay);

  /* Some strict mobile/in-app browsers only allow play() inside a user
     gesture even when muted — retry once on the first touch/click/scroll. */
  var retried = false;
  function retryOnce () {
    if (retried) return;
    retried = true;
    tryPlay();
    ['touchstart', 'click', 'scroll'].forEach(function (evt) {
      document.removeEventListener(evt, retryOnce);
    });
  }
  ['touchstart', 'click', 'scroll'].forEach(function (evt) {
    document.addEventListener(evt, retryOnce, { passive: true, once: true });
  });

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
