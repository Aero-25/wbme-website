# Scrollable Multi-Page Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace WBME's full-viewport rail-loop + morph-panel experience with five real, normally-scrollable pages (Home, About, Services, Projects, Contact) that share one nav/footer/effects system, per `docs/superpowers/specs/2026-07-18-scrollable-multipage-design.md`.

**Architecture:** Static HTML/CSS/JS, no build step, no new dependencies. `css/experience.css` and `js/experience.js` become the shared design system + shared behavior engine across all 5 pages (each page's `<script>`/`<link>` tags are identical). New pages reuse the existing `.panel-hero` / `.panel-body` / `.svc` / `.ind` / etc. component CSS (already generic, not actually scoped to a `.panel` ancestor in the ways that matter) — only a handful of small additive rules are needed for the new scroll-reveal engine, header, and footer. The old rail-loop/FLIP-morph/click-to-open-panel JS is deleted only once nothing references it (Task 7), so every earlier task leaves the site in a working, deployable state with the *old* Home page still functioning alongside the *new* standalone pages.

**Tech Stack:** Vanilla HTML/CSS/JS. `IntersectionObserver` for scroll reveals. No new libraries.

**Verification note:** This project has no test framework (static site, no build step — confirmed: no `package.json` anywhere in the repo). "Tests" in this plan are precise manual browser checks run via `python -m http.server 8000` (per `AGENTS.md`), plus a couple of tiny Node one-liners (built-in `fs` only, no dependencies) that sanity-check the generated HTML. Every verification step tells you exactly what to open, what to do, and what you should see.

---

## Reference material (read before starting)

- `docs/superpowers/specs/2026-07-18-scrollable-multipage-design.md` — the approved design spec.
- Current `index.html` — the source of truth for About/Services/Projects/Contact/Why content (the `<section class="panel" id="panel-about">` etc. blocks). This plan quotes that content directly; you should not need to re-derive it, but the live file is the fallback if a quoted block ever looks truncated.
- `css/experience.css` (82KB) — the single shared stylesheet. It already has scattered breakpoint-specific overrides; every edit below tells you the *exact current text* to find (via the Edit tool's old_string/new_string matching) rather than a line number, because line numbers shift as earlier tasks edit the file.
- `js/experience.js`, `js/glass-fx.js`, `js/chatbot.js`, `js/bucket-assets.js` — current behavior engine.

## Key findings from investigation (why some steps look the way they do)

1. `.panel-hero`, `.panel-body`, `.panel-cta`, `.svc`, `.ind`, `.formcard`, `.contact-grid`, `.gal`, `.work-card`, `.featured-work`, `.mini-footer`, `.explore`, `.hero-call`, `.btn-lime` are **not** actually scoped to a `.panel` ancestor in their base rules — they work standalone. Only the *entrance animations* (`.panel.open.shown .panel-hero .ey{...}` etc.) and two button-color overrides (`.panel .explore{...}`, `.panel .hero-call{...}`) require an ancestor `.panel` class. This plan reuses all the standalone rules verbatim and only adds small additive rules for the ancestor-scoped exceptions.
2. `.stage{position:relative;...height:100vh}` and `body{overflow-x:hidden}` (no `overflow-y:hidden`) — the document can already scroll natively; nothing is fighting a scroll lock. Adding real sections after `</main>` on the Home page will just work.
3. The header nav (`<nav>`, phone link, CTA) was fully removed from `index.html` markup at some point — the CSS still has dead rules referencing `.hdr .nav`/`.hdr-phone` (`display:none!important`) but there is no `<nav>` element in the current markup for them to hide. This plan adds fresh nav markup and fresh CSS; there is no old nav behavior to preserve.
4. `js/bucket-assets.js`'s `hydrateBucketAssets()` has a guard that skips `[data-bucket-bg]`/`[data-bucket-src]` elements inside an *unopened* `.panel` — since new pages never use the `.panel` class, `el.closest('.panel')` returns `null` and the guard is naturally inert. No edit needed there.
5. `js/chatbot.js` calls `window.WBME_OPEN_PANEL(key, card)` to navigate when a user clicks a suggested action. This must change to real page navigation (Task 7).
6. The preloader gauge takes ~1.15s minimum. Repeating it on every link click across 5 pages would feel slow. Task 6 adds a session-flag fast path.

---

### Task 1: Scroll-effects engine, shared chrome CSS, and the About page

**Files:**
- Modify: `css/experience.css`
- Modify: `js/experience.js`
- Create: `about.html`
- Test: manual browser check via `python -m http.server 8000`

This is the biggest task — it proves out the whole system on one real page. Every later page task is much smaller because it just reuses what this task builds.

- [ ] **Step 1: Add the scroll-reveal CSS (generalizes the existing `.p-rv` fade/rise so it can fire from IntersectionObserver, not just `.panel.open`)**

Find this exact block in `css/experience.css`:

```css
.p-rv{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.panel.open .p-rv{opacity:1;transform:none}
.panel.open .p-rv:nth-child(2){transition-delay:.06s}
.panel.open .p-rv:nth-child(3){transition-delay:.12s}
.panel.open .p-rv:nth-child(4){transition-delay:.18s}
```

Replace it with (keeps the old panel-triggered rule so the still-live old Home page/panels are unaffected, adds the new scroll-triggered `.in` class and a reusable `.stagger` helper for grids):

```css
.p-rv{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.panel.open .p-rv{opacity:1;transform:none}
.panel.open .p-rv:nth-child(2){transition-delay:.06s}
.panel.open .p-rv:nth-child(3){transition-delay:.12s}
.panel.open .p-rv:nth-child(4){transition-delay:.18s}
/* scroll-driven reveal (normal-flow pages): IntersectionObserver adds .in */
.p-rv.in{opacity:1;transform:none}
.stagger .p-rv:nth-child(1){transition-delay:0s}
.stagger .p-rv:nth-child(2){transition-delay:.06s}
.stagger .p-rv:nth-child(3){transition-delay:.12s}
.stagger .p-rv:nth-child(4){transition-delay:.18s}
.stagger .p-rv:nth-child(5){transition-delay:.24s}
.stagger .p-rv:nth-child(6){transition-delay:.3s}
```

- [ ] **Step 2: Add the page-hero entrance animation (reuses the existing keyframes, retriggered on page load instead of on panel-open)**

Find this exact block:

```css
.panel.open.shown .panel-hero .ey{animation:panelLabelIn .38s cubic-bezier(.23,1,.32,1) both .05s}
.panel.open.shown .panel-hero .ti{animation:panelTitleIn .52s cubic-bezier(.16,1,.3,1) both .08s}
.panel.open.shown .panel-hero:before{animation:panelHeroLight .78s cubic-bezier(.22,1,.36,1) both}
```

Replace it with:

```css
.panel.open.shown .panel-hero .ey{animation:panelLabelIn .38s cubic-bezier(.23,1,.32,1) both .05s}
.panel.open.shown .panel-hero .ti{animation:panelTitleIn .52s cubic-bezier(.16,1,.3,1) both .08s}
.panel.open.shown .panel-hero:before{animation:panelHeroLight .78s cubic-bezier(.22,1,.36,1) both}
/* same entrance, retriggered by page load on normal-flow pages (no .panel ancestor there) */
body.ready .panel-hero .ey{animation:panelLabelIn .38s cubic-bezier(.23,1,.32,1) both .05s}
body.ready .panel-hero .ti{animation:panelTitleIn .52s cubic-bezier(.16,1,.3,1) both .08s}
body.ready .panel-hero:before{animation:panelHeroLight .78s cubic-bezier(.22,1,.36,1) both}
```

- [ ] **Step 3: Broaden the panel-button color override so it also applies inside the new `.panel-body`-based pages**

Find this exact block:

```css
.panel .explore{
  background:var(--gold);color:var(--ink);border:1px solid var(--gold);border-radius:8px;
  -webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none;
  padding:14px 28px;font-weight:700;
}
.panel .explore:before{content:none}
.panel .explore:hover{background:var(--gold-lt);border-color:var(--gold-lt);transform:none;box-shadow:none}
.panel .hero-call{
  background:none;border:1px solid rgba(255,255,255,.24);border-radius:8px;
  -webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none;
  color:#fff;text-decoration:none;padding:0 22px;min-height:48px;
}
.panel .hero-call:hover{border-color:var(--gold-lt);color:var(--gold-lt)}
```

Replace it with (adds `.panel-body` as an alternative ancestor, comma-joined, so both the old panels and the new standalone pages get the same solid-fill button treatment):

```css
.panel .explore,.panel-body .explore{
  background:var(--gold);color:var(--ink);border:1px solid var(--gold);border-radius:8px;
  -webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none;
  padding:14px 28px;font-weight:700;
}
.panel .explore:before,.panel-body .explore:before{content:none}
.panel .explore:hover,.panel-body .explore:hover{background:var(--gold-lt);border-color:var(--gold-lt);transform:none;box-shadow:none}
.panel .hero-call,.panel-body .hero-call{
  background:none;border:1px solid rgba(255,255,255,.24);border-radius:8px;
  -webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none;
  color:#fff;text-decoration:none;padding:0 22px;min-height:48px;
}
.panel .hero-call:hover,.panel-body .hero-call:hover{border-color:var(--gold-lt);color:var(--gold-lt)}
```

- [ ] **Step 4: Add the new shared header/nav, footer, and scroll-progress CSS**

Add this new block at the end of `css/experience.css` (append to the file):

```css
/* ===========================================================
   NORMAL-FLOW SITE CHROME — header nav, footer, scroll progress
   (used by the standalone pages: about/services/projects/contact,
   and later by the rebuilt Home page)
   =========================================================== */
.site-hdr{
  position:fixed;top:0;left:0;right:0;z-index:var(--z-hdr);
  display:flex;align-items:center;justify-content:space-between;gap:24px;
  padding:20px 40px;background:transparent;
  transition:background-color .3s var(--ease-out),box-shadow .3s var(--ease-out),padding .3s var(--ease-out);
}
.site-hdr.scrolled{
  background:rgba(7,26,51,.86);-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2);
  box-shadow:0 8px 26px rgba(0,0,0,.35);padding:14px 40px;
}
.site-hdr .brand{display:inline-flex;align-items:center;gap:10px;min-width:0}
.site-hdr .brand-logo{display:block;width:clamp(160px,14vw,220px);aspect-ratio:4.2/1;object-fit:cover;object-position:center}
.site-nav{display:flex;align-items:center;gap:30px}
.site-nav a{font-family:'Archivo';font-weight:600;font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;color:#dfe5ee;opacity:.82;transition:opacity .2s var(--ease-out),color .2s var(--ease-out);position:relative}
.site-nav a:hover{opacity:1;color:var(--gold-lt)}
.site-nav a.active{opacity:1;color:var(--gold-lt)}
.site-nav a.active:after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:2px;background:var(--gold)}
.hdr-actions{display:flex;align-items:center;gap:22px}
.hdr-phone{font-family:'Archivo';font-weight:700;font-size:.8rem;letter-spacing:.1em;color:var(--gold-lt);white-space:nowrap}
.hdr-phone:hover{color:#fff}
.site-hdr .nav-cta{background:var(--gold);color:var(--ink);padding:.6rem 1.3rem;border-radius:999px;font-family:'Archivo';font-weight:700;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;transition:background .2s var(--ease-out)}
.site-hdr .nav-cta:hover{background:var(--gold-lt)}
@media(max-width:960px){
  .site-nav,.hdr-phone{display:none}
  .site-hdr{padding:16px 20px}
  .site-hdr.scrolled{padding:12px 20px}
  .site-hdr .brand-logo{width:clamp(150px,40vw,220px)}
}

.scroll-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:var(--z-modal-progress);pointer-events:none}
.scroll-progress i{display:block;height:100%;width:100%;background:var(--gold);transform:scaleX(0);transform-origin:left center}

.site-footer{background:var(--panel);border-top:1px solid var(--line);padding:56px 40px 28px}
.sf-top{max-width:1180px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:32px;padding-bottom:32px;border-bottom:1px solid var(--line)}
.sf-brand{font-family:'Archivo';font-weight:700;font-size:1.3rem;color:#fff}
.sf-brand b{color:var(--gold-lt)}
.sf-links{display:flex;flex-wrap:wrap;gap:22px}
.sf-links a{font-family:'Archivo';font-weight:600;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.sf-links a:hover{color:var(--gold-lt)}
.sf-contact{display:flex;flex-direction:column;gap:6px;font-family:'Barlow';font-size:.9rem;color:var(--mut);text-align:right}
.sf-contact a{color:var(--mut)}
.sf-contact a:hover{color:var(--gold-lt)}
.sf-bottom{max-width:1180px;margin:0 auto;padding-top:22px;font-family:'Archivo';font-weight:600;font-size:.7rem;letter-spacing:.06em;color:var(--mut);text-align:center}
@media(max-width:720px){
  .site-footer{padding:40px 22px 24px}
  .sf-top{flex-direction:column;gap:22px}
  .sf-contact{text-align:left}
}

/* page-hero: a shorter version of the full-viewport home hero, used on About/Services/Projects/Contact */
.page-hero{min-height:56vh}
@media(max-width:720px){.page-hero{min-height:44vh}}
```

- [ ] **Step 5: Add the JS engine functions to `js/experience.js`**

Find this exact line near the top of the IIFE (right after the reduced-motion check):

```javascript
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ENABLE_CARD_TILT = false;
```

Replace it with (keeps both existing lines, adds the new engine functions right after, defined early so later code in the file can call them):

```javascript
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ENABLE_CARD_TILT = false;

  /* ===== SCROLL REVEAL (IntersectionObserver-driven .p-rv) ===== */
  function initScrollReveal () {
    var els = document.querySelectorAll('.p-rv');
    if (!els.length) return;
    if (reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ===== PARALLAX DRIFT (transform-based, not scroll-jacking) ===== */
  var parallaxEls = [], parallaxTicking = false;
  function initParallax () {
    parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!parallaxEls.length || reduce) return;
    window.addEventListener('scroll', onParallaxScroll, { passive: true });
    onParallaxScroll();
  }
  function onParallaxScroll () {
    if (parallaxTicking) return;
    parallaxTicking = true;
    requestAnimationFrame(function () {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
        var offset = (rect.top - vh / 2) * speed * -1;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0) scale(1.12)';
      });
      parallaxTicking = false;
    });
  }

  /* ===== HEADER SCROLL STATE ===== */
  function initHeaderScrollState () {
    var hdr = document.querySelector('.site-hdr');
    if (!hdr) return;
    function update () { hdr.classList.toggle('scrolled', window.scrollY > 40); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ===== ACTIVE NAV (current page, not scroll-spy — this is a multi-page site) ===== */
  function markActiveNav () {
    var path = (location.pathname.split('/').pop() || 'index.html');
    document.querySelectorAll('.site-nav a[href],.drawer a[href]').forEach(function (a) {
      var href = a.getAttribute('href').split('/').pop();
      if (href === path) a.classList.add('active');
    });
  }

  /* ===== SCROLL PROGRESS BAR ===== */
  function initScrollProgress () {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;
    var fill = bar.querySelector('i');
    function update () {
      var h = document.documentElement;
      var scrollTop = h.scrollTop || document.body.scrollTop;
      var height = h.scrollHeight - h.clientHeight;
      var pct = height > 0 ? scrollTop / height : 0;
      fill.style.transform = 'scaleX(' + pct.toFixed(4) + ')';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ===== SCROLL-TRIGGERED COUNTERS (data-count) ===== */
  function initScrollCounters () {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    function run (el) {
      var to = +el.dataset.count, sf = el.dataset.suffix || '', c = 0, st = Math.max(1, Math.ceil(to / 26));
      if (reduce) { el.textContent = to + sf; return; }
      var t = setInterval(function () { c += st; if (c >= to) { c = to; clearInterval(t); } el.textContent = c + sf; }, 26);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); } });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }
```

- [ ] **Step 6: Call the new engine functions and simplify the mobile drawer for real page links**

Find this exact block (the drawer section):

```javascript
  /* ===== DRAWER ===== */
  var drawer = document.getElementById('drawer');
  var burgerBtn = document.getElementById('burger');
  function openDrawer () { drawer.classList.add('open'); if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'true'); lock(); }
  function closeDrawer () { drawer.classList.remove('open'); if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false'); if (!current) unlock(); }
  if (burgerBtn) burgerBtn.addEventListener('click', openDrawer);
  document.querySelector('[data-drawer-close]').addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a[data-key]').forEach(function (a) {
    a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button');
    a.addEventListener('click', function () { closeDrawer(); var k = a.dataset.key; setTimeout(function () { openPanel(k, firstCard(k)); }, 280); });
    a.addEventListener('keydown', keyActivate);
  });
```

Replace it with (drawer links are now real `<a href>` page links — no special click handling needed, the browser just navigates; this still runs safely on the old `index.html` where `drawer` links currently have `data-key`, since `querySelectorAll('a[data-key]')` there still matches and this new code doesn't touch those — but note `about.html`'s drawer, built in Step 8 below, uses plain `href` links with no `data-key`, so this block simply does nothing extra for it beyond open/close):

```javascript
  /* ===== DRAWER ===== */
  var drawer = document.getElementById('drawer');
  var burgerBtn = document.getElementById('burger');
  function openDrawer () { drawer.classList.add('open'); if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'true'); lock(); }
  function closeDrawer () { drawer.classList.remove('open'); if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false'); if (!current) unlock(); }
  if (burgerBtn) burgerBtn.addEventListener('click', openDrawer);
  document.querySelector('[data-drawer-close]').addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a[data-key]').forEach(function (a) {
    a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button');
    a.addEventListener('click', function () { closeDrawer(); var k = a.dataset.key; setTimeout(function () { openPanel(k, firstCard(k)); }, 280); });
    a.addEventListener('keydown', keyActivate);
  });

  /* ===== NEW ENGINE: reveal / parallax / header state / active nav / progress / counters ===== */
  initScrollReveal();
  initParallax();
  initHeaderScrollState();
  markActiveNav();
  initScrollProgress();
  initScrollCounters();
```

- [ ] **Step 7: Verify the old Home page still works (regression check before building on top of these changes)**

Run: `python -m http.server 8000` from the project root, then open `http://localhost:8000/index.html`.
Expected: identical behavior to before this task — looping rail cards, click-to-open panels, no console errors. This confirms the additive CSS/JS changes didn't disturb the existing experience.

- [ ] **Step 8: Create `about.html`**

Create `about.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About WBME | Walvis Bay Marine Engineering</title>
<meta name="description" content="Established in 1999, Walvis Bay Marine Engineering (WBME) delivers ship repair, fabrication and precision engineering across Namibia's marine, mining and industrial sectors.">
<meta property="og:title" content="About Walvis Bay Marine Engineering">
<meta property="og:description" content="25 years of service excellence in marine engineering, ship repair and metal work. No job too big, no job too small.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/wbme%20photos%20for%20web%202026/Pics%20for%20T/Propulsion/CPP%20complete%20refit%202.jpg?width=1200&quality=75&resize=cover">
<link rel="icon" type="image/png" sizes="128x128" href="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=128&height=128&resize=contain&quality=90">
<link rel="preconnect" href="https://kbmgpqwmgthswjkfmqfe.supabase.co" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/experience.css?v=79">
</head>
<body data-page="about">

<div class="preloader" id="preloader" aria-label="Loading Walvis Bay Marine Engineering">
  <div class="pl-inner">
    <div class="pl-gauge">
      <div class="pl-ticks" aria-hidden="true"></div>
      <div class="pl-ring" id="plRing" aria-hidden="true"></div>
      <div class="pl-prop" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=220&height=220&resize=contain&quality=90" alt=""></div>
    </div>
    <div class="pl-pct" id="plPct" aria-hidden="true">0%</div>
    <div class="pl-word">
      <div class="pl-logo">WBME</div>
      <div class="pl-sub">Marine Engineering &middot; Walvis Bay</div>
    </div>
  </div>
</div>
<div class="grain"></div>
<div class="scroll-progress" id="scrollProgress"><i></i></div>

<header class="site-hdr" id="siteHeader">
  <a class="brand" href="index.html" aria-label="Walvis Bay Marine Engineering home"><img class="brand-logo" src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/New%20Logo.png?width=460&resize=contain&quality=90" alt="WBME"></a>
  <nav class="site-nav" aria-label="Primary">
    <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
  </nav>
  <div class="hdr-actions">
    <a class="hdr-phone" href="tel:+26464285700">+264 (0)64 285 700</a>
    <a class="nav-cta" href="contact.html">Request a quote</a>
  </div>
</header>
<button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>

<main>
<section class="panel-hero page-hero" data-parallax="0.18" style="background-image:url('images/1.jpg')" data-bucket-bg="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg">
  <div class="in"><div class="ey">Est. 1999 &middot; Walvis Bay</div><h1 class="ti">About Us</h1></div>
</section>
<div class="panel-body">
  <p class="lead-statement p-rv">Established in Walvis Bay and trusted across the marine yard, WBME delivers ship repair, fabrication and precision engineering with the same founder-led ethic: <span>No job too big, no job too small.</span></p>
  <div class="lead-row p-rv">
    <div>
      <span class="eyebrow">Our story</span>
      <h3>Built on craftsmanship &amp; character</h3>
      <p>Walvis Bay Marine Engineering was established by the late Mr. Uwe Cr&uuml;ys in 1999 and registered in October 2000. The company was built as a well-established workshop offering high standards of workmanship to vessels, mines and industrial clients around Walvis Bay.</p>
      <p>From Mr. Cr&uuml;ys' example came the ethic that still runs every job: value the customer, value the person, protect the relationship and take pride in the small things that keep expensive equipment working.</p>
      <div class="verse">"I can do all things through Christ Jesus who strengthens me." Philippians 4:13</div>
    </div>
    <figure class="founder"><div class="media"><img src="images/uwe_cruys_img.gif" alt="Founder, the late Mr. Uwe Cr&uuml;ys"></div><figcaption>Mr. Uwe Cr&uuml;ys &middot; Founder</figcaption></figure>
  </div>
  <div class="statline p-rv">
    <div><div class="n" data-count="25" data-suffix="+">0</div><div class="l">Years of service</div></div>
    <div><div class="n">6</div><div class="l">Core disciplines</div></div>
    <div><div class="n">1999</div><div class="l">Established</div></div>
    <div><div class="n">100%</div><div class="l">Commitment</div></div>
  </div>
  <div class="standard p-rv stagger">
    <span class="eyebrow">The standard we hold</span>
    <ul class="std-list">
      <li class="p-rv"><b>Highest quality service.</b> Workmanship held to a high standard at competitive prices.</li>
      <li class="p-rv"><b>On time, on budget.</b> Engineering results planned around your time frame and budget.</li>
      <li class="p-rv"><b>Practical solutions.</b> Repairs, renewals and new work shaped to reduce total job cost.</li>
      <li class="p-rv"><b>Real experience.</b> Field knowledge across ship repair, fabrication, machining and pipe work.</li>
    </ul>
  </div>
  <div class="standard p-rv stagger">
    <span class="eyebrow">Who we serve</span>
    <div class="ind-grid">
      <div class="ind p-rv"><div class="nu">SEA</div><div><b>Fishing &amp; Seafood</b><span>Vessel repair, refits and on-season turnarounds.</span></div></div>
      <div class="ind p-rv"><div class="nu">SHP</div><div><b>Shipping &amp; Cargo</b><span>Ship repair, structural steel and maintenance.</span></div></div>
      <div class="ind p-rv"><div class="nu">MIN</div><div><b>Mining &amp; Minerals</b><span>Fabrication, machining and plant components.</span></div></div>
      <div class="ind p-rv"><div class="nu">OFF</div><div><b>Offshore &amp; Energy</b><span>Rigging, pipework and specialist welding.</span></div></div>
      <div class="ind p-rv"><div class="nu">PORT</div><div><b>Ports &amp; Harbour</b><span>Structural works, repairs and new builds.</span></div></div>
      <div class="ind p-rv"><div class="nu">GEN</div><div><b>General Industry</b><span>One-offs, jigs and bespoke metal engineering.</span></div></div>
    </div>
  </div>
  <div class="about-video p-rv">
    <video controls playsinline preload="metadata">
      <source src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/object/public/WBME/WBME%20Propulsionl%20short%20Edit%20720p.mp4" type="video/mp4">
    </video>
    <div class="about-video-caption"><b>WBME in action</b><span>A short look at propulsion work from the yard.</span></div>
  </div>

  <div class="panel-intro p-rv"><span class="eyebrow">What sets us apart</span><h3>Why WBME</h3><p>Guided by the motto "No job too big, and no job too small," WBME approaches each project with skilled workmanship, safety-first planning and care for long-term customer relationships.</p></div>
  <div class="svc-grid p-rv stagger">
    <div class="svc p-rv"><div class="ic"><span class="num-badge">QC</span></div><h4>Quality &amp; value</h4><p>High standards of workmanship delivered at competitive prices and checked against practical job requirements.</p></div>
    <div class="svc p-rv"><div class="ic"><span class="num-badge">TEAM</span></div><h4>Skilled professionals</h4><p>Tradesmen supported by professional engineers and consultants where historical or specialist knowledge matters.</p></div>
    <div class="svc p-rv"><div class="ic"><span class="num-badge">TRUST</span></div><h4>Reputation for excellence</h4><p>More than 25 years serving the local marine industry, plus expanding industrial and mining work.</p></div>
    <div class="svc p-rv"><div class="ic"><span class="num-badge">LINK</span></div><h4>Partnership building</h4><p>Customers are treated as long-term relationships, not once-off tickets through the workshop.</p></div>
    <div class="svc p-rv"><div class="ic"><span class="num-badge">SAFE</span></div><h4>Safety-first culture</h4><p>Every job is planned and carried out to a clear safety frame, with work checked and finished to a consistent standard.</p></div>
    <div class="svc p-rv"><div class="ic"><span class="num-badge">RDY</span></div><h4>Ready &amp; responsive</h4><p>When a vessel is in dock or a plant component fails, WBME brings the right hands and backup fast.</p></div>
  </div>

  <div class="panel-cta p-rv"><a class="explore" href="#" data-mail>Request a quote &rarr;</a><a class="hero-call" href="tel:+26464285700">Call WBME</a></div>
</div>
</main>

<footer class="site-footer">
  <div class="sf-top">
    <a class="sf-brand" href="index.html">WB<b>ME</b></a>
    <nav class="sf-links" aria-label="Footer">
      <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
    </nav>
    <div class="sf-contact">
      <a href="tel:+26464285700">+264 (0)64 285 700</a>
      <a href="#" data-mail data-mail-text>Loading&hellip;</a>
      <span>8th Street East, Industrial Area, Walvis Bay</span>
    </div>
  </div>
  <div class="sf-bottom">&copy; 2026 Walvis Bay Marine Engineering &middot; No job too big, no job too small.</div>
</footer>

<div class="drawer" id="drawer">
  <div class="top"><button class="x" data-drawer-close aria-label="Close">&times;</button></div>
  <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
  <div class="df"><a href="tel:+26464285700">+264 (0)64 285 700</a><a href="#" data-mail data-mail-text>Email</a><span>8th Street East, Walvis Bay</span></div>
</div>

<button class="chatbot-fab" id="chatbotFab" type="button" aria-label="Chat with the WBME assistant" aria-expanded="false">
  <span class="chatbot-ring" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=96&height=96&resize=contain&quality=85" alt=""></span>
</button>
<div class="chatbot" id="chatbot" role="dialog" aria-label="WBME assistant" aria-hidden="true">
  <div class="cb-head">
    <span class="cb-prop" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=96&height=96&resize=contain&quality=85" alt=""></span>
    <div class="cb-id"><b>WBME Assistant</b><span>Walvis Bay Marine Engineering</span></div>
    <button class="cb-x" id="chatbotClose" type="button" aria-label="Close assistant">&times;</button>
  </div>
  <div class="cb-log" id="cbLog" aria-live="polite"></div>
  <div class="cb-chips" id="cbChips" aria-label="Suggested questions"></div>
  <form class="cb-bar" id="cbForm" novalidate>
    <input id="cbInput" type="text" placeholder="Ask about services, quotes, hours&hellip;" autocomplete="off" maxlength="300" aria-label="Message the WBME assistant">
    <button type="submit" aria-label="Send message">&#10148;</button>
  </form>
</div>

<script src="js/bucket-assets.js?v=43"></script>
<script src="js/experience.js?v=60"></script>
<script src="js/glass-fx.js?v=2"></script>
<script src="js/chatbot.js?v=2"></script>
</body>
</html>
```

Note: this page has no `.panel`, `.stage`, `.rail`, `.card`, `.morph`, `.panel-backdrop`, `.embers`, or `.vignette` elements at all — `js/experience.js`'s panel/rail code (`document.querySelectorAll('.panel')`, `document.getElementById('rail')`, etc.) all check for existence or degrade harmlessly when the elements are absent (e.g. `rail.innerHTML = ...` — wait, this one does NOT null-check). Because of this, proceed to Step 9 before testing.

- [ ] **Step 9: Guard the rail-build code so it no-ops when there's no `#rail` element (needed for every new page, not just this one)**

Find this exact line:

```javascript
  var cards = [
```

This is inside an IIFE that unconditionally does `rail.innerHTML = html;` further down without checking `rail` exists. Find this exact block:

```javascript
  /* build looping rail (3x duplicated) */
  var REPEAT = 2, railCards = [];
  (function build () {
    var html = '';
    for (var k = 0; k < N * REPEAT; k++) {
      var c = cards[k % N];
      html += '<div class="card" data-key="' + c.key + '" data-i="' + (k % N) + '">' +
              '<img src="' + resizedUrl(c.img, isMobile() ? 360 : 560, 66) + '" alt="' + c.t + '" decoding="async" loading="lazy">' +
              '<div class="lbl"><div class="s">' + c.s + '</div><div class="b">' + c.t + '</div></div></div>';
    }
    rail.innerHTML = html;
    railCards = rail.querySelectorAll('.card');
    railCards.forEach(function (el) {
      el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Open ' + cards[+el.dataset.i].t);
      el.addEventListener('click', function () { if (didDrag) return; openPanel(el.dataset.key, el); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(el.dataset.key, el); } });
    });
  })();
```

Replace it with (adds one guard clause; behavior on the old `index.html`, which still has `#rail`, is unchanged):

```javascript
  /* build looping rail (3x duplicated) — only on pages that have the rail (old Home, until Task 7) */
  var REPEAT = 2, railCards = [];
  (function build () {
    if (!rail) return;
    var html = '';
    for (var k = 0; k < N * REPEAT; k++) {
      var c = cards[k % N];
      html += '<div class="card" data-key="' + c.key + '" data-i="' + (k % N) + '">' +
              '<img src="' + resizedUrl(c.img, isMobile() ? 360 : 560, 66) + '" alt="' + c.t + '" decoding="async" loading="lazy">' +
              '<div class="lbl"><div class="s">' + c.s + '</div><div class="b">' + c.t + '</div></div></div>';
    }
    rail.innerHTML = html;
    railCards = rail.querySelectorAll('.card');
    railCards.forEach(function (el) {
      el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Open ' + cards[+el.dataset.i].t);
      el.addEventListener('click', function () { if (didDrag) return; openPanel(el.dataset.key, el); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(el.dataset.key, el); } });
    });
  })();
```

Also find this exact block (the `.copy` headline generator, which also assumes `copy`/`navA`/rail state unconditionally in `setVisual`, called immediately at "CORE START"):

```javascript
  /* ===== CORE START (guaranteed, before enhancements) ===== */
  document.body.classList.add('ready');
  if (progB) progB.style.width = (100 / N) + '%';
  if (copy) copy.classList.add('first');
  setVisual(0);
  setTimeout(function () { if (copy) copy.classList.remove('first'); }, 900);
  requestAnimationFrame(loop);
```

Replace it with (guards the whole rail-driven startup behind `if (rail)`, since none of it applies to the new pages — `body.ready` must still be added unconditionally, since the new engine and the page-hero entrance animation both depend on it):

```javascript
  /* ===== CORE START (guaranteed, before enhancements) ===== */
  document.body.classList.add('ready');
  if (rail) {
    if (progB) progB.style.width = (100 / N) + '%';
    if (copy) copy.classList.add('first');
    setVisual(0);
    setTimeout(function () { if (copy) copy.classList.remove('first'); }, 900);
    requestAnimationFrame(loop);
  }
```

Note `setVisual`, `loop`, and the rest of the drag/panel machinery are still defined unconditionally (function declarations are cheap and harmless to leave defined-but-uncalled) — they are deleted for real in Task 7. This step only prevents them from *running* against a DOM that doesn't have their elements.

- [ ] **Step 10: Verify About page end-to-end**

Run: `python -m http.server 8000`, open `http://localhost:8000/about.html`.

Check each of these and confirm it behaves as described:
1. No console errors (open DevTools console).
2. The preloader gauge plays once, then reveals the page.
3. The header is transparent over the hero image; scroll down 100px and confirm it gains a dark blurred background (`.site-hdr.scrolled`).
4. The "About" link in the header nav is gold/underlined (active state); other links are not.
5. Scroll down slowly: the lead statement, story/founder row, stat line, "standard we hold" list, industries grid, video, "Why WBME" cards, and CTA row each fade+rise into view as they cross into the viewport (not all at once on load).
6. The service-card-style "Why WBME" grid staggers in (cards appear a beat apart, not simultaneously).
7. The stat numbers (25+, 6, 1999, 100%) count up from 0 once the stat line scrolls into view.
8. The page-hero background photo visibly drifts (~10-20px) as you scroll past it (parallax).
9. A slim gold progress bar at the very top of the viewport fills left-to-right as you scroll down the page.
10. Click "Request a quote" — it opens your email client addressed to the (de-obfuscated) WBME email.
11. Open DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload — confirm all content is immediately visible (no fade-in delay), no parallax drift, counters show final values immediately.
12. Resize to a mobile width (375px) — confirm the header nav/phone collapse and the hamburger button appears; open the drawer, confirm About/Services/etc. links are present and navigate correctly (About link should reload the same page).
13. Reopen `http://localhost:8000/index.html` and confirm it is still fully functional (rail loop + click-to-open panels) — this is the regression check for this task.

- [ ] **Step 11: Commit**

```bash
git add css/experience.css js/experience.js about.html
git commit -m "$(cat <<'EOF'
Add scroll-effects engine and build the standalone About page

Introduces IntersectionObserver-driven reveals, parallax drift,
header scroll-state, active-nav, scroll progress, and scroll-
triggered counters — then proves the whole system out on a real,
normally-scrollable About page. The old rail/panel Home page is
untouched and still fully functional.
EOF
)"
```

---

### Task 2: Services page

**Files:**
- Create: `services.html`
- Test: manual browser check

- [ ] **Step 1: Create `services.html`**

Create `services.html` with this exact content (identical head/chrome to `about.html` except title/description and the main content, which is the current Services panel content from `index.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Services | Walvis Bay Marine Engineering</title>
<meta name="description" content="WBME covers rigging, fitting & turning, boiler making, fabrication, pipe works and welding — six marine and metal engineering disciplines, all in-house in Walvis Bay.">
<meta property="og:title" content="Services | Walvis Bay Marine Engineering">
<meta property="og:description" content="Ship repair, maintenance, fitting, rigging, welding, pipe works, boiler making and fabrication in Walvis Bay, Namibia.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/wbme%20photos%20for%20web%202026/Pics%20for%20T/Propulsion/CPP%20complete%20refit%201.jpg?width=1200&quality=75&resize=cover">
<link rel="icon" type="image/png" sizes="128x128" href="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=128&height=128&resize=contain&quality=90">
<link rel="preconnect" href="https://kbmgpqwmgthswjkfmqfe.supabase.co" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/experience.css?v=79">
</head>
<body data-page="services">

<div class="preloader" id="preloader" aria-label="Loading Walvis Bay Marine Engineering">
  <div class="pl-inner">
    <div class="pl-gauge">
      <div class="pl-ticks" aria-hidden="true"></div>
      <div class="pl-ring" id="plRing" aria-hidden="true"></div>
      <div class="pl-prop" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=220&height=220&resize=contain&quality=90" alt=""></div>
    </div>
    <div class="pl-pct" id="plPct" aria-hidden="true">0%</div>
    <div class="pl-word">
      <div class="pl-logo">WBME</div>
      <div class="pl-sub">Marine Engineering &middot; Walvis Bay</div>
    </div>
  </div>
</div>
<div class="grain"></div>
<div class="scroll-progress" id="scrollProgress"><i></i></div>

<header class="site-hdr" id="siteHeader">
  <a class="brand" href="index.html" aria-label="Walvis Bay Marine Engineering home"><img class="brand-logo" src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/New%20Logo.png?width=460&resize=contain&quality=90" alt="WBME"></a>
  <nav class="site-nav" aria-label="Primary">
    <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
  </nav>
  <div class="hdr-actions">
    <a class="hdr-phone" href="tel:+26464285700">+264 (0)64 285 700</a>
    <a class="nav-cta" href="contact.html">Request a quote</a>
  </div>
</header>
<button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>

<main>
<section class="panel-hero page-hero" data-parallax="0.18" style="background-image:url('images/6.jpg')" data-bucket-bg="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg">
  <div class="in"><div class="ey">Six disciplines &middot; In-house</div><h1 class="ti">Services</h1></div>
</section>
<div class="panel-body">
  <div class="panel-intro p-rv"><span class="eyebrow">What we do</span><h3>Ship repair &amp; maintenance services</h3><p>WBME covers the practical disciplines a vessel or plant job needs: rigging, fitting, machining, boiler making, fabrication, pipe work and welding, all from one Walvis Bay workshop.</p></div>
  <div class="svc-grid p-rv stagger">
    <div class="svc p-rv"><div class="ic"><img src="images/icon-image/service-icon1.png" alt=""></div><h4>Rigging</h4><p>General rigging for propeller shafts, rudder shafts, engines, alternators, generators, compressors, pumps and motors.</p><div class="proof"><b>Profile scope</b><span>Components prepared for installation, plus pipe work, tanks, burners and steel structures.</span></div><div class="tags"><span>Shafts</span><span>Engines</span><span>Pumps</span><span>Motors</span></div></div>
    <div class="svc p-rv"><div class="ic"><img src="images/icon-image/service-icon2.png" alt=""></div><h4>Fitting &amp; Turning</h4><p>Strip, overhaul, repair, new parts, re-assembly and installation for ship repair and maintenance work.</p><div class="proof"><b>Profile scope</b><span>Machined replacements, overhauls, precision repairs and fit-for-install components.</span></div><div class="tags"><span>Overhaul</span><span>New parts</span><span>Install</span></div></div>
    <div class="svc p-rv"><div class="ic"><img src="images/icon-image/service-icon3.png" alt=""></div><h4>Boiler Making</h4><p>General steel structural works, including renewal, modification, complete new builds, design, templates and material preparation.</p><div class="proof"><b>Profile scope</b><span>Hull, deck, bridge, walkways, ladders, masts, trawl doors, gantries, A-frames and ducting.</span></div><div class="tags"><span>Mild steel</span><span>Stainless</span><span>Aluminium</span></div></div>
    <div class="svc p-rv"><div class="ic"><img src="images/icon-image/service-icon4.png" alt=""></div><h4>Fabrication</h4><p>Profile cutting, rolling, bending, manufacture and installation of marine and industrial steel structures.</p><div class="proof"><b>Profile scope</b><span>Domes, tanks, burners, droppers, condensers, skips, base plates and custom structural work.</span></div><div class="tags"><span>Cutting</span><span>Rolling</span><span>Bending</span><span>Install</span></div></div>
    <div class="svc p-rv"><div class="ic"><img src="images/icon-image/service-icon5.png" alt=""></div><h4>Pipe Works</h4><p>Renewal, modification and complete new pipe works, including design, jigs and preparation of all materials.</p><div class="proof"><b>Profile scope</b><span>Pumps, motors, manifolds, auxiliaries, main engines, tanks, condensers, water refiners and valves.</span></div><div class="tags"><span>Steel</span><span>Copper</span><span>Galvanized</span><span>Valves</span></div></div>
    <div class="svc p-rv"><div class="ic"><img src="images/icon-image/service-icon6.png" alt=""></div><h4>Welding</h4><p>Gas welding, brazing, silver soldering, MIG, TIG and arc welding across marine and metal-work projects.</p><div class="proof"><b>Profile scope</b><span>Mild steel, stainless steel, aluminium, cast iron, strengthening and repairs to existing structures.</span></div><div class="tags"><span>MIG</span><span>TIG</span><span>Arc</span><span>Cast iron</span></div></div>
  </div>
  <div class="panel-cta p-rv"><a class="explore" href="#" data-mail data-subject="Service enquiry - WBME">Send job details</a><a class="hero-call" href="tel:+26464285700">Call workshop</a></div>
</div>
</main>

<footer class="site-footer">
  <div class="sf-top">
    <a class="sf-brand" href="index.html">WB<b>ME</b></a>
    <nav class="sf-links" aria-label="Footer">
      <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
    </nav>
    <div class="sf-contact">
      <a href="tel:+26464285700">+264 (0)64 285 700</a>
      <a href="#" data-mail data-mail-text>Loading&hellip;</a>
      <span>8th Street East, Industrial Area, Walvis Bay</span>
    </div>
  </div>
  <div class="sf-bottom">&copy; 2026 Walvis Bay Marine Engineering &middot; No job too big, no job too small.</div>
</footer>

<div class="drawer" id="drawer">
  <div class="top"><button class="x" data-drawer-close aria-label="Close">&times;</button></div>
  <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
  <div class="df"><a href="tel:+26464285700">+264 (0)64 285 700</a><a href="#" data-mail data-mail-text>Email</a><span>8th Street East, Walvis Bay</span></div>
</div>

<button class="chatbot-fab" id="chatbotFab" type="button" aria-label="Chat with the WBME assistant" aria-expanded="false">
  <span class="chatbot-ring" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=96&height=96&resize=contain&quality=85" alt=""></span>
</button>
<div class="chatbot" id="chatbot" role="dialog" aria-label="WBME assistant" aria-hidden="true">
  <div class="cb-head">
    <span class="cb-prop" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=96&height=96&resize=contain&quality=85" alt=""></span>
    <div class="cb-id"><b>WBME Assistant</b><span>Walvis Bay Marine Engineering</span></div>
    <button class="cb-x" id="chatbotClose" type="button" aria-label="Close assistant">&times;</button>
  </div>
  <div class="cb-log" id="cbLog" aria-live="polite"></div>
  <div class="cb-chips" id="cbChips" aria-label="Suggested questions"></div>
  <form class="cb-bar" id="cbForm" novalidate>
    <input id="cbInput" type="text" placeholder="Ask about services, quotes, hours&hellip;" autocomplete="off" maxlength="300" aria-label="Message the WBME assistant">
    <button type="submit" aria-label="Send message">&#10148;</button>
  </form>
</div>

<script src="js/bucket-assets.js?v=43"></script>
<script src="js/experience.js?v=60"></script>
<script src="js/glass-fx.js?v=2"></script>
<script src="js/chatbot.js?v=2"></script>
</body>
</html>
```

- [ ] **Step 2: Verify**

Open `http://localhost:8000/services.html`. Confirm: no console errors; the six service cards stagger-reveal on scroll; "Services" is the active nav link; header/footer/drawer/chatbot all match About's behavior; "Send job details" opens a mailto link with subject "Service enquiry - WBME".

- [ ] **Step 3: Commit**

```bash
git add services.html
git commit -m "Add standalone Services page"
```

---

### Task 3: Projects page

**Files:**
- Create: `projects.html`
- Test: manual browser check

- [ ] **Step 1: Create `projects.html`**

Same head/chrome pattern as Task 2 (title: "Projects | Walvis Bay Marine Engineering", description: "A look at real WBME workshop proof — ship repair, machining, fabrication, boiler making and more, from the Walvis Bay yard.", `data-page="projects"`, page-hero image `images/2.jpg` / bucket path `wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg`, eyebrow "From the yard", title "Projects"). Inside `<main>`, after the page-hero, use this exact `.panel-body` content (the full featured-work + gallery + lightbox from the current Projects panel in `index.html`, with `p-rv`/`stagger` added to the featured-work cards and gallery grid the same way Task 1/2 did):

```html
<div class="panel-body">
  <div class="panel-intro p-rv"><span class="eyebrow">Workshop proof</span><h3>Featured work from the yard</h3><p>A fast look at the kind of heavy, practical work WBME handles.</p></div>
  <div class="featured-work p-rv stagger" aria-label="Featured WBME project examples">
    <article class="work-card p-rv">
      <img src="images/1.jpg" data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg" alt="Kort nozzle and propeller shaft conversion work">
      <div><span>Ship repair</span><h4>Kort nozzle &amp; shaft conversion</h4><p>Removal and refit work changing a vessel from CPP to fixed shaft configuration.</p></div>
    </article>
    <article class="work-card p-rv">
      <img src="images/2.jpg" data-bucket-src="wbme photos for web 2026/Pics for T/Machining/Machining of new seal liners.jpg" alt="Machining new seal liners">
      <div><span>Machining</span><h4>New seal liners</h4><p>Precision fitting and turning for replacement components prepared for installation.</p></div>
    </article>
    <article class="work-card p-rv">
      <img src="images/3.jpg" data-bucket-src="wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 1.jpg" alt="Stainless steel tank fabrication">
      <div><span>Fabrication</span><h4>Stainless steel tank</h4><p>Custom steel fabrication, preparation and finish work for marine and industrial use.</p></div>
    </article>
    <article class="work-card p-rv">
      <img src="images/4.jpg" data-bucket-src="wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 1.jpg" alt="Bottom hull plate replacement">
      <div><span>Boiler making</span><h4>Hull plate replacement</h4><p>Structural renewal work for hull, deck and vessel steel repairs.</p></div>
    </article>
  </div>
  <div class="feed-intro p-rv"><span class="eyebrow">More from the yard</span><h3>Photo gallery</h3></div>
  <div class="gal p-rv stagger" aria-label="WBME project photo gallery">
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: CPP propeller refit" data-bucket-lb="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg" data-caption="CPP propeller refit">
      <img data-bucket-src="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg" alt="CPP propeller refit"><span class="cap">CPP propeller refit</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Propulsion overhaul" data-bucket-lb="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg" data-caption="Propulsion overhaul">
      <img data-bucket-src="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg" alt="Propulsion overhaul"><span class="cap">Propulsion overhaul</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New ship's rudder" data-bucket-lb="wbme photos for web 2026/New Complete Ships Rudder/12.jpg" data-caption="New ship's rudder">
      <img data-bucket-src="wbme photos for web 2026/New Complete Ships Rudder/12.jpg" alt="New ship's rudder"><span class="cap">New ship's rudder</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Sea water inlet strainer" data-bucket-lb="wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg" data-caption="Sea water inlet strainer">
      <img data-bucket-src="wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg" alt="Sea water inlet strainer"><span class="cap">Sea water inlet strainer</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New Thordon bushes" data-bucket-lb="wbme photos for web 2026/Pics for T/Machining/new thordon bushes.jpg" data-caption="New Thordon bushes">
      <img data-bucket-src="wbme photos for web 2026/Pics for T/Machining/new thordon bushes.jpg" alt="New Thordon bushes"><span class="cap">New Thordon bushes</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Propeller shaft bushes and stuffing box" data-bucket-lb="wbme photos for web 2026/Complete new propeller shaft bushes and stuffing box/20240807_110555.jpg" data-caption="Propeller shaft bushes &amp; stuffing box">
      <img data-bucket-src="wbme photos for web 2026/Complete new propeller shaft bushes and stuffing box/20240807_110555.jpg" alt="Propeller shaft bushes and stuffing box"><span class="cap">Shaft bushes &amp; stuffing box</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New ship's rudder, photo 1" data-bucket-lb="wbme photos for web 2026/New Complete Ships Rudder/1.jpg" data-caption="New ship's rudder — 1">
      <img data-bucket-src="wbme photos for web 2026/New Complete Ships Rudder/1.jpg" alt="New ship's rudder, photo 1"><span class="cap">New ship's rudder</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New ship's rudder, photo 4" data-bucket-lb="wbme photos for web 2026/New Complete Ships Rudder/4.jpg" data-caption="New ship's rudder — 4">
      <img data-bucket-src="wbme photos for web 2026/New Complete Ships Rudder/4.jpg" alt="New ship's rudder, photo 4"><span class="cap">New ship's rudder</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New ship's rudder, photo 6" data-bucket-lb="wbme photos for web 2026/New Complete Ships Rudder/6.jpg" data-caption="New ship's rudder — 6">
      <img data-bucket-src="wbme photos for web 2026/New Complete Ships Rudder/6.jpg" alt="New ship's rudder, photo 6"><span class="cap">New ship's rudder</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New ship's rudder, photo 8" data-bucket-lb="wbme photos for web 2026/New Complete Ships Rudder/8.jpg" data-caption="New ship's rudder — 8">
      <img data-bucket-src="wbme photos for web 2026/New Complete Ships Rudder/8.jpg" alt="New ship's rudder, photo 8"><span class="cap">New ship's rudder</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New ship's rudder, photo 11" data-bucket-lb="wbme photos for web 2026/New Complete Ships Rudder/11.jpg" data-caption="New ship's rudder — 11">
      <img data-bucket-src="wbme photos for web 2026/New Complete Ships Rudder/11.jpg" alt="New ship's rudder, photo 11"><span class="cap">New ship's rudder</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: New ship's rudder, photo 21" data-bucket-lb="wbme photos for web 2026/New Complete Ships Rudder/21.jpg" data-caption="New ship's rudder — 21">
      <img data-bucket-src="wbme photos for web 2026/New Complete Ships Rudder/21.jpg" alt="New ship's rudder, photo 21"><span class="cap">New ship's rudder</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 2" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/2.jpg" data-caption="Kort nozzle &amp; shaft conversion — 2">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/2.jpg" alt="Kort nozzle and shaft conversion, photo 2"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 3" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/3.jpg" data-caption="Kort nozzle &amp; shaft conversion — 3">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/3.jpg" alt="Kort nozzle and shaft conversion, photo 3"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 4" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/4.jpg" data-caption="Kort nozzle &amp; shaft conversion — 4">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/4.jpg" alt="Kort nozzle and shaft conversion, photo 4"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 5" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/5.jpg" data-caption="Kort nozzle &amp; shaft conversion — 5">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/5.jpg" alt="Kort nozzle and shaft conversion, photo 5"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 6" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/6.jpg" data-caption="Kort nozzle &amp; shaft conversion — 6">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/6.jpg" alt="Kort nozzle and shaft conversion, photo 6"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 7" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/7.jpg" data-caption="Kort nozzle &amp; shaft conversion — 7">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/7.jpg" alt="Kort nozzle and shaft conversion, photo 7"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 8" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/8.jpg" data-caption="Kort nozzle &amp; shaft conversion — 8">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/8.jpg" alt="Kort nozzle and shaft conversion, photo 8"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 9" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/9.jpg" data-caption="Kort nozzle &amp; shaft conversion — 9">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/9.jpg" alt="Kort nozzle and shaft conversion, photo 9"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 10" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/10.jpg" data-caption="Kort nozzle &amp; shaft conversion — 10">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/10.jpg" alt="Kort nozzle and shaft conversion, photo 10"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 11" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/11.jpg" data-caption="Kort nozzle &amp; shaft conversion — 11">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/11.jpg" alt="Kort nozzle and shaft conversion, photo 11"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Kort nozzle and shaft conversion, photo 12" data-bucket-lb="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/12.jpg" data-caption="Kort nozzle &amp; shaft conversion — 12">
      <img data-bucket-src="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/12.jpg" alt="Kort nozzle and shaft conversion, photo 12"><span class="cap">Kort nozzle &amp; shaft conversion</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Stainless steel tank, photo 2" data-bucket-lb="wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 2.jpg" data-caption="Stainless steel tank — 2">
      <img data-bucket-src="wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 2.jpg" alt="Stainless steel tank, photo 2"><span class="cap">Stainless steel tank</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Hull plate replacement, photo 2" data-bucket-lb="wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 2.jpg" data-caption="Hull plate replacement — 2">
      <img data-bucket-src="wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 2.jpg" alt="Hull plate replacement, photo 2"><span class="cap">Hull plate replacement</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Sea water inlet strainer, photo 2" data-bucket-lb="wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 2.jpg" data-caption="Sea water inlet strainer — 2">
      <img data-bucket-src="wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 2.jpg" alt="Sea water inlet strainer, photo 2"><span class="cap">Sea water inlet strainer</span>
    </div>
    <div class="g p-rv" tabindex="0" role="button" aria-label="View full image: Propeller shaft bushes and stuffing box, photo 1" data-bucket-lb="wbme photos for web 2026/Complete new propeller shaft bushes and stuffing box/1.jpg" data-caption="Shaft bushes &amp; stuffing box — 1">
      <img data-bucket-src="wbme photos for web 2026/Complete new propeller shaft bushes and stuffing box/1.jpg" alt="Propeller shaft bushes and stuffing box, photo 1"><span class="cap">Shaft bushes &amp; stuffing box</span>
    </div>
  </div>
  <div class="panel-cta p-rv"><a class="explore" href="#" data-mail data-subject="Project enquiry - WBME">Discuss a similar job</a><a class="hero-call" href="tel:+26464285700">Call WBME</a></div>
</div>
```

Also include, right before the closing `</body>` scripts (after the chatbot markup, same position as it exists today near the end of `index.html`), the lightbox markup:

```html
<div class="lightbox" id="lightbox">
  <span class="lc" aria-label="Close">&times;</span>
  <span class="ln lp" aria-label="Previous">&#8249;</span>
  <img src="images/2.jpg" alt="Selected project image">
  <p class="lb-caption" id="lbCaption">Dry-dock repair work</p>
  <span class="ln lnx" aria-label="Next">&#8250;</span>
</div>
```

Wire up the full page using the same head/preloader/header/footer/drawer/chatbot/script-tags structure as `services.html` from Task 2 (swap only the `<title>`, meta description/og tags, `data-page` value, and the page-hero content/image), with the featured-work + gallery + lightbox markup above inside `<main>`.

- [ ] **Step 2: Verify**

Open `http://localhost:8000/projects.html`. Confirm: featured-work cards and gallery thumbnails stagger-reveal on scroll; clicking any gallery thumbnail opens the lightbox with correct image/caption; left/right arrows cycle through images; Escape and the close (&times;) button both close it; "Projects" is the active nav link.

- [ ] **Step 3: Commit**

```bash
git add projects.html
git commit -m "Add standalone Projects page with gallery and lightbox"
```

---

### Task 4: Contact page

**Files:**
- Create: `contact.html`
- Test: manual browser check

- [ ] **Step 1: Create `contact.html`**

Same head/chrome pattern as Task 2/3 (title: "Contact | Walvis Bay Marine Engineering", description: "Reach Walvis Bay Marine Engineering by phone, email or the enquiry form — 8th Street East, Industrial Area, Walvis Bay, Namibia.", `data-page="contact"`, page-hero image `images/5.jpg` / bucket path `wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg`, eyebrow "Get in touch", title "Contact"). Inside `<main>`, after the page-hero, use this exact content:

```html
<div class="panel-body">
  <div class="contact-grid">
    <div class="info p-rv">
      <span class="eyebrow">Reach us</span>
      <h3>Tell us what needs fixing</h3>
      <p>When a vessel is in dock or a plant component fails, WBME is ready to respond &mdash; call, email or send job details below.</p>
      <div class="row"><div class="ic">LOC</div><div><b>Visit</b><span>8th Street East, Industrial Area<br>Walvis Bay, Namibia</span></div></div>
      <div class="row"><div class="ic">TEL</div><div><b>Call</b><span><a href="tel:+26464285700">+264 (0)64 285 700</a></span></div></div>
      <div class="row"><div class="ic">MAIL</div><div><b>Email</b><span><a href="#" data-mail data-mail-text>Loading&hellip;</a></span></div></div>
      <div class="row"><div class="ic">HRS</div><div><b>Hours</b><span>Monday&ndash;Friday 07:00&ndash;17:00 &middot; Saturday closed &middot; Sunday available on request</span></div></div>
    </div>
    <div class="formcard p-rv">
      <form id="contactForm" novalidate>
        <div class="frow">
          <div class="field"><label for="cname">Name</label><input id="cname" name="name" required placeholder="Your name"><span class="err">Please enter your name.</span></div>
          <div class="field"><label for="cemail">Email</label><input id="cemail" name="email" type="email" required placeholder="you@example.com"><span class="err">Enter a valid email.</span></div>
        </div>
        <div class="frow">
          <div class="field"><label for="cphone">Phone</label><input id="cphone" name="phone" placeholder="+264 &hellip;"></div>
          <div class="field"><label for="cservice">Service</label><select id="cservice" name="service"><option>General enquiry</option><option>Rigging</option><option>Fitting &amp; Turning</option><option>Boiler Making</option><option>Fabrication</option><option>Pipe Works</option><option>Welding</option></select></div>
        </div>
        <div class="field"><label for="cmsg">Message</label><textarea id="cmsg" name="message" required placeholder="Describe the work you need&hellip;"></textarea><span class="err">Please add a short message.</span></div>
        <button type="submit" class="btn-lime">Send request &rarr;</button>
        <p class="form-note">This opens your email app with the request filled in. Urgent job? Call +264 (0)64 285 700.</p>
      </form>
      <div class="form-ok">&check; Thanks! Your email app should open with your request ready to send.</div>
    </div>
  </div>
  <div class="map p-rv"><iframe title="WBME location" loading="lazy" src="https://www.google.com/maps?q=8th+Street+East,+Industrial+Area,+Walvis+Bay,+Namibia&output=embed"></iframe></div>
</div>
```

- [ ] **Step 2: Verify**

Open `http://localhost:8000/contact.html`. Confirm: form validation shows errors for empty required fields; submitting a valid form opens the email client with the details filled in (or shows the `.form-ok` message); the map loads; "Contact" is the active nav link.

- [ ] **Step 3: Commit**

```bash
git add contact.html
git commit -m "Add standalone Contact page with form and map"
```

---

### Task 5: Magnetic buttons (cursor-aware hover pull)

**Files:**
- Modify: `js/glass-fx.js`
- Modify: `css/experience.css`
- Test: manual browser check on About/Services/Contact (all already built)

- [ ] **Step 1: Add the magnetic-pull CSS**

Append to the end of `css/experience.css`:

```css
/* magnetic buttons: JS sets --tx/--ty on pointer devices only */
.explore,.hero-call,.btn-lime,.nav-cta{transform:translate(var(--tx,0px),var(--ty,0px));transition:transform .25s cubic-bezier(.16,1,.3,1),background .25s var(--ease-out),color .25s var(--ease-out),border-color .25s var(--ease-out)}
```

- [ ] **Step 2: Add the magnetic-pull JS**

Find this exact block in `js/glass-fx.js`:

```javascript
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
```

Replace it with (adds a second, independent effect — magnetic pull on primary buttons/CTAs — right after the existing spotlight logic):

```javascript
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

  var MAGNETIC_SEL = '.explore,.hero-call,.btn-lime,.nav-cta';
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
})();
```

- [ ] **Step 3: Verify**

Open `http://localhost:8000/about.html` (or services/contact) on a desktop browser (mouse, not touch emulation). Hover slowly across a button like "Request a quote" or "Call WBME" — confirm it visibly shifts a few pixels toward the cursor and springs back to center when the cursor leaves. Confirm this has no effect when DevTools device toolbar emulates a touch device (the `hover:hover` media check should prevent listeners from attaching — verify no console errors either way).

- [ ] **Step 4: Commit**

```bash
git add js/glass-fx.js css/experience.css
git commit -m "Add magnetic pull to primary buttons and CTAs"
```

---

### Task 6: Preloader fast path for repeat navigations

**Files:**
- Modify: `js/experience.js`
- Test: manual browser check navigating between About → Services

- [ ] **Step 1: Add the session-flag fast path**

Find this exact block:

```javascript
  (function preload () {
    var pre = document.getElementById('preloader'), ring = document.getElementById('plRing'), pct = document.getElementById('plPct');
    if (!pre) { ready = true; document.body.classList.add('ready'); return; }
    var MIN = 1150, CAP = 2600, start = Date.now();             // keep the loader crisp; MIN covers a full propeller-spin rotation (1.08s)
```

Replace it with (adds a `sessionStorage` check; the first page loaded in a browser session gets the full gauge, every subsequent page navigation within the same session gets a fast ~220ms fade instead):

```javascript
  (function preload () {
    var pre = document.getElementById('preloader'), ring = document.getElementById('plRing'), pct = document.getElementById('plPct');
    if (!pre) { ready = true; document.body.classList.add('ready'); return; }
    var SEEN_KEY = 'wbme_preloader_seen';
    var seenBefore = false;
    try { seenBefore = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { /* sessionStorage unavailable (privacy mode) — fall back to full gauge */ }
    if (seenBefore) {
      pre.classList.add('fast-skip');
      setTimeout(function () { pre.classList.add('done'); document.body.classList.add('ready'); ready = true; }, 220);
      return;
    }
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
    var MIN = 1150, CAP = 2600, start = Date.now();             // keep the loader crisp; MIN covers a full propeller-spin rotation (1.08s)
```

- [ ] **Step 2: Add the fast-skip fade CSS**

Append to the end of `css/experience.css`:

```css
/* repeat-navigation preloader: quick fade instead of the full gauge animation */
.preloader.fast-skip{transition:opacity .2s ease}
.preloader.fast-skip.done{opacity:0;pointer-events:none}
```

- [ ] **Step 3: Verify**

Open `http://localhost:8000/about.html` in a fresh browser tab (or after clearing session storage via DevTools → Application → Session Storage → delete `wbme_preloader_seen`). Confirm the full gauge preloader plays (ring fills, percentage counts up). Then click the "Services" nav link. Confirm `services.html` loads with only a brief ~200ms fade, not the full gauge animation. Open DevTools → Application → Session Storage and confirm a `wbme_preloader_seen` key with value `1` exists.

- [ ] **Step 4: Commit**

```bash
git add js/experience.js css/experience.css
git commit -m "Skip the full preloader gauge on repeat page navigations"
```

---

### Task 7: Rebuild Home (index.html) and retire the rail/panel system

**Files:**
- Modify: `index.html` (full rewrite of body content)
- Modify: `js/experience.js` (delete rail/drag/panel code, update chatbot fallback and hooks)
- Modify: `js/chatbot.js` (change panel-opening actions to real page links)
- Test: manual browser check + full regression pass across all 5 pages

This is the task where the old interaction model is actually removed — up to now it has coexisted with the new pages.

- [ ] **Step 1: Rewrite `index.html`**

Replace the entire file with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Walvis Bay Marine Engineering | WBME Ship Repair & Maintenance, Namibia</title>
<meta name="description" content="Walvis Bay Marine Engineering (WBME): professional marine engineering, ship repair, maintenance, fitting, rigging, welding, pipe works, boiler making and fabrication in Walvis Bay, Namibia.">
<meta property="og:title" content="Walvis Bay Marine Engineering">
<meta property="og:description" content="25 years of service excellence in marine engineering, ship repair and metal work. No job too big, no job too small.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/wbme%20photos%20for%20web%202026/Pics%20for%20T/Propulsion/CPP%20complete%20refit%202.jpg?width=1200&quality=75&resize=cover">
<link rel="icon" type="image/png" sizes="128x128" href="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=128&height=128&resize=contain&quality=90">
<link rel="preconnect" href="https://kbmgpqwmgthswjkfmqfe.supabase.co" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/experience.css?v=79">
</head>
<body data-page="home">

<div class="preloader" id="preloader" aria-label="Loading Walvis Bay Marine Engineering">
  <div class="pl-inner">
    <div class="pl-gauge">
      <div class="pl-ticks" aria-hidden="true"></div>
      <div class="pl-ring" id="plRing" aria-hidden="true"></div>
      <div class="pl-prop" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=220&height=220&resize=contain&quality=90" alt=""></div>
    </div>
    <div class="pl-pct" id="plPct" aria-hidden="true">0%</div>
    <div class="pl-word">
      <div class="pl-logo">WBME</div>
      <div class="pl-sub">Marine Engineering &middot; Walvis Bay</div>
    </div>
  </div>
</div>
<div class="grain"></div>
<div class="scroll-progress" id="scrollProgress"><i></i></div>

<header class="site-hdr" id="siteHeader">
  <a class="brand" href="index.html" aria-label="Walvis Bay Marine Engineering home"><img class="brand-logo" src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/New%20Logo.png?width=460&resize=contain&quality=90" alt="WBME"></a>
  <nav class="site-nav" aria-label="Primary">
    <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
  </nav>
  <div class="hdr-actions">
    <a class="hdr-phone" href="tel:+26464285700">+264 (0)64 285 700</a>
    <a class="nav-cta" href="contact.html">Request a quote</a>
  </div>
</header>
<button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button>

<main>
<section class="stage" id="stage">
  <h1 class="sr-only">Walvis Bay Marine Engineering: professional marine engineering, ship repair and maintenance, fabrication, fitting, rigging, welding, boiler making and pipe works in Walvis Bay, Namibia.</h1>
  <div class="bg on" data-i="0" style="background-image:url('https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/Hero%20Boat.png?width=1600&quality=72&resize=contain')"></div>
  <div class="scrim"></div>
  <div class="copy">
    <div class="ey">Est. 1999 &middot; Walvis Bay</div>
    <div class="ti">Marine &amp; Metal Engineering</div>
    <div class="hero-actions">
      <a class="explore" href="about.html">Explore WBME &rarr;</a>
      <a class="hero-call" href="tel:+26464285700">Call WBME</a>
    </div>
  </div>
  <div class="hint">Walvis Bay &middot; Namibia</div>
  <div class="localtime" id="localtime"></div>
  <div class="stage-footer">Scroll to explore &darr;</div>
</section>

<section class="home-section p-rv" id="home-about">
  <div class="hs-media" data-parallax="0.14" style="background-image:url('images/1.jpg')" data-bucket-bg="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg"></div>
  <div class="hs-copy">
    <span class="eyebrow">Est. 1999 &middot; Walvis Bay</span>
    <h2>25 years of founder-led craftsmanship</h2>
    <p>WBME was established by the late Mr. Uwe Cr&uuml;ys in 1999 and built on one ethic that still runs every job: value the customer, value the person, take pride in the small things that keep expensive equipment working.</p>
    <a class="explore" href="about.html">Read our story &rarr;</a>
  </div>
</section>

<section class="home-section home-section-rev p-rv" id="home-services">
  <div class="hs-media" data-parallax="0.14" style="background-image:url('images/6.jpg')" data-bucket-bg="wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg"></div>
  <div class="hs-copy">
    <span class="eyebrow">Six disciplines &middot; In-house</span>
    <h2>Rigging, fabrication, welding &amp; more</h2>
    <p>Rigging, fitting &amp; turning, boiler making, fabrication, pipe works and welding &mdash; all handled in-house from one Walvis Bay workshop, no job too big, no job too small.</p>
    <a class="explore" href="services.html">See all services &rarr;</a>
  </div>
</section>

<section class="home-section p-rv" id="home-projects">
  <div class="hs-media" data-parallax="0.14" style="background-image:url('images/2.jpg')" data-bucket-bg="wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg"></div>
  <div class="hs-copy">
    <span class="eyebrow">From the yard</span>
    <h2>Real proof, not stock photography</h2>
    <p>From dry-dock repairs to precision machining &mdash; browse real project photography from the jobs WBME has built, restored and repaired.</p>
    <a class="explore" href="projects.html">View projects &rarr;</a>
  </div>
</section>

<section class="home-cta p-rv" id="home-contact">
  <h2>Vessel in dock? Component down?</h2>
  <p>Call, email or send job details &mdash; WBME responds fast when work is time-critical.</p>
  <div class="panel-cta"><a class="explore" href="contact.html">Contact WBME &rarr;</a><a class="hero-call" href="tel:+26464285700">Call WBME</a></div>
</section>
</main>

<footer class="site-footer">
  <div class="sf-top">
    <a class="sf-brand" href="index.html">WB<b>ME</b></a>
    <nav class="sf-links" aria-label="Footer">
      <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
    </nav>
    <div class="sf-contact">
      <a href="tel:+26464285700">+264 (0)64 285 700</a>
      <a href="#" data-mail data-mail-text>Loading&hellip;</a>
      <span>8th Street East, Industrial Area, Walvis Bay</span>
    </div>
  </div>
  <div class="sf-bottom">&copy; 2026 Walvis Bay Marine Engineering &middot; No job too big, no job too small.</div>
</footer>

<div class="drawer" id="drawer">
  <div class="top"><button class="x" data-drawer-close aria-label="Close">&times;</button></div>
  <a href="index.html">Home</a><a href="about.html">About</a><a href="services.html">Services</a><a href="projects.html">Projects</a><a href="contact.html">Contact</a>
  <div class="df"><a href="tel:+26464285700">+264 (0)64 285 700</a><a href="#" data-mail data-mail-text>Email</a><span>8th Street East, Walvis Bay</span></div>
</div>

<button class="chatbot-fab" id="chatbotFab" type="button" aria-label="Chat with the WBME assistant" aria-expanded="false">
  <span class="chatbot-ring" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=96&height=96&resize=contain&quality=85" alt=""></span>
</button>
<div class="chatbot" id="chatbot" role="dialog" aria-label="WBME assistant" aria-hidden="true">
  <div class="cb-head">
    <span class="cb-prop" aria-hidden="true"><img src="https://kbmgpqwmgthswjkfmqfe.supabase.co/storage/v1/render/image/public/WBME/propeller.png?width=96&height=96&resize=contain&quality=85" alt=""></span>
    <div class="cb-id"><b>WBME Assistant</b><span>Walvis Bay Marine Engineering</span></div>
    <button class="cb-x" id="chatbotClose" type="button" aria-label="Close assistant">&times;</button>
  </div>
  <div class="cb-log" id="cbLog" aria-live="polite"></div>
  <div class="cb-chips" id="cbChips" aria-label="Suggested questions"></div>
  <form class="cb-bar" id="cbForm" novalidate>
    <input id="cbInput" type="text" placeholder="Ask about services, quotes, hours&hellip;" autocomplete="off" maxlength="300" aria-label="Message the WBME assistant">
    <button type="submit" aria-label="Send message">&#10148;</button>
  </form>
</div>

<script src="js/bucket-assets.js?v=43"></script>
<script src="js/experience.js?v=60"></script>
<script src="js/glass-fx.js?v=2"></script>
<script src="js/chatbot.js?v=2"></script>
</body>
</html>
```

- [ ] **Step 2: Add Home-specific CSS (hero copy is now static, plus the new teaser sections and CTA band)**

Append to the end of `css/experience.css`:

```css
/* ===========================================================
   HOME — static hero copy + scroll teaser sections
   =========================================================== */
.stage .copy{position:absolute;left:48px;bottom:14vh;z-index:5;max-width:640px}
.stage .copy .ey{font-family:'Archivo';font-weight:600;font-size:.78rem;letter-spacing:.3em;text-transform:uppercase;color:var(--gold-lt);margin-bottom:16px}
.stage .copy .ti{font-family:'Anton';font-size:clamp(3.6rem,10.5vw,10.5rem);line-height:.9;text-transform:uppercase;color:#fff}
.stage .hero-actions{margin-top:34px;display:flex;align-items:center;gap:26px}
.stage .stage-footer{opacity:.8}

.home-section{position:relative;min-height:70vh;display:flex;align-items:center;padding:80px 48px}
.home-section-rev{flex-direction:row-reverse}
.hs-media{position:absolute;inset:-10% -5%;background-size:cover;background-position:center;z-index:0;filter:brightness(.55) saturate(.95)}
.hs-copy{position:relative;z-index:1;max-width:560px;background:rgba(7,15,26,.42);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);padding:36px;border-radius:18px}
.home-section-rev .hs-copy{margin-left:auto}
.hs-copy h2{font-family:'Anton';text-transform:uppercase;font-size:clamp(1.8rem,3.4vw,2.8rem);line-height:1;margin:14px 0 18px;color:#fff}
.hs-copy p{color:var(--text-body,#dbe2ec);margin-bottom:22px;max-width:52ch;line-height:1.7}

.home-cta{text-align:center;padding:100px 24px;background:var(--panel)}
.home-cta h2{font-family:'Anton';text-transform:uppercase;font-size:clamp(2rem,4vw,3.2rem);color:#fff;margin-bottom:16px}
.home-cta p{color:var(--mut);max-width:48ch;margin:0 auto 30px}
.home-cta .panel-cta{justify-content:center}

@media(max-width:860px){
  .stage .copy{left:22px;right:22px;bottom:16vh;max-width:none}
  .home-section,.home-section-rev{flex-direction:column;padding:56px 22px;text-align:left}
  .hs-copy{margin-left:0;max-width:none}
}
```

- [ ] **Step 3: Delete the rail-loop, drag, and panel-morph code from `js/experience.js`**

Find this exact block (the `cards` array through the drift `loop` function and `navA` wiring — everything the old rail/panel system needs that the Home page no longer has):

```javascript
  var cards = [
    { key:'about',      bg:bucketAsset('Hero Boat.png'), img:bucketAsset('wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 2.jpg'), s:'Est. 1999 · Walvis Bay', t:'About',      d:'25 years of service excellence in marine engineering, ship repair and metal work.' },
    { key:'why',        bg:bucketAsset('wbme photos for web 2026/New Complete Ships Rudder/12.jpg'), img:bucketAsset('wbme photos for web 2026/New Complete Ships Rudder/12.jpg'), s:'The standard',           t:'Why WBME',   ht:'WBME', d:'Skilled professionals, a reputation for excellence and partnerships built through commitment.' },
    { key:'services',   bg:bucketAsset('wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg'), img:bucketAsset('wbme photos for web 2026/Pics for T/Propulsion/CPP complete refit 1.jpg'), s:'Six disciplines',        t:'Services',   d:'Ship repair, maintenance, fitting, rigging, pipe works, boiler making, fabrication and welding.' },
    { key:'projects',   bg:bucketAsset('wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg'), img:bucketAsset('wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg'), s:'Our work',               t:'Projects',   d:'From dry-dock repairs to precision machining — a look at what we build and restore.' },
    { key:'contact',    bg:bucketAsset('wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg'), img:bucketAsset('wbme photos for web 2026/Pics for T/Pipe Works/sea water inlet strainer 1.jpg'), s:'Get in touch',           t:'Contact',    d:'Headquarters: 8th Street East, Industrial Area, Walvis Bay. Call +264 (0)64 285 700.' }
  ];
  var N = cards.length;

  var bgs   = document.querySelectorAll('.bg'),
      rail  = document.getElementById('rail'),
      railWrap = document.querySelector('.rail-wrap'),
      copy  = document.getElementById('copy'),
      navA  = document.querySelectorAll('#nav a[data-key]'),
      progB = document.getElementById('progBar'),
      cnEl  = document.getElementById('cn'),
      backdrop = document.getElementById('panelBackdrop');

  // lazy backgrounds: only load one as it becomes active (was loading all 8 up front)
  function ensureBg (i) { var b = bgs[i]; if (b && !b.getAttribute('data-loaded')) { b.setAttribute('data-loaded', '1'); b.style.backgroundImage = "url('" + cards[i].bg + "')"; } }
  function resizedUrl (url, width, quality) {
    return String(url || '').replace(/([?&])width=\d+/, '$1width=' + width).replace(/([?&])quality=\d+/, '$1quality=' + quality);
  }
  ensureBg(0);

  /* build looping rail (3x duplicated) — only on pages that have the rail (old Home, until Task 7) */
  var REPEAT = 2, railCards = [];
  (function build () {
    if (!rail) return;
    var html = '';
    for (var k = 0; k < N * REPEAT; k++) {
      var c = cards[k % N];
      html += '<div class="card" data-key="' + c.key + '" data-i="' + (k % N) + '">' +
              '<img src="' + resizedUrl(c.img, isMobile() ? 360 : 560, 66) + '" alt="' + c.t + '" decoding="async" loading="lazy">' +
              '<div class="lbl"><div class="s">' + c.s + '</div><div class="b">' + c.t + '</div></div></div>';
    }
    rail.innerHTML = html;
    railCards = rail.querySelectorAll('.card');
    railCards.forEach(function (el) {
      el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Open ' + cards[+el.dataset.i].t);
      el.addEventListener('click', function () { if (didDrag) return; openPanel(el.dataset.key, el); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(el.dataset.key, el); } });
    });
  })();

  var cardStep = 218;
  function measure () {
    if (railCards.length > 1) {
      var d = railCards[1].getBoundingClientRect().left - railCards[0].getBoundingClientRect().left;
      if (d > 10) cardStep = d;
    }
  }
  measure();
  window.addEventListener('resize', measure);

  /* visual state (no transform) */
  function setVisual (i) {
    bgs.forEach(function (b) { b.classList.toggle('on', +b.dataset.i === 0); }); // fixed hero bg: always the first photo, never swaps
    var c = cards[i];
    copy.innerHTML = '<div class="swap"><div class="ey">' + c.s + '</div><div class="ti" aria-hidden="true">' + (c.ht || c.t) + '</div>' +
      '<div class="hero-actions"><button class="explore" data-key="' + c.key + '">Explore ' + c.t + ' →</button><a class="hero-call" href="tel:+26464285700">Call WBME</a></div></div>';
    copy.querySelector('.explore').addEventListener('click', function () { openPanel(c.key, firstCard(c.key)); });
    navA.forEach(function (a) { a.classList.toggle('act', a.dataset.key === c.key); });
    railCards.forEach(function (el) { el.classList.toggle('focus', +el.dataset.i === i); });
    if (copy) copy.classList.toggle('anim', !dragging && Math.abs(velocity) < speed * 1.7);
    if (cnEl) cnEl.textContent = '0' + (i + 1);
    if (progB) progB.style.transform = 'translateX(' + (i * 100) + '%)';
  }

  /* continuous drift loop */
  var offset = 0, speed = 64, lastActive = -1, ready = false;
  var dragging = false, dragStartX = 0, dragStartOffset = 0, didDrag = false;
  var velocity = speed, lastOffset = 0, lastFrame = 0;
  function loop (now) {
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
    lastFrame = now;
    if (document.hidden) { requestAnimationFrame(loop); return; }
    if (dragging) {
      velocity = (offset - lastOffset) / Math.max(dt, 1 / 120); // capture fling velocity
    } else {
      var target = current ? 0 : speed;   // keep drifting even under reduced-motion (user wants the cards moving)
      velocity += (target - velocity) * Math.min(1, dt * 4.2);  // momentum eases back into the ambient drift
      offset += velocity * dt;
    }
    lastOffset = offset;
    var wrap = cardStep * N;
    var x = ((offset % wrap) + wrap) % wrap;
    rail.style.transform = 'translate3d(' + (-(Math.round(x * 2) / 2)) + 'px,0,0)';
    var active = ((Math.round(offset / cardStep) % N) + N) % N;
    if (active !== lastActive) { lastActive = active; setVisual(active); }
    requestAnimationFrame(loop);
  }
  function keyActivate (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }
  navA.forEach(function (a) {
    a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button');
    a.addEventListener('click', function () { openPanel(a.dataset.key, firstCard(a.dataset.key)); });
    a.addEventListener('keydown', keyActivate);
  });

  /* ===== CORE START (guaranteed, before enhancements) ===== */
  document.body.classList.add('ready');
  if (rail) {
    if (progB) progB.style.width = (100 / N) + '%';
    if (copy) copy.classList.add('first');
    setVisual(0);
    setTimeout(function () { if (copy) copy.classList.remove('first'); }, 900);
    requestAnimationFrame(loop);
  }

  /* ===== GRAB TO SCROLL (mouse + touch) with momentum ===== */
  if (railWrap) {
    var pdown = false;
    railWrap.addEventListener('pointerdown', function (e) { pdown = true; didDrag = false; dragStartX = e.clientX; });
    window.addEventListener('pointermove', function (e) {
      if (!pdown) return;
      if (!dragging) {
        if (Math.abs(e.clientX - dragStartX) <= 4) return;
        dragging = true; didDrag = true; dragStartX = e.clientX; dragStartOffset = offset; railWrap.classList.add('grabbing');
      }
      offset = dragStartOffset - (e.clientX - dragStartX);
    });
    var endDrag = function () { pdown = false; if (dragging) { dragging = false; railWrap.classList.remove('grabbing'); } };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  /* ===== PANEL (modal morph) ===== */
  var current = null, animating = false, lastTrigger = null;
  function restoreFocus () { if (lastTrigger && lastTrigger.focus) { try { lastTrigger.focus(); } catch (_) {} } }
  function panelEl (key) { return document.getElementById('panel-' + key); }
  function firstCard (key) { return document.querySelector('.card[data-key="' + key + '"]'); }
  function cardImg (key) { for (var i = 0; i < N; i++) if (cards[i].key === key) return cards[i].img; return ''; }
  function lock () { document.body.classList.add('locked'); }
  function unlock () { document.body.classList.remove('locked'); }
  document.querySelectorAll('.panel').forEach(function (panel) {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('tabindex', '-1');
    var title = panel.querySelector('.panel-hero .ti');
    if (title) {
      if (!title.id) title.id = panel.id + '-title';
      panel.setAttribute('aria-labelledby', title.id);
    }
  });

  function showPanelContent (panel) {
    panel.classList.add('open');
    requestAnimationFrame(function () { panel.classList.add('shown'); });
    var sc = panel.querySelector('.panel-scroll'); if (sc) sc.scrollTop = 0;
    panel.setAttribute('aria-hidden', 'false');
    if (window.WBME_HYDRATE_BUCKET_ASSETS) window.WBME_HYDRATE_BUCKET_ASSETS(panel);
    var hero = panel.querySelector('.panel-hero'), im = cardImg(panel.id.replace('panel-', ''));
    if (hero && im) hero.style.backgroundImage = "url('" + im + "')";   // match panel hero to the real card photo
    var mp = document.getElementById('modalProgress'); if (mp) { mp.classList.add('on'); mp.querySelector('i').style.transform = 'scaleX(0)'; }
    var cb = panel.querySelector('[data-close]'); if (cb) cb.focus();
    panel.querySelectorAll('[data-count]').forEach(function (el) {
      var to = +el.dataset.count, sf = el.dataset.suffix || '', c = 0, st = Math.max(1, Math.ceil(to / 26));
      var t = setInterval(function () { c += st; if (c >= to) { c = to; clearInterval(t); } el.textContent = c + sf; }, 26);
    });
  }

  function doOpen (key, cardEl) {
    var panel = panelEl(key); if (!panel) return;
    backdrop.classList.add('open');
    lock();
    showPanelContent(panel);
    animating = true;
    var onEnd = function (e) { if (e.target === panel && e.propertyName === 'transform') fin(); };
    var fin = function () { panel.removeEventListener('transitionend', onEnd); animating = false; };
    panel.addEventListener('transitionend', onEnd);
    setTimeout(fin, 560); // fallback in case transitionend doesn't fire
  }

  function doClose () {
    var key = current, panel = panelEl(key); if (!panel) return;
    backdrop.classList.remove('open');
    var mp = document.getElementById('modalProgress'); if (mp) mp.classList.remove('on');
    panel.classList.remove('shown');
    panel.setAttribute('aria-hidden', 'true');
    animating = true;
    var fin = function () {
      panel.removeEventListener('transitionend', onEnd);
      panel.classList.remove('open');
      animating = false; unlock(); restoreFocus();
    };
    var onEnd = function (e) { if (e.target === panel && e.propertyName === 'transform') fin(); };
    panel.addEventListener('transitionend', onEnd);
    setTimeout(fin, 560); // fallback in case transitionend doesn't fire
  }

  function openPanel (key, cardEl) {
    if (animating || current === key || !panelEl(key)) return;
    lastTrigger = cardEl || document.activeElement;
    current = key;
    history.pushState({ panel: key }, '', '#' + key);
    doOpen(key, cardEl);
  }
  function closePanel () {
    if (!current || animating) return;
    if (history.state && history.state.panel) { history.back(); }
    else { doClose(); current = null; history.replaceState(null, '', location.pathname + location.search); }
  }
  window.addEventListener('popstate', function (e) {
    var key = (e.state && e.state.panel) || null;
    if (key && panelEl(key)) { if (current !== key) { current = key; doOpen(key, firstCard(key)); } }
    else if (current) { doClose(); current = null; }
  });

  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closePanel); });
  backdrop.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('lightbox').classList.contains('open')) return closeLb();
    if (drawer.classList.contains('open')) return closeDrawer();
    if (current) closePanel();
  });
  document.addEventListener('keydown', function (e) {
    var ae = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && ae && ae.hasAttribute && ae.hasAttribute('data-lb')) { e.preventDefault(); ae.click(); return; }
    if (e.key === 'Tab' && current) {               // focus trap inside the open panel
      var panel = panelEl(current); if (!panel) return;
      var f = Array.prototype.filter.call(panel.querySelectorAll('button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && ae === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
    }
  });
```

Replace the entire block above with this (keeps `bucketAsset`-adjacent helpers gone since they're unused now, keeps a minimal `lock`/`unlock` pair since the drawer still needs them, keeps `keyActivate` since the drawer's link `forEach` — kept as-is in Task 1 Step 6 — still calls it, keeps the lightbox-related Escape handling, drops everything rail/drag/panel-specific):

```javascript
  var bgs = document.querySelectorAll('.bg');

  function lock () { document.body.classList.add('locked'); }
  function unlock () { document.body.classList.remove('locked'); }
  function keyActivate (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var lb = document.getElementById('lightbox');
    if (lb && lb.classList.contains('open')) return closeLb();
    if (drawer.classList.contains('open')) return closeDrawer();
  });
  document.addEventListener('keydown', function (e) {
    var ae = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && ae && ae.hasAttribute && ae.hasAttribute('data-lb')) { e.preventDefault(); ae.click(); return; }
  });

  /* ===== CORE START (guaranteed, before enhancements) ===== */
  document.body.classList.add('ready');
