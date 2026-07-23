# Repository Guidelines

## Project Context

WBME is a static website for Walvis Bay Marine Engineering: rugged, precise, dependable, and cinematic without feeling gimmicky. The core experience is `index.html` plus `css/experience.css` and `js/experience.js`; older multipage files still exist and should not be deleted unless the user asks.

Read `PRODUCT.md` before design work. It defines the brand register, users, anti-references, accessibility goals, and motion limits.

## Installed Coding and Design Skills

Project-local skills live in `.agents/skills/`.

- `emil-design-eng`: Emil Kowalski design-engineering guidance for UI polish, responsive interactions, animation decisions, easing, duration, transform origins, and component details.
- `review-animations`: strict motion review skill. Use it for animation audits and motion regressions. It requires findings in a markdown table with `Before`, `After`, and `Why`.
- `animation-vocabulary`: reverse-lookup vocabulary for naming animation effects.
- `impeccable`: frontend design workflow, critique, audit, polish, layout, typography, color, motion, hardening, and live/design-detector tooling. Run its local scripts from `.agents/skills/impeccable/scripts/`.
- `design-taste-frontend`: general premium frontend implementation and redesign skill from Taste Skill.
- `redesign-existing-projects`: audit-first UI upgrade flow for existing projects.
- `image-to-code`: image-first workflow for generating or matching visual references, then implementing.
- `gpt-taste`, `high-end-visual-design`, `minimalist-ui`, `industrial-brutalist-ui`, `stitch-design-taste`, `brandkit`, `imagegen-frontend-web`, and `imagegen-frontend-mobile`: specialized taste, visual direction, brand, image-generation, and design-system skills.
- `full-output-enforcement`: use when a task needs complete, unabridged output.

Impeccable's detector hook is installed at `.codex/hooks.json`. It runs after UI edits through `.agents/skills/impeccable/scripts/hook.mjs`.

## How To Invoke Skills In Prompts

Ask directly by skill name when you want a specific behavior:

- `$impeccable audit index.html and css/experience.css`
- `$impeccable polish the mobile panel interactions`
- `$review-animations review the card morph and panel close motion`
- `$emil-design-eng improve the interaction details in the nav and panels`
- `$design-taste-frontend redesign the services section while preserving WBME's brand`
- `$image-to-code generate references, analyze them, then implement the approved direction`

For Impeccable subcommands, prefer explicit commands such as `audit`, `critique`, `polish`, `layout`, `typeset`, `animate`, `harden`, `adapt`, and `craft`.

## Frontend Design Rules For WBME

- Preserve the WBME design world: dark cinematic marine/metal engineering, blue plus brass/gold, real worksite grit, and plain-spoken confidence.
- Avoid generic SaaS patterns: pastel gradients, hero metric blocks, repeated icon-card grids, startup-style glassmorphism, and decorative gradient text.
- Keep motion purposeful and fast. Prefer transform and opacity; avoid layout-property animation. Honor `prefers-reduced-motion`.
- For frequently used controls, reduce or remove animation. Buttons and pressable elements should still provide immediate physical feedback.
- Keep mobile first in practice: touch targets at least 44px, readable type, no overflow, keyboard-operable panels, Esc close behavior, focus return, and visible focus states.
- Do not hide core content behind animation classes that may never run. Content should remain readable if animation fails.
- Use existing CSS tokens, components, imagery, and interaction patterns before inventing a new system.

## Engineering Safety

- This is a static HTML/CSS/JS project with no build step. To run locally, use `python -m http.server 8000` and open `http://localhost:8000`.
- Keep existing project files safe. Do not overwrite important files or remove legacy pages without explicit permission.
- Before broad visual changes, inspect `PRODUCT.md`, `README.md`, `docs/superpowers/specs/`, and the affected HTML/CSS/JS.
- Verify visible UI changes in a browser when possible, including desktop and mobile viewport checks.
