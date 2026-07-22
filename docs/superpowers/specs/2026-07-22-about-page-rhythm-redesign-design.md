# About Page — Content Rhythm Redesign · Design Spec

**Date:** 2026-07-22
**Scope:** `about.html` only (shared chrome, other pages untouched).
**One line:** Restructure About's flat content stack into the same tiered, photography-broken rhythm Home already has, and remove a duplicate icon-card grid that violates DESIGN.md's own anti-patterns.

## Why

About currently stacks eight sections top to bottom with no visual rhythm: lead statement, story + founder photo, a stat row (`.statline`), "the standard we hold" list, an industries grid (`.ind-grid`), a video, and then a *second* six-card icon grid ("Why WBME") that duplicates the standard-we-hold list almost point for point. Two concrete problems fall out of this:

1. **Redundant grid.** DESIGN.md's Don'ts explicitly call out "repeated icon-card grids" as a SaaS anti-pattern. About has two (`.ind-grid` and `.svc-grid`) where the second (`.svc-grid`, "Why WBME") repeats content already covered by "the standard we hold."
2. **Wrong type token.** `.statline` renders its numbers in Anton. DESIGN.md's type hierarchy reserves Anton ("Display") for hero and panel titles only, and specifies the JetBrains Mono "Data" font for stats/readouts. Home's `.stat-strip` already does this correctly — About should reuse that exact component instead of a bespoke, incorrectly-styled one.

Home was recently rebuilt with a clean tiered flow (hero → stat strip → capability triptych → dispatch CTA). About never received the same treatment and now reads as an older, denser leftover page next to it.

## Content changes

**1. Stat block swap.** Replace the `.statline` markup (4 stat items: 25+ years, 6 disciplines, 1999, 100%) with the shared `.stat-strip` / `.stat-strip-inner` / `.ss-item` markup already used on `index.html`, placed as its own full-bleed section directly after the founder story block (matches Home's position of the stat strip right after the hero). Same four stats, same data — only the markup/class changes, to inherit Home's JetBrains Mono numerals and full-bleed panel treatment instead of the in-column Anton-numeral row.

**2. Remove the duplicate grid.** Delete the `panel-intro` "Why WBME" heading and the `.svc-grid` six-card block entirely (Quality & value, Skilled professionals, Reputation for excellence, Partnership building, Safety-first culture, Ready & responsive). Three of its points aren't covered elsewhere (partnership over one-off tickets, safety-first planning, fast response under pressure) — these get folded into one additional sentence appended to the existing founder-story prose in `lead-row`, so the content survives without a second grid. The other three points (quality, team, reputation/25-years) are already covered by "the standard we hold" list and the stat strip, so they're simply dropped as redundant.

**3. New photography break.** Insert one full-bleed image section between the industries grid (`.ind-grid`) and the founder video, using the existing hero/dispatch visual treatment (parallax background, corner-marks, no new CSS component). Image: `wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 1.jpg` via the existing `data-bucket-bg` hydration path — real workshop photography not already used as a page hero elsewhere, giving the page a mid-scroll visual anchor instead of six consecutive text/grid sections.

**4. Final page order:** hero → lead statement → story + founder photo → stat strip → "the standard we hold" list → industries grid (`.ind-grid`, unchanged — it's concrete content, not decoration) → photography break (new) → founder video → CTA.

## What stays the same

- All existing copy for the story, standard-we-hold list, industries grid, video, and CTA — no rewrites, only the additions/removals above.
- The existing `.p-rv` IntersectionObserver reveal system and parallax classes — the new photo section reuses these, no new JS or motion system.
- `prefers-reduced-motion` behavior — inherited as-is from the shared engine.
- Shared header/nav/footer/chatbot/contact-modal — untouched.

## Out of scope

Services and Projects pages, any new photography sourcing beyond the one bucket path above, copy rewrites beyond the one merge sentence, and any change to the shared CSS engine's other components.
