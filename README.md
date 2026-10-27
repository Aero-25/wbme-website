# Walvis Bay Marine Engineering (WBME) — Website

A cinematic, five-page marketing site for WBME — a marine & metal engineering firm in Walvis Bay, Namibia (est. 1999).

**Demo build** — static HTML/CSS/JS, no build step.

## The experience
Five real, normally-scrollable pages — **Home · About · Services · Projects · Contact** — sharing one header/nav/footer/chatbot and one scroll-effects system: reveal-on-scroll, parallax drift, a header that solidifies on scroll, a scroll progress bar, and magnetic buttons.

- Same look on desktop and mobile (nav collapses to a hamburger drawer under 960px).
- `prefers-reduced-motion` aware — every effect (reveal, parallax, magnetic pull) disables cleanly.
- Blue + brass/gold, dark cinematic, ANTON display titles.

## Phones and tablets
Most visitors are on a phone, often on mobile data, so a few rules keep the site light and easy to use (CSS: the "MOBILE COMFORT" section at the end of `css/experience.css`):

- **Photos come in two sizes.** Inline background photos use `class="... rbg"` with `--bg-sm` (800px) and `--bg-lg` (1600px). Use root-relative paths (`/media/...`): a relative `url()` inside a CSS variable resolves against `css/`, not the page. Photos hydrated by `js/bucket-assets.js` pick 800px on phones automatically; only the full-screen photo viewer loads 1600px.
- **Videos have a phone version.** Each film has a `-480p.mp4` copy (about a third of the size) chosen with `<source media="(max-width: 860px)">`. On a data-saver or 2G connection the About hero shows its poster only, and the home film waits for a tap.
- **The map is a card on phones** with "Open in Maps" and "Show map here"; desktops get the live map.
- **Touch and type**: controls are at least 44px on touch screens, small labels at least 12px, and form fields 16px so iPhones don't zoom in.
- **Pop-ups** (menu, contact form, service details, photo viewer) move focus inside, keep Tab inside, close with Esc and return focus. On touch screens they open on the close button rather than a form field. The photo viewer swipes and takes arrow keys.
- **The chat launcher** sits bottom-right on phones (thumb reach, clear of left-aligned text) and bottom-left on desktop.

## Structure
```
├── index.html, about.html, services.html, projects.html, contact.html
├── css/experience.css      # shared design system + scroll-effects engine
├── js/experience.js        # header/nav state, reveals, parallax, progress, lightbox, form
├── js/glass-fx.js          # cursor spotlight + magnetic buttons
├── js/chatbot.js           # website assistant: chat UI + its built-in brain (see below)
├── js/bucket-assets.js     # Supabase Storage image hydration
├── images/                 # logo, photography, service icons
└── docs/superpowers/specs/ # design specs
```

## Hosting & backend (Cloudflare)
Hosted on Cloudflare Pages (project `wbme`), deployed automatically from `main`.
Live at **https://www.wbme.com.na** (custom domain on the Pages project; `wbme.pages.dev` stays as the preview address).

- **DNS** for `wbme.com.na` is managed by Synapse in their own Cloudflare account, not ours: `www` is a CNAME to `wbme.pages.dev`, the root domain redirects to `www`, and the Microsoft 365 mail records (MX, SPF, autodiscover) live there too. Any DNS change goes through Synapse support.
- **Email alerts** go out through Resend from the subdomain `enquiry.wbme.com.na` (verified, Ireland region). Its three records sit in Synapse's zone: `resend._domainkey.enquiry` (TXT, DKIM) and the CNAMEs `rsend.enquiry` and `send.enquiry`, both DNS only. Nothing on the root domain changed, so Microsoft 365 mail is unaffected.

