---
name: Walvis Bay Marine Engineering
description: Rugged marine and metal engineering, shown through cinematic worksite proof.
colors:
  ink: "#0f2c52"
  ink-deep: "#071a33"
  panel-navy: "#163a66"
  black: "#000000"
  white: "#ffffff"
  white-steel: "#f4f7fb"
  text-bright: "#e9eef5"
  text-soft: "#dfe5ee"
  text-body: "#dbe2ec"
  text-panel: "#c9d4e3"
  text-tag: "#cdd6e2"
  text-rail: "#cbd3de"
  muted-steel: "#9fb0c6"
  muted-harbour: "#aab6c6"
  muted-deep: "#8a98ad"
  placeholder-steel: "#7e8b9c"
  brass: "#c79a3e"
  brass-deep: "#b1862c"
  brass-light: "#e3c372"
  error: "#e07a7a"
  error-text: "#e98c8c"
typography:
  display:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "clamp(3.6rem, 10.5vw, 10.5rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0"
  title:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: ".74rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: ".22em"
rounded:
  hairline: "2px"
  focus: "6px"
  focus-soft: "8px"
  sm: "11px"
  note: "12px"
  info: "13px"
  md: "14px"
  icon: "15px"
  card: "16px"
  lg: "18px"
  mobile-panel: "20px"
  panel: "26px"
  nav-pill: "30px"
  control: "40px"
  circle: "50%"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "24px"
  lg: "48px"
  xl: "70px"
components:
  button-primary:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 30px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "15px 30px"
  panel-card:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.panel}"
---

# Design System: Walvis Bay Marine Engineering

## 1. Overview

**Creative North Star: "The Working Yard at Dusk"**

WBME should feel like a real Walvis Bay workshop photographed with care: steel, salt air, blue marine surfaces, brass light, and plain-spoken confidence. The interface is cinematic because the work is serious, not because it wants to perform.

The system is built for procurement and technical buyers who may be stressed, mobile, and short on time. First impressions must answer: is this company capable, reachable, and trustworthy with time-critical work?

**Key Characteristics:**
- Full-bleed worksite imagery carries credibility.
- Dark marine navy gives the site weight and contrast.
- Brass is a proof accent, used sparingly for action, focus and active state.
- Copy stays direct, specific and practical.
- Motion is purposeful, fast and optional under reduced-motion settings.

## 2. Colors

The palette is WBME blue and brass: blue carries the interface structure, brass marks action, active state and proof.

### Primary
- **Brass Worklight** (`brass`): Used for primary action, progress, focus accents and proof details. It should feel like reflected workshop light, not decorative gold.
- **Light Brass Edge** (`brass-light`): Used for active labels, highlights and high-visibility focus treatment.

### Neutral
- **Harbour Ink** (`ink`): Main dark foundation for the stage and deep interface surfaces.
- **Night Yard** (`ink-deep`): Preloader and deepest atmospheric areas.
- **Lifted Panel Navy** (`panel-navy`): Modal panel body color, lighter than the stage so long content stays readable.
- **White Steel** (`white`): Headings, primary text and high-contrast controls.
- **Muted Steel Blue** (`muted-steel`): Supporting text, captions and secondary metadata.

### Named Rules

**The Brass Is Earned Rule.** Brass appears on actions, active states, focus and proof marks. Do not wash whole sections in gold.

**The Real Yard Rule.** Photography must remain visible enough to prove the work. Avoid scrims so heavy that images become generic dark texture.

**The Bucket Proof Rule.** Worksite photography should come from the public Supabase `WBME` bucket when possible, using real job folders for propulsion, machining, pipe works, fabrication, boiler making, rudder and coupling proof. The primary logo artwork and propeller favicon also come from the public bucket. Local imagery remains for service icons and founder portrait.

**The Propeller Contact Rule.** The bucket propeller icon is the floating contact affordance and loader motion motif. It may spin continuously as ambient machinery motion, but must stop under `prefers-reduced-motion`.

## 3. Typography

**Display Font:** Anton, with Impact fallback.
**Body Font:** Barlow, with Arial fallback.
**Label Font:** Archivo, with Arial fallback.

**Character:** The type system is heavy, industrial and direct. Anton handles the cinematic title voice; Archivo handles mechanical labels; Barlow carries readable long-form content with a slightly engineered feel.