```

Note: `bgs` is kept because the Home hero's `.bg.on` element is now the only background layer (no crossfade needed — it's set directly via inline `style` in the new `index.html`, matching how the old code already treated `bgs[0]` as "always the first photo, never swaps"). `closeLb`/`drawer`/`closeDrawer` are defined later in the file (function hoisting makes forward references safe for `function closeLb(){}`-style declarations, since none of this task's deletions touch the Lightbox or Drawer sections — confirm the Lightbox section further down in the file still reads `function closeLb () { ... }`, a function declaration rather than a `var closeLb = function(){}` expression, when you reach the verification steps at the end of this task).

- [ ] **Step 4: Fix the preloader's hero-image wait, which currently reads the now-deleted `cards` array**

The file still has `'use strict'` at the top. The preloader (inside the `try{...}` enhancements block further down, untouched so far) currently reads `cards[0].bg` to know which image to wait for — since Step 3 just deleted the `cards` array, this would throw `ReferenceError: cards is not defined` on every page. It also still assigns `ready = true` in two places; `ready` was declared in the block Step 3 deleted (`var offset = 0, speed = 64, lastActive = -1, ready = false;`), so without a replacement declaration those assignments would throw too, since strict-mode assignment to an undeclared variable is a `ReferenceError`.

Find this exact line (this text is from after Task 6's edit — if you are executing this plan in order, Task 6 already changed the lines above this one, but this specific line is unchanged by Task 6):

```javascript
    var urls = [cards[0] && cards[0].bg].filter(Boolean); // wait only for the first visible hero image, not all 8
