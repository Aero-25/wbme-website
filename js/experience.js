/* WBME interaction engine */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMAIL = ['info', 'wbme.com.na'].join('@');
  var activeOverlay = null;
  var overlayOpener = null;

  function queryAll (selector, scope) {
    return Array.prototype.slice.call((scope || doc).querySelectorAll(selector));
  }

  function mailHref (subject) {
    var href = 'mailto:' + EMAIL;
    if (subject) href += '?subject=' + encodeURIComponent(subject);
    return href;
  }

  function hydrateEmailLinks () {
    queryAll('[data-mail]').forEach(function (link) {
      link.href = mailHref(link.getAttribute('data-subject') || '');
      if (link.hasAttribute('data-mail-text')) link.textContent = EMAIL;
    });
  }

  function initActiveNav () {
    var file = location.pathname.split('/').pop() || 'index.html';
    queryAll('.primary-nav a, .mobile-nav nav a').forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('#')[0].split('/').pop();
      if (href === file) link.setAttribute('aria-current', 'page');
    });
  }

  function initHeader () {
    var header = doc.getElementById('siteHeader');
    var sentinel = doc.querySelector('.header-sentinel');
    if (!header || !sentinel || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      header.classList.toggle('is-solid', !entries[0].isIntersecting);
    });
    observer.observe(sentinel);
  }

  function initReveals () {
    var elements = queryAll('.reveal');
    if (!elements.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach(function (element) { element.classList.add('in'); });
      return;
    }
    root.classList.add('reveal-ready');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    elements.forEach(function (element) { observer.observe(element); });
  }

  function initPreloader () {
    var preloader = doc.getElementById('preloader');
    var rail = doc.getElementById('plRail');
    if (!preloader) return;

    var seen = false;
    try { seen = sessionStorage.getItem('wbme_preloader_seen') === '1'; } catch (error) { seen = false; }

    function setProgress (value) {
      if (rail) rail.style.transform = 'scaleX(' + Math.max(0, Math.min(1, value)) + ')';
    }

    function finish () {
      setProgress(1);
      preloader.classList.add('is-done');
      preloader.setAttribute('aria-hidden', 'true');
    }

    if (seen || reduceMotion) {
      setProgress(1);
      window.setTimeout(finish, 90);
      return;
    }

    try { sessionStorage.setItem('wbme_preloader_seen', '1'); } catch (error) { /* Storage can be unavailable. */ }

    var started = performance.now();
    var ready = false;
    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    fontsReady.then(function () { ready = true; }, function () { ready = true; });

    function tick (now) {
      var elapsed = now - started;
      var timeProgress = Math.min(1, elapsed / 650);
      setProgress(ready ? timeProgress : Math.min(.9, timeProgress));
      if ((ready && elapsed >= 520) || elapsed >= 1200) {
        finish();
        return;
      }
      window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  function focusableElements (container) {
    return queryAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (element) { return element.getClientRects().length && element.getAttribute('aria-hidden') !== 'true'; });
  }

  function setBackgroundInert (inert, exception) {
    Array.prototype.forEach.call(body.children, function (element) {
      if (element === exception || element.tagName === 'SCRIPT') return;
      if ('inert' in element) {
        element.inert = inert;
      } else if (inert) {
        element.setAttribute('data-overlay-hidden', element.getAttribute('aria-hidden') || '');
        element.setAttribute('aria-hidden', 'true');
      } else if (element.hasAttribute('data-overlay-hidden')) {
        var previous = element.getAttribute('data-overlay-hidden');
        if (previous) element.setAttribute('aria-hidden', previous);
        else element.removeAttribute('aria-hidden');
        element.removeAttribute('data-overlay-hidden');
      }
    });
  }

  function setInstant (element, instant) {
    if (!instant) return;
    element.classList.add('no-motion');
    window.setTimeout(function () { element.classList.remove('no-motion'); }, 40);
  }

  function openOverlay (element, opener, options) {
    if (!element) return;
    options = options || {};
    if (activeOverlay && activeOverlay !== element) closeOverlay(activeOverlay, false, true);
    if (window.WBME_CHATBOT) window.WBME_CHATBOT.close();
    activeOverlay = element;
    overlayOpener = opener || doc.activeElement;
    setInstant(element, options.instant);
    element.classList.add('is-open');
    element.setAttribute('aria-hidden', 'false');
    setBackgroundInert(true, element);
    body.classList.add('is-locked');
    var target = options.focus || focusableElements(element)[0] || element;
    window.setTimeout(function () { if (target && target.focus) target.focus(); }, options.instant ? 0 : 40);
  }

  function closeOverlay (element, returnFocus, instant) {
    if (!element) return;
    setInstant(element, instant);
    element.classList.remove('is-open');
    element.setAttribute('aria-hidden', 'true');
    setBackgroundInert(false, element);
    body.classList.remove('is-locked');
    activeOverlay = null;
    var opener = overlayOpener;
    overlayOpener = null;
    if (returnFocus !== false && opener && opener.focus) opener.focus();
  }

  function trapFocus (event) {
    if (!activeOverlay || event.key !== 'Tab') return;
    var focusable = focusableElements(activeOverlay);
    if (!focusable.length) {
      event.preventDefault();
      activeOverlay.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initMobileNav () {
    var menu = doc.getElementById('mobileNav');
    var toggle = doc.getElementById('burger');
    if (!menu || !toggle) return;
    var closeButton = menu.querySelector('[data-menu-close]');

    function open (instant) {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      openOverlay(menu, toggle, { focus: closeButton, instant: instant });
    }

    function close (returnFocus, instant) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      closeOverlay(menu, returnFocus, instant);
    }

    toggle.addEventListener('click', function (event) {
      if (menu.classList.contains('is-open')) close(true, event.detail === 0);
      else open(event.detail === 0);
    });
    if (closeButton) closeButton.addEventListener('click', function (event) { close(true, event.detail === 0); });
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a[href]')) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
      }
    });

    menu._closeOverlay = close;
  }

  function initContactModal () {
    var modal = doc.getElementById('contactModal');
    if (!modal) return;
    var panel = modal.querySelector('.contact-modal__panel');
    queryAll('[data-contact-open]').forEach(function (opener) {
      opener.addEventListener('click', function (event) {
        event.preventDefault();
        openOverlay(modal, opener, { focus: panel, instant: event.detail === 0 });
      });
    });
    queryAll('[data-contact-close]', modal).forEach(function (closer) {
      closer.addEventListener('click', function (event) { closeOverlay(modal, true, event.detail === 0); });
    });
    modal._closeOverlay = function (returnFocus, instant) { closeOverlay(modal, returnFocus, instant); };
  }

  function previewUrl (button) {
    var path = button.getAttribute('data-bucket-preview');
    if (path && window.WBME_BUCKET_IMAGE) {
      return window.WBME_BUCKET_IMAGE(path, { width: 1200, quality: 78, resize: 'cover', format: 'webp' });
    }
    return button.getAttribute('data-image');
  }

  function initServiceSelector () {
    var tabs = queryAll('.service-tab');
    var image = doc.getElementById('servicePreviewImage');
    var label = doc.getElementById('servicePreviewLabel');
    var panel = doc.getElementById('service-panel');
    if (!tabs.length || !image || !label || !panel) return;

    function select (tab) {
      if (!tab || tab.classList.contains('is-active')) return;
      tabs.forEach(function (item) {
        var active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
        item.tabIndex = active ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      label.textContent = tab.querySelector('span').textContent;
      image.classList.add('is-swapping');
      var nextUrl = previewUrl(tab);
      var nextAlt = tab.getAttribute('data-alt') || '';
      window.setTimeout(function () {
        image.src = nextUrl;
        image.alt = nextAlt;
        var ready = image.decode ? image.decode() : Promise.resolve();
        ready.catch(function () {}).then(function () { image.classList.remove('is-swapping'); });
      }, reduceMotion ? 0 : 120);
    }

    tabs.forEach(function (tab, index) {
      tab.tabIndex = tab.classList.contains('is-active') ? 0 : -1;
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (event) {
        var nextIndex = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        select(tabs[nextIndex]);
        tabs[nextIndex].focus();
      });
    });
  }

  function initForms () {
    var FORM_ENDPOINT = 'https://formspree.io/f/REPLACE_WITH_YOUR_ID';

    function fieldValid (input) {
      var value = input.value.trim();
      if (input.type === 'email' && value) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      return value !== '';
    }

    function setFieldState (input, valid) {
      var field = input.closest('.field');
      if (!field) return;
      field.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', valid ? 'false' : 'true');
      var error = field.querySelector('.error');
      if (!error) return;
      if (!error.id) error.id = input.id + '-error';
      if (valid) input.removeAttribute('aria-describedby');
      else input.setAttribute('aria-describedby', error.id);
    }

    function value (form, name) {
      var input = form.elements[name];
      return input ? String(input.value).trim() : '';
    }

    function showReadyState (form) {
      var success = form.parentElement.querySelector('.form-success');
      if (!success) return;
      form.hidden = true;
      success.hidden = false;
      success.focus();
    }

    function openMailRequest (form) {
      var subject = 'Quote request - ' + value(form, 'name');
      var bodyText = [
        'Name: ' + value(form, 'name'),
        'Email: ' + value(form, 'email'),
        'Phone: ' + value(form, 'phone'),
        'Service: ' + value(form, 'service'),
        '',
        value(form, 'message')
      ].join('\n');
      window.location.href = mailHref(subject) + '&body=' + encodeURIComponent(bodyText);
      showReadyState(form);
    }

    queryAll('form.quote-form, form#contactForm').forEach(function (form) {
      queryAll('[required]', form).forEach(function (input) {
        input.addEventListener('input', function () { setFieldState(input, fieldValid(input)); });
        input.addEventListener('blur', function () { if (input.value.trim()) setFieldState(input, fieldValid(input)); });
      });

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var firstInvalid = null;
        queryAll('[required]', form).forEach(function (input) {
          var valid = fieldValid(input);
          setFieldState(input, valid);
          if (!valid && !firstInvalid) firstInvalid = input;
        });
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }

        if (FORM_ENDPOINT.indexOf('REPLACE_WITH_YOUR_ID') !== -1) {
          openMailRequest(form);
          return;
        }

        var submit = form.querySelector('[type="submit"]');
        if (submit) { submit.disabled = true; submit.textContent = 'Sending'; }
        fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        }).then(function (response) {
          if (!response.ok) throw new Error('Request failed');
          showReadyState(form);
        }).catch(function () {
          openMailRequest(form);
        }).finally(function () {
          if (submit) { submit.disabled = false; submit.textContent = 'Send request'; }
        });
      });
    });
  }

  function initLightbox () {
    var lightbox = doc.getElementById('lightbox');
    if (!lightbox) return;
    var image = lightbox.querySelector('figure img');
    var caption = doc.getElementById('lbCaption');
    var close = lightbox.querySelector('[data-lightbox-close]');
    var previous = lightbox.querySelector('[data-lightbox-prev]');
    var next = lightbox.querySelector('[data-lightbox-next]');
    var items = [];
    var index = 0;

    function show (nextIndex) {
      if (!items.length) return;
      index = (nextIndex + items.length) % items.length;
      var item = items[index];
      var sourceImage = item.querySelector('img');
      image.src = item.getAttribute('data-lb') || (sourceImage ? sourceImage.src : '');
      image.alt = sourceImage ? sourceImage.alt : '';
      caption.textContent = item.getAttribute('data-caption') || image.alt;
    }

    function open (item, instant) {
      var scope = item.closest('[data-lb-scope]') || doc;
      items = queryAll('[data-lb]', scope).filter(function (candidate) { return candidate.getClientRects().length; });
      index = items.indexOf(item);
      show(index);
      openOverlay(lightbox, item, { focus: close, instant: instant });
    }

    doc.addEventListener('click', function (event) {
      var item = event.target.closest && event.target.closest('[data-lb]');
      if (!item) return;
      event.preventDefault();
      open(item, event.detail === 0);
    });
    close.addEventListener('click', function (event) { closeOverlay(lightbox, true, event.detail === 0); });
    previous.addEventListener('click', function () { show(index - 1); });
    next.addEventListener('click', function () { show(index + 1); });
    lightbox._closeOverlay = function (returnFocus, instant) { closeOverlay(lightbox, returnFocus, instant); };
    lightbox._handleArrow = function (key) { show(key === 'ArrowLeft' ? index - 1 : index + 1); };
  }

  function initGalleryToggle () {
    var gallery = doc.getElementById('projectGallery');
    var toggle = doc.getElementById('galleryToggle');
    if (!gallery || !toggle) return;
    var total = queryAll('.gallery-item', gallery).length;
    toggle.textContent = 'Show all ' + total + ' photos';
    toggle.addEventListener('click', function () {
      var expanded = !gallery.classList.contains('is-expanded');
      gallery.classList.toggle('is-expanded', expanded);
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.textContent = expanded ? 'Show fewer photos' : 'Show all ' + total + ' photos';
    });
  }

  doc.addEventListener('keydown', function (event) {
    trapFocus(event);
    if (!activeOverlay) return;
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && activeOverlay._handleArrow) {
      event.preventDefault();
      activeOverlay._handleArrow(event.key);
      return;
    }
    if (event.key === 'Escape' && activeOverlay._closeOverlay) {
      event.preventDefault();
      activeOverlay._closeOverlay(true, true);
    }
  });

  hydrateEmailLinks();
  initActiveNav();
  initHeader();
  initPreloader();
  initReveals();
  initMobileNav();
  initContactModal();
  initServiceSelector();
  initForms();
  initLightbox();
  initGalleryToggle();

  window.WBME_MAIL = mailHref;
  window.WBME_EMAIL = EMAIL;
}());
