# WBME — Cinematic Experience · Design Spec

**Date:** 2026-06-25
**Replaces:** the clean multi-page site (preserved in git history).
**One line:** An immersive single-page experience where four looping cinematic cards (About · Services · Projects · Contact) each morph open into a closeable full-screen panel.

## Inspiration
The "VOYAGE" travel layout — full-bleed cinematic hero, big display title on the left, a looping rail of vertical destination cards on the right. Adapted for a marine-engineering firm using WBME's real steel/sea imagery.

## Experience model
- The cinematic hero **is** the site (single page).
- A looping rail of **4 cards**: About Us, Services, Projects, Contact.
- Background cross-fades to the focused card; big ANTON title + eyebrow + Explore swap in.
- Click a card / Explore → the card **morphs and expands to fill the screen** (shared-element transition) into a **closeable panel** holding that section's full content (popup feel).
- Close via ✕ button, **Esc**, backdrop click, or swipe-down (mobile) → panel **shrinks back into its card**.

## Layouts (one design, two reflows)
- **Desktop:** title left, looping card rail bottom-right, nav top-right, counter + brass progress line.
- **Mobile:** same elements reflowed for portrait — title top-left, horizontal swipeable card rail along the bottom, nav → hamburger. Same look & motion, not a separate design.
- Respect `prefers-reduced-motion` (disable autoplay + morph, fall back to instant). Autoplay loop **pauses on hover/touch**.

## The morph (signature interaction)
- Primary: **View Transitions API** for the card→panel shared-element morph where supported.
- Fallback: **FLIP** animation (measure card rect, animate clone to full-screen) for all other browsers.
- The card image becomes the panel hero; content fades up beneath; reverse on close.

## Panels (real content, dark cinematic theme, blue + brass/gold)
1. **About** — founder story (est. 1999, late Mr. Uwe Crüys; registered 2000), values, Philippians 4:13, motto, stat figures.
2. **Services** — six disciplines (rigging, fitting & turning, boiler making, fabrication, pipe works, welding) with icons + descriptions.
3. **Projects** — gallery of real project photos with a lightbox.
4. **Contact** — address, phone, fax, email, hours; quote form (client-side validation → mailto, swappable endpoint); embedded map (8th Street East, Walvis Bay).

## Findability & robustness
- Open panel updates URL hash (`/#services`) → deep-linkable, back-button friendly; on load, an incoming hash opens the matching panel.
- All panel content is in the DOM (SEO-readable), not injected late.
- Keyboard accessible (focus trap in open panel, Esc to close, focus returns to card).

## Visual system
- **Mood:** dark cinematic. **Palette:** deep navy/ink `#0c1726`, white, brass/gold `#c79a3e` / `#e3c372`. **Display:** Anton (titles); Inter (body); Archivo (labels/nav).
- Real WBME assets reused now (logo, bg1/bg2 dock + propeller, 1–6.jpg, founder, service icons); real logo/photos to be swapped in later.

## Tech
- **Static HTML/CSS/JS, no build step** → deploys to existing Cloudflare Pages, auto-deploys on push to `main`.
- New self-contained files: `index.html` (experience) + `css/experience.css` + `js/experience.js`. Old `*.html` / `styles.css` / `main.js` left in repo (unlinked) and in git history.
- Vanilla JS; View Transitions API + FLIP fallback. No framework. Optional light GSAP only if a specific motion needs it (avoid unless necessary).

## Out of scope (now)
Real form-mail backend, CMS/blog, multi-language, custom domain mapping (Cloudflare handles later).