```

Replace it with (reads the hero image URL generically from whichever `.bg` element is on the page — present on Home, absent on About/Services/Projects/Contact, in which case `urls` is simply empty and the preloader waits on fonts only):

```javascript
    var heroBg = document.querySelector('.bg');
    var heroBgUrl = heroBg && heroBg.style.backgroundImage ? heroBg.style.backgroundImage.replace(/^url\((['"]?)(.*)\1\)$/, '$2') : '';
    var urls = [heroBgUrl].filter(Boolean); // wait only for the first visible hero image, if this page has one
```

Then find this exact line, near the top of the same IIFE (declares the vars the deleted rail/loop code used to own):

```javascript
  function lock () { document.body.classList.add('locked'); }
  function unlock () { document.body.classList.remove('locked'); }
  function keyActivate (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }
```

Replace it with (restores the `ready` flag the preloader still assigns to):

```javascript
  function lock () { document.body.classList.add('locked'); }
  function unlock () { document.body.classList.remove('locked'); }
  function keyActivate (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }
  var ready = false;
```

- [ ] **Step 5: Remove the deep-link-to-panel code at the bottom of the file**

Find this exact block:

```javascript
  /* ===== DEEP LINK ===== */
  var initKey = location.hash ? location.hash.slice(1) : '';
  if (initKey && panelEl(initKey)) {
    current = initKey;
    history.replaceState({ panel: initKey }, '', '#' + initKey);
    (function waitReady () {                      // don't open behind the still-visible preloader
      if (ready) { doOpen(initKey, firstCard(initKey)); return; }
      setTimeout(waitReady, 80);
    })();
  }
})();
```

Replace it with:

```javascript
})();
```

- [ ] **Step 6: Update the chatbot FAB fallback and remove the panel-opening hooks**

Find this exact block:

```javascript
  var chatbotFab = document.getElementById('chatbotFab');
  if (chatbotFab) {
    chatbotFab.addEventListener('click', function () {
      if (window.WBME_CHATBOT) { window.WBME_CHATBOT.toggle(); return; }
      openPanel('contact', firstCard('contact'));   // fallback if the assistant script fails to load
    });
  }

  /* hooks for the assistant (js/chatbot.js) */
  window.WBME_OPEN_PANEL = openPanel;
  window.WBME_FIRST_CARD = firstCard;
  window.WBME_MAIL = mailHref;
  window.WBME_EMAIL = EMAIL;