### Hierarchy
- **Display** (400, `clamp(3.6rem, 10.5vw, 10.5rem)`, 0.9): Hero and panel titles only.
- **Headline** (400, `clamp(1.8rem, 3.4vw, 2.8rem)`, 1): Panel section headings.
- **Title** (700, `1.05rem-1.2rem`, 1.2): Service cards, readiness cards and contact labels.
- **Body** (400, `1rem`, 1.7): Panel prose, service descriptions and form notes. Keep body copy under roughly 70ch.
- **Label** (600-700, `.72rem-.84rem`, tracked uppercase): Navigation, eyebrows, tags and compact metadata.

### Named Rules

**The Plain Workshop Rule.** Use direct nouns and verbs. Avoid brochure language, fake testimonials and inflated claims.

## 4. Elevation

Depth is created with tonal layering, image darkness, and large cinematic shadows. Surfaces are not glass cards; blur is used only for the backdrop and urgent mobile contact bar.

### Shadow Vocabulary
- **Rail Card Lift** (`0 14px 30px rgba(0,0,0,.4)`): Default card presence over the hero.
- **Focused Card Lift** (`0 30px 54px rgba(0,0,0,.55)`): Active card and hover emphasis.
- **Panel Lift** (`0 50px 120px rgba(0,0,0,.62)`): Full modal panel only.

### Named Rules

**The Heavy Object Rule.** Large shadows belong to large moving surfaces: cards, panels and lightbox media. Small controls stay crisp.

## 5. Components

### Buttons
- **Shape:** Fully pill-shaped controls (`999px`) for primary action and hero exploration.
- **Primary:** Brass background with ink text, strong weight and 44px+ touch height.
- **Hover / Focus:** Hover shifts toward light brass or white; focus uses a visible light brass outline.
- **Ghost:** Transparent fill with a white border, turning brass on hover.

### Chips
- **Style:** Small, bordered, dark translucent tags with muted steel text.
- **State:** Informational only. Do not make decorative chip grids that repeat without proof.

### Cards / Containers
- **Corner Style:** Moderate industrial rounding (`14px-18px`), not soft SaaS bubbles.
- **Background:** Navy translucent layers or lifted panel navy.
- **Shadow Strategy:** Rail cards and modals can cast heavy shadows; content cards should rely more on border and tonal contrast.
- **Internal Padding:** Service cards use generous padding around `26px-30px`.

### Inputs / Fields
- **Style:** Dark inset fields with a fine white border and `11px` radius.
- **Focus:** Border turns brass with a darker input fill.
- **Error / Disabled:** Errors use clear red text and border, with plain instructions.

### Navigation
- **Style:** Desktop navigation uses a fixed dark command bar with the bucket logo, section pills, urgent phone access and a brass quote action. Mobile keeps the same brand shell, collapsing to a clear menu button and full-screen drawer with direct contact details.

### Loader / Contact Affordance
- **Loader:** Night Yard background, bucket logo, brass progress rail and a compact spinning propeller. Keep it fast and mechanical, never theatrical.
- **Floating Contact:** Bottom-right propeller control opens the Contact panel. On mobile it sits above the urgent Call / Email / Map bar.

### Signature Component

The looping rail card is the signature WBME interaction. It must remain image-led, keyboard-operable, and paired with the shared-element modal transition. If motion is reduced, the content must still be immediately readable.

## 6. Do's and Don'ts

### Do:
- **Do** show real work: steel, propellers, welding, dry dock, machinery and workshop conditions.
- **Do** keep mobile contact actions visible when no panel is open.
- **Do** use brass for decisive interactions, not decorative wash.
- **Do** preserve keyboard access, focus return, Esc close behavior and reduced-motion fallbacks.
- **Do** make capability concrete with job types, materials, disciplines and contact paths.

### Don't:
- **Don't** use generic blue-gradient corporate engineering templates.
- **Don't** use SaaS landing-page patterns: hero metric blocks, repeated icon-card grids, pastel gradients or glassmorphism.
- **Don't** make the site feel like a travel brochure with no grit.
- **Don't** ship over-animated carnival effects that fight usability or stall on mobile.
- **Don't** publish fake testimonials. Use real quotes, case studies, readiness proof or no testimonial section.
- **Don't** use thick one-sided colored borders as card accents. Use full borders, proof marks or tonal contrast.
