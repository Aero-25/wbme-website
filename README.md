# Walvis Bay Marine Engineering (WBME) — Website

A full redesign of the WBME marketing website — modern, clean and professional, in the company's **blue + brass/gold** brand colours.

**Demo build** — static HTML/CSS/JS, no build step required.

## Pages
| Page | File |
|------|------|
| Home | `index.html` |
| About | `about.html` |
| Services | `services.html` |
| Projects | `projects.html` |
| Contact | `contact.html` |

## Structure
```
├── index.html / about.html / services.html / projects.html / contact.html
├── css/styles.css      # shared design system (brand: navy + brass/gold)
├── js/main.js          # reveals, count-ups, mobile menu, lightbox, form validation
├── images/             # logo, photography, service icons
└── docs/superpowers/specs/   # design spec
```

## Run locally
Open `index.html` directly, or serve the folder:
```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Notes
- Fully responsive (mobile drawer menu included).
- Contact form opens the visitor's email client to `info@wbme.com.na` (swap for a hosted form endpoint for in-page sending).
- Placeholder logo lockup + demo photography; real brand assets to be dropped in.

---
*Walvis Bay Marine Engineering — established 1999. "No job too big, no job too small."*