```

Replace it with:

```javascript
  var chatbotFab = document.getElementById('chatbotFab');
  if (chatbotFab) {
    chatbotFab.addEventListener('click', function () {
      if (window.WBME_CHATBOT) { window.WBME_CHATBOT.toggle(); return; }
      window.location.href = 'contact.html';   // fallback if the assistant script fails to load
    });
  }

  /* hooks for the assistant (js/chatbot.js) */
  window.WBME_MAIL = mailHref;
  window.WBME_EMAIL = EMAIL;
```

- [ ] **Step 7: Remove the now-fully-dead `ENABLE_CARD_TILT` magnetic/tilt block (it targeted `railCards`/`navA`, both gone)**

Find this exact block:

```javascript
  /* ===== MAGNETIC · CARD TILT ===== */
  if (ENABLE_CARD_TILT && window.matchMedia('(hover:hover)').matches) {
    railCards.forEach(function (el) {
      el.addEventListener('mouseleave', function () { el.style.transform = ''; var im = el.querySelector('img'); if (im) im.style.transform = ''; });
      el.addEventListener('mousemove', function (e) {
        if (dragging) return;
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(800px) rotateY(' + (px * 11) + 'deg) rotateX(' + (-py * 11) + 'deg) translateY(-8px)';
        var im = el.querySelector('img'); if (im) im.style.transform = 'scale(1.12) translate(' + (px * -14) + 'px,' + (py * -14) + 'px)';
      });
    });
    var mag = function (el, k) {
      el.addEventListener('mousemove', function (e) { var r = el.getBoundingClientRect(); el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * k) + 'px,' + ((e.clientY - r.top - r.height / 2) * k) + 'px)'; });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    };
    navA.forEach(function (a) { mag(a, 0.3); });
  }

