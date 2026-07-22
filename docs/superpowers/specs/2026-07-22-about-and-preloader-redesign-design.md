# About Page Rhythm + Preloader Overhaul · Design Spec

**Date:** 2026-07-22
**Scope:** Two independent changes bundled into one pass: (1) `about.html` content restructure, (2) the shared preloader (all 5 pages, since it's shared chrome).
**One line:** Fix About's content rhythm and duplicate icon grid, and replace the "instrument cluster boot" preloader with the simpler, faster loader DESIGN.md already prescribes.

---

# Part 1 — About Page Content Rhythm

**Scope:** `about.html` only (shared chrome, other pages untouched).

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

---

# Part 2 — Preloader Overhaul

**Scope:** The shared `.preloader` markup/CSS/JS, included identically on all 5 pages (`index.html`, `about.html`, `services.html`, `projects.html`, `contact.html`).

## Why

The current preloader (added 2026-07-21, commit `86ee8cf`) is a circular SVG "instrument cluster" gauge: a darkened full-bleed hero photo background, dashed tick ring, progress arc, a typewriter-effect coordinate readout, a percentage counter, and a three-line status checklist (Propulsion → Hull & structure → Workshop online) that lights up in sequence. User feedback: "it looks horrible," wants a "whole overhaul."

This also doesn't match WBME's own documented spec. DESIGN.md § Components → Loader states plainly:

> "Night Yard background, bucket logo, brass progress rail and a compact spinning propeller. Keep it fast and mechanical, never theatrical."

The current build has drifted well past that into exactly the "theatrical" territory the brand doc warns against — it's the more elaborate design, not the simpler documented one.

Separately: because the preloader currently waits on the full-res hero photo (a remote Supabase fetch) before it's allowed to finish, on a slow connection it can run close to its 2.6s cap, and the `.5s` opacity crossfade at the end briefly overlaps a fully-rendered page underneath a still-fading gauge — reading as a stuck/ghosted overlay rather than a clean handoff.

## New design

Rebuild to the documented ideal, dropping every element not in that spec:

- **Background:** flat Night Yard (`--ink-deep`) — no darkened hero photo. Removes the biggest asset dependency, so the loader isn't waiting on a large remote image fetch to finish.
- **Logo:** centered WBME bucket logo (the same brand mark used in the header), static.
- **Progress rail:** a slim horizontal brass rail beneath the logo, filling left-to-right, driven by the same real load-progress logic already in place (fonts + logo image ready), not a fixed-duration fake.
- **Propeller:** one compact propeller centered on (or just above) the progress rail, spinning continuously — faster and larger than the current 1.6s/small-icon treatment so the motion is unmistakable at a glance, not something you have to look closely to notice. This is the single signature motion element of the loader.
- **Corner marks:** kept. DESIGN.md's Instrument Panel Rule explicitly allows corner-registration marks on the preloader (and full-bleed heroes) as the recurring signature — this one detail from the current build stays.
- **Dropped entirely:** the dashed tick ring, the circular SVG arc gauge, the coordinate readout (`22°57'S · 14°30'E`), the typewriter tag animation, the percentage counter, and the three-stage status checklist. All of it reads as "instrument cluster," which is more theatrical than the brand's own "fast and mechanical" target.
- **Clean handoff:** shorten the fade so it reads as a quick, deliberate cut rather than a lingering translucent overlap — the loader should not still be visible, even faintly, once the page underneath is interactive.
- **Unchanged:** the session-based skip (`wbme_preloader_seen` → fast, minimal fade on repeat in-session navigations), and full `prefers-reduced-motion` compliance (propeller spin and any other motion disabled, content/logo still shown immediately).

## Out of scope

Services and Projects pages' content (Part 1 is About-only), any new photography sourcing beyond the one bucket path in Part 1, copy rewrites beyond the one merge sentence in Part 1, and any change to the shared CSS engine's other components (header, footer, contact modal, chatbot) outside the preloader itself.
