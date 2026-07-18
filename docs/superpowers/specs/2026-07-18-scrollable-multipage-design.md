# WBME — Scrollable Multi-Page Redesign · Design Spec

**Date:** 2026-07-18
**Replaces:** the full-viewport rail-loop + morph-panel experience (`2026-06-25-wbme-cinematic-experience-design.md`), and fully supersedes the old dead multi-page files (`about.html`, `services.html`, `projects.html`, `contact.html`, `css/styles.css`, `js/main.js`).
**One line:** A real, normally-scrollable multi-page site — Home, About, Services, Projects, Contact — that keeps WBME's cinematic worksite photography and brand voice, adds tasteful scroll-driven effects, and drops the click-to-open-panel mechanic entirely.

## Why
The rail-loop/morph-panel model (no page scroll, click a card to expand a full-screen panel) was a striking demo but isn't a "normal" website: nothing is scrollable, nothing is a real page, and the signature interaction competes with straightforward findability. This redesign keeps the cinematic photography-led feel but expresses it as real pages you scroll through, with effects that earn their place per DESIGN.md ("cinematic, never gimmicky").

## Site structure
Five static pages, no build step, same deploy path (Cloudflare Pages, static files):

1. **Home** (`index.html`) — full-viewport cinematic hero (crossfading worksite photography, big ANTON headline, brass CTA + call button) stays as the opening beat, but the rail/morph mechanic is removed. Below the hero, normal scroll sections: story teaser (→ About), six-discipline services grid teaser (→ Services), featured-project strip (→ Projects), contact CTA banner (→ Contact). Each section scroll-reveals in.
2. **About** (`about.html`) — page-hero banner, founder story (est. 1999, Mr. Uwe Crüys, Philippians 4:13), stat line, "the standard we hold," industries served, video. Also absorbs the current **Why WBME** content (quality/team/trust/partnership/safety/responsiveness cards) as a section — today it's only reachable via the mobile drawer as an orphaned 5th panel; it reads better folded into About than as a stray nav item.
3. **Services** (`services.html`) — page-hero + the six service cards (rigging, fitting & turning, boiler making, fabrication, pipe works, welding).
4. **Projects** (`projects.html`) — page-hero + featured work + full photo gallery + lightbox.
5. **Contact** (`contact.html`) — page-hero + contact info, quote form (mailto), embedded map.

Content for each page is carried over near-verbatim from the corresponding panel currently in `index.html` — this is a structural/interaction change, not a copy rewrite.

## Shared chrome (identical across all 5 pages)
- **Header:** fixed nav — logo, Home/About/Services/Projects/Contact links (active-page highlighted), phone link, brass "Request a quote" pill. Transparent over the hero, gains a solid/blurred background once the page scrolls past the hero (scroll-state header, a common "premium" pattern not yet used here).
- **Mobile:** hamburger → full-screen drawer, same as today.
- **Footer:** contact strip + copyright, once per page.
- **Chatbot FAB + panel:** unchanged behavior, included on every page.
- **Lightbox:** shared component, used on Projects (and anywhere else a gallery appears).
- **Preloader:** the existing animated gauge plays in full only on a visitor's first load in the session (session-flagged); subsequent in-site navigations get a fast, subtle fade instead of replaying the whole gauge — repeating a multi-second loader on every click reads as slow, not premium.

## Effects system (vanilla JS/CSS — no new dependencies)
- **Scroll reveals:** the existing `.p-rv` fade+rise pattern (currently fired once via a `.panel.open` class) is switched to an `IntersectionObserver` so it fires as each element scrolls into view, on every page.
- **Parallax drift:** hero and section background photography drifts at a slower rate than page scroll (transform-based, not scroll-jacking).
- **Cursor spotlight + magnetic buttons:** extend the existing `glass-fx.js` (already drives a per-card cursor spotlight) to add a subtle magnetic pull toward the cursor on primary buttons/cards, pointer-devices only.
- **Scroll-spy + progress:** header nav reflects the current page; a slim top progress bar (repurposing the existing `.modal-progress` bar) tracks scroll depth of the current page.
- **Cinematic image reveals:** hero/section photography clips/scales into view on scroll entry rather than a plain fade.
- **Reduced motion:** every effect above fully disables under `prefers-reduced-motion` (drift, parallax, translate-on-reveal, image clip animation) — content remains immediately visible and readable, matching the existing codebase pattern.

## Tech
- Static HTML/CSS/JS, no build step, no new external dependencies (per user decision — buttery inertia-scroll libraries were considered and declined in favor of keeping the project dependency-free).
- `css/experience.css` becomes the single shared stylesheet across all 5 pages (extended with page-hero / normal-flow section styles, replacing the old `css/styles.css` which is deleted as dead weight).
- `js/experience.js` is substantially rewritten: rail-loop, card-morph (FLIP/View Transitions), and deep-link-to-panel logic are removed; replaced with header scroll-state, mobile drawer, IntersectionObserver reveals, parallax, scroll progress, animated counters-on-view, lightbox, and the contact form handler. `js/main.js` is deleted as dead weight (superseded by this).
- `js/bucket-assets.js` (Supabase image loading) and `js/chatbot.js` are kept as-is and included on every page.

## Out of scope (now)
Real form-mail backend, CMS/blog, multi-language, custom domain mapping — unchanged from the prior spec.