```

Replace it with nothing (delete the block entirely — remove those lines from the file).

- [ ] **Step 8: Update `js/chatbot.js` to navigate to real pages instead of opening panels**

Find this exact block:

```javascript
  var ACT = {
    about:    ['Open About', 'panel', 'about'],
    why:      ['Why WBME', 'panel', 'why'],
    services: ['Open Services', 'panel', 'services'],
    projects: ['See Projects', 'panel', 'projects'],
    contact:  ['Open Contact', 'panel', 'contact'],
    call:     ['Call ' + PHONE_DISPLAY, 'tel'],
    email:    ['Email us', 'mail', 'Enquiry - WBME website'],
    quote:    ['Request a quote', 'mail', 'Quote request - WBME'],
    map:      ['Get directions', 'map']
  };
```

Replace it with:

```javascript
  var ACT = {
    about:    ['Open About', 'link', 'about.html'],
    why:      ['Why WBME', 'link', 'about.html#why-wbme'],
    services: ['Open Services', 'link', 'services.html'],
    projects: ['See Projects', 'link', 'projects.html'],
    contact:  ['Open Contact', 'link', 'contact.html'],
    call:     ['Call ' + PHONE_DISPLAY, 'tel'],
    email:    ['Email us', 'mail', 'Enquiry - WBME website'],
    quote:    ['Request a quote', 'mail', 'Quote request - WBME'],
    map:      ['Get directions', 'map']
  };