- **Site media** ships with the site in `/media` (pre-sized WebP, self-hosted fonts).
- **Projects blog** lives in D1 (`wbme`, binding `DB`); schema in `migrations/`. Public API: `GET /api/projects` (`?slug=` for one post).
- **Admin photos** go to R2 (`wbme-media`, binding `MEDIA`), resized to 1600px WebP in the browser, served at `/uploads/...`.
- **Admin login** (`admin.html`) is checked by Pages Functions in `functions/`: passwords are PBKDF2 hashes in the `ADMIN_USERS` secret, sessions are HMAC-signed cookies (`SESSION_SECRET`). Add a login with `node scripts/hash-password.mjs <username> <password>` and put the printed entry in the `ADMIN_USERS_EXTRA` secret (Pages → Settings → Variables and Secrets), which is merged with `ADMIN_USERS`. Cloudflare can't display a secret's current value, so keep the full `ADMIN_USERS_EXTRA` JSON somewhere safe: replacing it replaces every login in it.
- `js/projects-snapshot.js` is a fallback copy of the published posts, shown if the API is unreachable.
- Supabase (`supabase/schema.sql`) is the previous backend, kept for reference only.

## Website assistant
The propeller button opens the WBME assistant. It runs entirely on its own, in the visitor's browser: no AI service, no outside calls, nothing to pay for. Everything it knows and every reply it can give is in `js/chatbot.js`, so keep that file in step with the pages when the phone number, hours, services or project posts change.

- **Talks like a person**: typo-tolerant reading, reacts to the problem ("that's a pain"), asks one thing at a time, uses the visitor's first name, answers two questions at once ("hours and where are you?"), and says honestly when a job isn't one of WBME's trades (cars, electrical, painting, equipment hire...) or when it doesn't know something (prices, lead times, certificates).
- **Knows the workshop**: the six trades and propeller/shaft work, past project posts (with a link to the photos), industries, the founder's story, and whether the workshop is open right now or on the day asked about (Namibian time, Saturday Sabbath, Sunday on request).
- **Memory**: the conversation is kept for the browser tab (sessionStorage), so it follows the visitor across pages; the assistant can open a page and pick up again there, even halfway through an enquiry.
- **Enquiries**: it takes down the job, vessel or site, urgency, name and contact one question at a time, reads them back, and saves the enquiry through `functions/api/enquiry.js` to D1 (`enquiries` table, created automatically; schema in `migrations/0002_assistant.sql`). The visitor gets a reference number and an "Email this to WBME" button that opens their email app with everything filled in, so photos can be attached. The team sees each enquiry at the top of `admin.html`, with the chat it came from, reply and call buttons, and *Mark handled*.

Enquiries are rate limited per connection (8 per 10 minutes, 30 per day).

## Contact form and email alerts
The contact form (Contact page and the pop-up on every page) posts to the same `functions/api/enquiry.js` as the assistant, marked as a form enquiry. Every enquiry is saved to D1 and shows in `admin.html`, which says whether it came from the form or the assistant. Each new or changed enquiry is then emailed to the workshop by `functions/_shared/mailer.js`, with Reply-To set to the visitor's email so replying answers them directly. When a new enquiry includes an email address, the visitor also gets a branded "we've got your request" confirmation with their reference and the workshop number (logo: `media/brand/email-logo-608.png`, PNG because Outlook can't show WebP); replying to it reaches info@wbme.com.na. A hidden field that people never see catches simple spam bots.

Pages settings (Settings → Variables and Secrets, Production):
- `RESEND_API_KEY` (secret): a Resend API key with sending access. **Without it no alerts are sent**, and the form also opens the visitor's email app so WBME still gets the message.
- `ENQUIRY_TO` (optional): comma-separated recipients, default `info@wbme.com.na`.
- `MAIL_FROM` (optional): sender, default `WBME Website <website@enquiry.wbme.com.na>`.

Secrets only reach new deployments: after adding or changing one, redeploy (Deployments → latest → Retry deployment). If the API can't be reached at all, the form falls back to the visitor's email app.

## Run locally
Serve the folder (don't open via `file://`). A plain static server has no `/api`, so the contact form falls back to opening your email app:
```bash
python -m http.server 8000   # then http://localhost:8000
```

## Notes
- Placeholder logo lockup + demo photography; real brand assets to be dropped in.

---
*Walvis Bay Marine Engineering — "No job too big, no job too small."*
