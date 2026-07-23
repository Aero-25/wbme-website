# Walvis Bay Marine Engineering website

A cinematic static website for WBME, a marine and metal engineering workshop in Walvis Bay, Namibia, established in 1999.

## Experience

Six normally scrolling routes share one responsive design system:

- Home, About, Services, Projects, Contact, and Legal
- Dark navy and brass visual language built around real WBME yard photography
- Self-hosted display, interface, body, and technical fonts
- Keyboard-ready mobile navigation, quote modal, project lightbox, forms, and on-site assistant
- Fail-safe reveal motion, CSS scroll progress, and full `prefers-reduced-motion` support
- Local image fallbacks that progressively upgrade to optimized WebP workshop photography
- Responsive layouts with no horizontal overflow and touch targets sized for mobile use

## Structure

```text
├── index.html, about.html, services.html, projects.html, contact.html, legal.html
├── css/experience.css      # shared visual system and responsive layouts
├── js/experience.js        # navigation, overlays, forms, gallery, and lightbox
├── js/chatbot.js           # local on-site workshop assistant
├── js/bucket-assets.js     # progressive Supabase image upgrades
├── fonts/                  # self-hosted web fonts
├── images/                 # brand assets, local fallbacks, and generated texture
├── robots.txt
└── sitemap.xml
```

## Run locally

There is no build step. Serve the repository root and open the local URL:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Contact behavior

Quote forms validate in the browser and open a prepared email to `info@wbme.com.na`. Replace the placeholder Formspree endpoint in `js/experience.js` when hosted in-page submission is configured.
