# Walvis Bay Marine Engineering (WBME) — Website

A cinematic, five-page marketing site for WBME — a marine & metal engineering firm in Walvis Bay, Namibia (est. 1999).

**Demo build** — static HTML/CSS/JS, no build step.

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

## Hosting & backend (Cloudflare)
Hosted on Cloudflare Pages (project `wbme`), deployed automatically from `main`.

- **Site media** ships with the site in `/media` (pre-sized WebP, self-hosted fonts).
- **Projects blog** lives in D1 (`wbme`, binding `DB`); schema in `migrations/`. Public API: `GET /api/projects` (`?slug=` for one post).
- **Admin photos** go to R2 (`wbme-media`, binding `MEDIA`), resized to 1600px WebP in the browser, served at `/uploads/...`.
- **Admin login** (`admin.html`) is checked by Pages Functions in `functions/`: passwords are PBKDF2 hashes in the `ADMIN_USERS` secret, sessions are HMAC-signed cookies (`SESSION_SECRET`). Add or change a login with `node scripts/hash-password.mjs <email> <password>` and update `ADMIN_USERS` in Pages → Settings → Variables and Secrets.
- `js/projects-snapshot.js` is a fallback copy of the published posts, shown if the API is unreachable.
- Supabase (`supabase/schema.sql`) is the previous backend, kept for reference only.

## Run locally
Serve the folder (don't open via `file://` — the contact form's `fetch()` POST to Formspree can misbehave from a `file://` origin in some browsers):
```bash
python -m http.server 8000   # then http://localhost:8000
```

## Notes
- Contact form opens the visitor's email client to `info@wbme.com.na` (swap for a hosted endpoint for in-page sending).
- Placeholder logo lockup + demo photography; real brand assets to be dropped in.

---
*Walvis Bay Marine Engineering — "No job too big, no job too small."*
