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
├── js/chatbot.js           # website assistant: chat UI + offline brain (see below)
├── js/bucket-assets.js     # Supabase Storage image hydration
├── images/                 # logo, photography, service icons
└── docs/superpowers/specs/ # design specs
```

## Hosting & backend (Cloudflare)
Hosted on Cloudflare Pages (project `wbme`), deployed automatically from `main`.
Live at **https://www.wbme.com.na** (custom domain on the Pages project; `wbme.pages.dev` stays as the preview address).

- **DNS** for `wbme.com.na` is managed by Synapse in their own Cloudflare account, not ours: `www` is a CNAME to `wbme.pages.dev`, the root domain redirects to `www`, and the Microsoft 365 mail records (MX, SPF, autodiscover) live there too. Any DNS change goes through Synapse support.

- **Site media** ships with the site in `/media` (pre-sized WebP, self-hosted fonts).
- **Projects blog** lives in D1 (`wbme`, binding `DB`); schema in `migrations/`. Public API: `GET /api/projects` (`?slug=` for one post).
- **Admin photos** go to R2 (`wbme-media`, binding `MEDIA`), resized to 1600px WebP in the browser, served at `/uploads/...`.
- **Admin login** (`admin.html`) is checked by Pages Functions in `functions/`: passwords are PBKDF2 hashes in the `ADMIN_USERS` secret, sessions are HMAC-signed cookies (`SESSION_SECRET`). Add or change a login with `node scripts/hash-password.mjs <email> <password>` and update `ADMIN_USERS` in Pages → Settings → Variables and Secrets.
- `js/projects-snapshot.js` is a fallback copy of the published posts, shown if the API is unreachable.
- Supabase (`supabase/schema.sql`) is the previous backend, kept for reference only.

## Website assistant
The propeller button opens the WBME assistant. It talks like someone at the front of the workshop: it answers questions, understands a described job ("our trawler's stern seal is leaking"), takes down an enquiry and hands the visitor a one-tap email and call.

- **AI replies** come from `functions/api/chat.js`, which streams answers from Claude (Opus 5.5, low effort, with Anthropic's default refusal fallback). What it knows and how it talks is in `functions/_shared/assistant-knowledge.js`; keep that file in step with the pages when the phone number, hours or services change. It also sees the live Projects posts and the current Namibian time, so it knows whether the workshop is open.
- **Offline brain**: if the AI is unavailable (no key yet, limits hit, API trouble), `js/chatbot.js` answers on its own: fuzzy matching, follow-ups, the visitor's name, open/closed status, and the same guided enquiry flow. Visitors never see an error.
- **Memory**: the conversation is kept for the browser tab (sessionStorage), so it follows the visitor across pages; the assistant can open a page and pick up again there.
- **Enquiries** the assistant takes down are saved to D1 (`enquiries` table, created automatically; schema in `migrations/0002_assistant.sql`) and listed at the top of `admin.html` with the chat they came from, reply/call buttons and *Mark handled*. The visitor also gets an "Email this to WBME" button that opens their email app with everything filled in, so photos can be attached.

Settings (Pages → Settings → Variables and Secrets, Production):

| Name | Needed | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | for AI replies | Secret. Without it the offline brain answers. |
| `CHAT_MODEL` | optional | Defaults to `claude-opus-5-5`. |
| `CHAT_DAILY_LIMIT` | optional | AI calls per day across the site, default 800. Caps the bill; past it, the offline brain answers. |

Limits per visitor connection: 40 messages per 10 minutes and 300 per day; 8 enquiries per 10 minutes and 30 per day. A typical message costs roughly one US cent with the knowledge prompt cached. Each call's token use is logged in the Pages Functions logs (`assistant: turn`).

The only npm package is the Anthropic SDK (`package.json`, pinned); Pages installs it when it builds the Functions. There is still no build step for the site itself.

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
