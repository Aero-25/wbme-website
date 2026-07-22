# Site Visual Upgrade · Design Spec

**Date:** 2026-07-22
**Scope:** Four independent changes bundled into one pass:
1. `about.html` content restructure.
2. The shared preloader (all 5 pages, since it's shared chrome) + the chatbot FAB propeller motion.
3. The shared contact modal + standalone `contact.html` page.
4. `index.html` (Home) content expansion + visual craft pass.

**One line:** Fix About's content rhythm and duplicate icon grid, replace the "instrument cluster boot" preloader with the simpler loader DESIGN.md already prescribes, give the two contact surfaces real photography and a job-ticket form treatment, and deepen Home from a thin teaser into a proper flagship page.

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

## Related fix — chatbot FAB propeller

The persistent bottom-left chatbot button (`.chatbot-ring img`) already has an infinite spin animation in CSS, but at 4s per rotation on a 48px icon it reads as static rather than "constantly spinning" (confirmed via screenshot — user report: "Chatbot propeller needs to spin constantly"). Give it the same fast, unmistakable rotation speed as the rebuilt preloader propeller so the "ambient machinery motion" DESIGN.md calls for is actually perceptible, not just technically present. `prefers-reduced-motion` continues to disable it entirely, unchanged.

## Out of scope

Services and Projects pages' content (Part 1 is About-only), any new photography sourcing beyond the one bucket path in Part 1, copy rewrites beyond the one merge sentence in Part 1, and any change to shared components other than the preloader and the chatbot FAB propeller speed — the contact modal is addressed separately in Part 3, header/footer are untouched by this spec entirely.

---

# Part 3 — Contact Surfaces Redesign ("Split-Panel Work Order")

**Scope:** the shared `.contact-modal` popup (opened from all 5 pages) and the standalone `contact.html` page.

## Why

Both contact surfaces currently use a plain two-column grid (an info-rows list beside a bordered form card), generic dark inset inputs, and a full-width pill submit button. Two concrete problems:

1. **No photography.** Contact is the only surface on the site with zero real worksite imagery — everywhere else (hero, capability triptych, About, Projects) leans on photography for credibility per DESIGN.md's "Show the work" principle.
2. **Duplicate implementations.** The modal (`#contactModalForm`, field IDs `mm-name`/`mm-email`/…) and the standalone page (`#contactForm`, field IDs `cname`/`cemail`/…) are near-identical markup styled from the same generic CSS, maintained twice.

Separately, the standalone page's embedded Google Map is reskinned with a CSS color-filter hack (`grayscale(.3) invert(.92) hue-rotate(180deg) contrast(.9)`) that reads muddy rather than intentional, and the submit button's class (`.btn-lime`) is a misleading holdover name from an earlier iteration — it's already brass-colored, not lime.

## New design

- **Shared split-pane layout**, reusing the pane pattern already proven on Home's hero: one pane holds compact contact info + the form, styled as a "job ticket" (small JetBrains Mono field numbers/labels, brass underline focus treatment replacing the plain bordered boxes); the other pane holds real worksite photography with the coordinate tag / workshop-online status pulse already used elsewhere on the site.
  - **Modal:** the split sits inside `.cm-panel`; the photo pane is a secondary column sized to the popup, not full-bleed.
  - **Standalone page:** the same split, full page-width, larger canvas so the photo pane is more prominent.
- **New photography:** an unused bucket path — `wbme photos for web 2026/Pics for T/Machining/new thordon bushes.jpg` — via the existing `data-bucket-bg` hydration path.
- **Map reframe** (standalone page only): wrap the existing Google Maps iframe in a labeled instrument-panel frame (eyebrow + coordinate tag + corner-marks) instead of relying solely on the CSS filter hack. The iframe itself stays — this is a framing change, not a map replacement.
- **Consolidate the two form implementations** into one shared field/class structure — unique IDs stay (required for label association on a page that could theoretically show both at once), but the CSS/markup pattern becomes one shared component instead of two parallel one-off blocks.
- **Rename** `.btn-lime` → `.btn-brass` (cosmetic clarity only — same gold color, no visual change).
- **Success state** (`.form-ok`) gets a matching visual polish pass; no new animation system introduced.

## What stays the same

- Popup mechanics (backdrop, Esc close, focus return) — unchanged.
- Mailto-based submission — no backend integration (still out of scope, per the original multi-page spec).
- Field validation logic (`.err`/`.invalid` pattern) — unchanged functionally.

## Out of scope

A hosted form-mail backend, any change to the chatbot panel, and any change to header/footer/nav. Since the site has no build step, the contact-modal markup is duplicated identically in all 5 HTML files — the same edit is applied to each copy, not a template change.

---

# Part 4 — Home Page Expansion

**Scope:** `index.html` only.

## Why

Home currently has four sections — hero, stat strip, capability triptych, dispatch CTA — and each one individually renders cleanly (verified by scrolling through it, not just a static capture: real photography, working hover-expand triptych, clean chamfered buttons). The problem isn't quality, it's depth: every section is a teaser pointing elsewhere, so Home itself proves very little. User feedback: "I need a proper Homepage... go above and beyond."

## New content

1. **"Six disciplines at a glance" strip.** A compact row naming the six service disciplines (Rigging, Fitting & Turning, Boiler Making, Fabrication, Pipe Works, Welding) — names only, no descriptions (those stay on Services, avoiding duplication) — linking to Services. Placed after the capability triptych.
2. **Richer Projects proof.** Within the capability triptych's existing Projects panel, swap the single background photo for a small multi-photo strip (3-4 real job photos) so the panel proves range at a glance instead of showing one image.
3. **Industries trust strip.** A single-line tag row reusing the six industry names already established on About (Fishing & Seafood, Shipping & Cargo, Mining & Minerals, Offshore & Energy, Ports & Harbour, General Industry) — condensed to plain tags, not the full descriptive grid — so a procurement buyer can self-identify immediately without leaving Home.
4. **Visual craft pass** on the four existing sections (hero photo panel, stat strip, triptych, dispatch CTA) — refinement only, no structural rework, to push production value further per "go above and beyond."

## What stays the same

- The capability triptych's hover-expand mechanic — DESIGN.md's signature component, unchanged.
- Home's role as a teaser hub, not a full duplicate of Services/About/Projects — preserves the rationale in the 2026-07-18 multi-page spec (this is additive breadth, not a reversion to one giant single page).
- Stat strip data and dispatch CTA copy — unchanged content, presentation refinement only.

## Out of scope

New photography sourcing beyond what's already available via the existing bucket paths referenced across this spec, a hero copy rewrite, and any change to the multi-page site architecture itself.
