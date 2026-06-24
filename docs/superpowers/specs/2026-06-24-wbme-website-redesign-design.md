# WBME Website Redesign — Design Spec

**Date:** 2026-06-24
**Client:** Walvis Bay Marine Engineering (WBME) — wbme.com.na
**Goal:** Full redesign. Modern, clean, professional, easy to navigate. Approved visual direction = the "Washington" construction-template style, adapted for WBME.

## Business summary
Marine & metal engineering firm in Walvis Bay, Namibia. Established 1999 by the late Mr. Uwe Crüys, registered 2000. Ship repair, fabrication and precision machining for the marine & mining industries. Motto: **"No job too big, no job too small."** Faith-based (Philippians 4:13; Sabbath-keeping).

**Contact:** 8th Street East, Industrial Area, Walvis Bay, Namibia · (064) 285 700 · info@wbme.com.na · Mon–Fri 07:00–17:00.

## Approved visual language
- **Layout:** Clean, lots of white space, large rounded cards (radius ~20–30px), soft shadows, real photography.
- **Signature hero:** Dark rounded hero card with the nav bar *inside* it (glassy pill); white headline; avatar trust-stack + "see our work" play button; at the base, an overlapping worker-photo card + a dark "passionate about…" card with green stat figures.
- **Palette:** Dark charcoal-green `#222826` (hero/dark sections, footer); white / `#eef0ec` backgrounds; **lime-green accent `#a8d24a`** (buttons, stats, icon tiles, highlights); ink text `#1f2622`, muted `#6f7872`.
- **Type:** Plus Jakarta Sans (headings/UI) + Inter (body).
- **Motion:** Tasteful only — fade/slide reveals on scroll, hover lifts on cards, count-up stats, slow hero ken-burns. No gimmicks.
- **Logo:** Lime rounded-square mark + "WBME / Marine Eng." lockup (matches template). Real WBME logo can be swapped in later.

## Reused assets (from current site, downloaded)
Logo, hero/dock photos (bg1, bg2), 6 service icons, 6 project photos (1–6.jpg), founder photo (uwe_cruys). Stored in `images/`.

## Tech approach
**Static multi-page HTML + shared CSS/JS.** No build step — deploys to any host (matches their existing static hosting), trivial handoff. A shared `styles.css` + `main.js`; each page is its own HTML file.

> Note: earlier "modern framework" was floated, but for a 5-page marketing site on standard hosting, static HTML is simpler to deploy/hand off and renders identically. Can migrate to Astro later if componentization is wanted.

## Pages
1. **Home** — hero card, services preview (6 cards), about + stats, projects grid, Why-WBME dark panel, CTA, footer. (= approved mockup)
2. **About** — story (founder, est. 1999), values + faith note (respectful), mission points, founder photo, stats, CTA.
3. **Services** — 6 detailed service sections (rigging, fitting & turning, boiler making, fabrication, pipe works, welding) with the specifics from their copy; CTA.
4. **Projects** — filterable/larger gallery of project photos with captions + lightbox; CTA.
5. **Contact** — address, phone, email, hours; contact form (client-side validation, mailto or swappable endpoint); embedded map of 8th Street East.

## Shared components
Header (in-hero on Home; solid sticky on inner pages), footer, CTA card, service card, section headers, buttons. Consistent across pages via shared CSS.

## Accessibility & SEO
Semantic HTML, alt text, keyboard-navigable, AA contrast, per-page `<title>`/meta description, favicon, Open Graph tags.

## Out of scope (for now)
Backend/CMS, blog, multi-language, real form-mail backend (placeholder endpoint provided).
