# Walvis Bay Marine Engineering (WBME) — Website

A cinematic, immersive single-page experience for WBME — a marine & metal engineering firm in Walvis Bay, Namibia (est. 1999).

**Demo build** — static HTML/CSS/JS, no build step.

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

## Run locally
Serve the folder (don't open via `file://` — the experience uses History/hash routing):
```bash
python -m http.server 8000   # then http://localhost:8000
```

## Notes
- Contact form opens the visitor's email client to `info@wbme.com.na` (swap for a hosted endpoint for in-page sending).
- Placeholder logo lockup + demo photography; real brand assets to be dropped in.

---
*Walvis Bay Marine Engineering — "No job too big, no job too small."*