```

Find this exact block:

```javascript
  /* ===== actions (guide + open pages) ===== */
  function goPanel (key) {
    close();
    if (window.WBME_OPEN_PANEL) {
      var card = window.WBME_FIRST_CARD ? window.WBME_FIRST_CARD(key) : null;
      window.WBME_OPEN_PANEL(key, card);
    }
  }
  function doAction (go, arg) {
    if (go === 'panel') { goPanel(arg); return; }
    if (go === 'tel') { window.location.href = PHONE_TEL; return; }
    if (go === 'mail') { window.location.href = window.WBME_MAIL ? window.WBME_MAIL(arg || '') : '#'; return; }
    if (go === 'map') { window.open(MAPS_URL, '_blank', 'noopener'); }
  }
```

Replace it with:

```javascript
  /* ===== actions (guide + open pages) ===== */
  function goLink (url) {
    close();
    window.location.href = url;
  }
  function doAction (go, arg) {
    if (go === 'link') { goLink(arg); return; }
    if (go === 'tel') { window.location.href = PHONE_TEL; return; }
    if (go === 'mail') { window.location.href = window.WBME_MAIL ? window.WBME_MAIL(arg || '') : '#'; return; }
    if (go === 'map') { window.open(MAPS_URL, '_blank', 'noopener'); }
  }
