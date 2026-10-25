# Elite Dental Clinic — Tailwind CSS refresh

Arabic-first, right-to-left landing page with a responsive visual hierarchy, accessible navigation, high-contrast WhatsApp CTAs, spacious sections, and contextual Unsplash photography.

## Build the production stylesheet

Requires Node.js 20+.

```sh
npm install
npm run build:css
```

`src/tailwind.css` defines the Tailwind theme tokens and scans `index.html`. The compiled output is served from `assets/css/site.css`; the HTML intentionally does not use Tailwind's browser Play CDN. The existing self-hosted Arabic font assets and `assets/fonts/local-fonts.css` are retained from the base branch.

## Notes

- All image elements use direct `images.unsplash.com` URLs, responsive-friendly image sizes, and lazy loading for non-hero photos.
- WhatsApp links retain the generic pre-filled message. No clinic phone number was supplied, and the site footer identifies the clinic as a demo.
- The mobile navigation updates `aria-expanded`, supports Escape-to-close, and respects reduced-motion preferences.
\n## Responsive and Lighthouse QA\n\nThe `Browser QA & Lighthouse (Tailwind UX)` GitHub Actions workflow checks the landing page at 360, 390, 768, and 1440 CSS pixels, validates the mobile menu interactions and internal anchors, captures full-page screenshots, and publishes mobile/desktop Lighthouse HTML and JSON reports as a workflow artifact. Third-party image load counts are recorded separately so a transient CDN failure is not confused with a layout regression.\n