```

- [ ] **Step 9: Add the `id="why-wbme"` anchor to About's "Why WBME" section so the chatbot's `about.html#why-wbme` link scrolls to it**

In `about.html` (created in Task 1), find this exact line:

```html
  <div class="panel-intro p-rv"><span class="eyebrow">What sets us apart</span><h3>Why WBME</h3><p>Guided by the motto "No job too big, and no job too small," WBME approaches each project with skilled workmanship, safety-first planning and care for long-term customer relationships.</p></div>
```

Replace it with:

```html
  <div class="panel-intro p-rv" id="why-wbme"><span class="eyebrow">What sets us apart</span><h3>Why WBME</h3><p>Guided by the motto "No job too big, and no job too small," WBME approaches each project with skilled workmanship, safety-first planning and care for long-term customer relationships.</p></div>
```

- [ ] **Step 10: Verify the rebuilt Home page**

Run: `python -m http.server 8000`, open `http://localhost:8000/index.html`.

Check each of these:
1. No console errors.
2. Full-viewport hero with a static headline ("Marine & Metal Engineering"), "Explore WBME" and "Call WBME" buttons — no looping card rail.
3. Scrolling down reveals the three teaser sections (About/Services/Projects) alternating media side, each fading in on scroll with a parallax-drifting background image, then the contact CTA band.
4. Clicking "Explore WBME", "See all services", "View projects", "Contact WBME" navigate to the correct real pages.
5. Header/footer/drawer/chatbot behave identically to the other 4 pages; "Home" is the active nav link.
6. Open the chatbot, ask "what services do you offer", click the "Open Services" action button — confirm it navigates to `services.html` (not a panel).
7. Confirm no JS errors reference `rail`, `panelEl`, `openPanel`, or `firstCard` anywhere in the console across all 5 pages.

- [ ] **Step 11: Full 5-page regression pass**

Visit each of `index.html`, `about.html`, `services.html`, `projects.html`, `contact.html` and confirm: header nav shows the correct active page, footer links all work, chatbot opens/closes and its action buttons navigate correctly, mobile drawer (resize to 375px) opens/closes and its links work, and there are zero console errors on any page.

- [ ] **Step 12: Commit**

```bash
git add index.html js/experience.js js/chatbot.js about.html
git commit -m "$(cat <<'EOF'
Rebuild Home as a scrolling page and retire the rail/panel system

Home keeps the full-viewport cinematic hero as a static opening beat,
then scrolls through teaser sections linking to the real About/
Services/Projects/Contact pages. Removes the looping rail, drag
physics, and click-to-open-panel machinery from experience.js now
that nothing references it; updates the chatbot's navigation actions
to real page links instead of panel keys.
EOF
)"
```

---

### Task 8: Cleanup — delete dead files, remove dead CSS, update docs, final QA

**Files:**
- Delete: `css/styles.css`, `js/main.js`
- Modify: `css/experience.css` (remove dead `.panel`/`.rail`/`.card`/`.morph` rules)
- Modify: `js/bucket-assets.js` (remove the now-pointless `.panel` guard)
- Modify: `README.md`
- Test: grep-based dead-code check + full manual regression pass

- [ ] **Step 1: Delete the dead multi-page files**

```bash
git rm css/styles.css js/main.js
```

These were the pre-cinematic-redesign page styles/behavior, already unlinked from any HTML page as of Task 7 (every page now loads `css/experience.css` + `js/experience.js`).

- [ ] **Step 2: Confirm nothing references the deleted files**

Run: `grep -rn "styles.css\|main.js" --include="*.html" .`
Expected: no output (empty). If anything matches, fix that reference before proceeding.

- [ ] **Step 3: Simplify `js/bucket-assets.js`'s now-pointless `.panel` guard**

Find this exact block:

```javascript
    root.querySelectorAll('[data-bucket-bg]').forEach(function (el) {
      var panel = el.closest && el.closest('.panel');
      if (root === document && panel && !panel.classList.contains('open')) return;
      setBackground(el, bucketAsset(el.getAttribute('data-bucket-bg'), {
        width: window.matchMedia('(max-width:860px)').matches ? 900 : 1400,
        quality: 70,
        resize: 'contain'
      }));
    });

    root.querySelectorAll('[data-bucket-src]').forEach(function (el) {
      var panel = el.closest && el.closest('.panel');
      if (root === document && panel && !panel.classList.contains('open')) return;
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
      el.setAttribute('src', bucketAsset(el.getAttribute('data-bucket-src'), {
        width: 640,
        quality: 68,
        resize: 'contain'
      }));
    });
```

Replace it with (no pages have `.panel` elements anymore, so the guard is dead — remove it):

```javascript
    root.querySelectorAll('[data-bucket-bg]').forEach(function (el) {
      setBackground(el, bucketAsset(el.getAttribute('data-bucket-bg'), {
        width: window.matchMedia('(max-width:860px)').matches ? 900 : 1400,
        quality: 70,
        resize: 'contain'
      }));
    });

    root.querySelectorAll('[data-bucket-src]').forEach(function (el) {
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
      el.setAttribute('src', bucketAsset(el.getAttribute('data-bucket-src'), {
        width: 640,
        quality: 68,
        resize: 'contain'
      }));
    });
```

- [ ] **Step 4: Remove the drawer's dead `data-key` click handler in `js/experience.js`**

Since Task 7 rewrote `index.html`'s drawer to use plain `href` links (matching every other page since Task 1), no page's drawer has had `a[data-key]` elements since Task 7 shipped. This `forEach` has been a permanent no-op (its callback is never invoked on an empty NodeList) since then, but it still references the now-deleted `openPanel`/`firstCard` in its body — harmless only because it never runs. Remove it so the file doesn't carry dead references to deleted functions.

Find this exact block:

```javascript
  drawer.querySelectorAll('a[data-key]').forEach(function (a) {
    a.setAttribute('tabindex', '0'); a.setAttribute('role', 'button');
    a.addEventListener('click', function () { closeDrawer(); var k = a.dataset.key; setTimeout(function () { openPanel(k, firstCard(k)); }, 280); });
    a.addEventListener('keydown', keyActivate);
  });
```

Replace it with nothing (delete the block entirely).

Then run: `grep -n "data-key" js/experience.js *.html`
Expected: no output (empty) — confirms no page markup and no remaining JS reference `data-key`.

- [ ] **Step 5: Find and remove dead rail/card/morph/panel CSS in `css/experience.css`**

Since `index.html` no longer has any `.rail`, `.rail-wrap`, `.card`, `.morph`, `.panel`, `.panel-backdrop`, `.panel-scroll`, `.panel-close`, `.embers`, or `.vignette` elements (confirmed in Task 7), and no other page ever had them, every CSS rule targeting those selectors is now dead.

Run: `grep -n "\.rail\|\.card\b\|\.morph\|\.panel\b\|\.panel-backdrop\|\.panel-scroll\|\.panel-close\|\.embers\|\.vignette" css/experience.css`

For each matched rule, confirm it is not one of the rules this plan deliberately kept for reuse (`.panel-hero`, `.panel-body`, `.panel-cta`, `.panel .explore`/`.panel-body .explore`, `.panel .hero-call`/`.panel-body .hero-call` — these must stay, since About/Services/Projects/Contact still use the `.panel-hero`/`.panel-body`/`.panel-cta` class names). Delete every other matched rule (the ones keyed on bare `.rail`, `.rail-wrap`, `.card`, `.morph`, `.panel` as a standalone class, `.panel.open`, `.panel-backdrop`, `.panel-scroll`, `.panel-close`, `.embers`, `.vignette`).

Also remove the two now-fully-dead `.hdr`/`.brand`-prefixed "LOGO ONLY" rule blocks (superseded by `.site-hdr` added in Task 1) — find and delete the block starting with the comment `LOGO ONLY - no header bar` through its associated `@media(max-width:860px)` and `@media(max-width:380px)` `.hdr`/`.burger` overrides, since `index.html` (Task 7) no longer has an element with class `hdr` (it uses `site-hdr` now) — confirm with `grep -n "class=\"hdr\"\|class='hdr'" *.html` returning no matches before deleting.

- [ ] **Step 6: Verify no dead selectors remain and nothing broke**

Run: `grep -c "\.rail\|\.morph\|\.panel-backdrop\|\.panel-scroll\|\.embers\|\.vignette" css/experience.css`
Expected: `0`.

Run: `node -e "['index.html','about.html','services.html','projects.html','contact.html'].forEach(f => { const h = require('fs').readFileSync(f,'utf8'); const need = ['site-hdr','site-footer','chatbot-fab','scrollProgress']; const missing = need.filter(n => !h.includes(n)); if (missing.length) { console.log(f, 'MISSING', missing); process.exitCode = 1; } else { console.log(f, 'OK'); } })"`
Expected: `OK` printed for all 5 files, exit code 0.

Then do a full manual pass in the browser (`python -m http.server 8000`) across all 5 pages one more time: no console errors, header/footer/drawer/chatbot/nav-active-state/scroll-reveal/parallax/progress-bar all still behave as verified in each earlier task.

- [ ] **Step 7: Update `README.md`**

Find this exact block:

```markdown
## The experience
A full-bleed cinematic hero with a **looping rail of four cards** — **About · Services · Projects · Contact**. The background cross-fades to the focused card. Click a card and it **morphs and expands** into a closeable full-screen panel holding that section's content; close to shrink it back.

- Same look on desktop and mobile (reflowed for portrait; swipeable card rail, hamburger nav).
- Deep-linkable panels (`/#services`), back-button friendly, `prefers-reduced-motion` aware.
- Blue + brass/gold, dark cinematic, ANTON display titles.

## Structure
```
├── index.html              # the cinematic experience (stage + 4 content panels)
├── css/experience.css      # design system + morph + panels + mobile reflow
├── js/experience.js        # loop, card-morph (FLIP), deep-links, lightbox, form
├── images/                 # logo, photography, service icons
└── docs/superpowers/specs/ # design specs
```
> The earlier clean multi-page version (`about.html`, `services.html`, … , `css/styles.css`, `js/main.js`) remains in the repo and git history.
```

Replace it with:

```markdown
## The experience
Five real, normally-scrollable pages — **Home · About · Services · Projects · Contact** — sharing one header/nav/footer/chatbot and one scroll-effects system: reveal-on-scroll, parallax drift, a header that solidifies on scroll, a scroll progress bar, and magnetic buttons.

- Same look on desktop and mobile (nav collapses to a hamburger drawer under 960px).
- `prefers-reduced-motion` aware — every effect (reveal, parallax, magnetic pull) disables cleanly.
- Blue + brass/gold, dark cinematic, ANTON display titles.

## Structure
```
├── index.html, about.html, services.html, projects.html, contact.html
├── css/experience.css      # shared design system + scroll-effects engine
├── js/experience.js        # header/nav state, reveals, parallax, progress, lightbox, form
├── js/glass-fx.js          # cursor spotlight + magnetic buttons
├── js/chatbot.js           # on-site assistant
├── js/bucket-assets.js     # Supabase Storage image hydration
├── images/                 # logo, photography, service icons
└── docs/superpowers/specs/ # design specs
```
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Clean up dead rail/panel/morph code and update README

Deletes the pre-cinematic multi-page files (css/styles.css,
js/main.js) and every CSS rule that targeted the now-removed
rail/card/morph/panel markup, now that all 5 pages run on the
shared scroll-effects engine.
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** every section of the design spec maps to a task — site structure (Tasks 1-4, 7), shared chrome (Task 1 CSS + repeated in every page task), scroll reveals + parallax (Task 1), cursor spotlight + magnetic buttons (Task 5, spotlight already existed), scroll-spy + progress (Task 1 — "scroll-spy" realized as active-page nav marking, appropriate for a multi-page site rather than in-page anchor spying), cinematic image reveals (the page-hero entrance animation reuse in Task 1, plus `.p-rv` treatment on all imagery), preloader session-flag (Task 6), dead-file retirement (Task 8).
- **Type/name consistency check:** `initScrollReveal`, `initParallax`, `initHeaderScrollState`, `markActiveNav`, `initScrollProgress`, `initScrollCounters` are defined once in Task 1 and never renamed in later tasks. `.site-hdr`/`.site-nav`/`.site-footer`/`.scroll-progress`/`.page-hero`/`.home-section`/`.hs-media`/`.hs-copy`/`.home-cta` class names are introduced in Task 1/7 and used identically everywhere they appear. `goLink`/`ACT`'s `'link'` type are consistent between the two edits in Task 7 Step 5.
- **Ordering dependency:** Tasks 1-6 must run before Task 7 (they build the new pages and engine while the old Home/rail/panel system in `index.html` still works, untouched, as a safety net). Task 7 is the only task that deletes old JS behavior. Task 8 must run last (it deletes files/CSS that earlier tasks may still reference).
