# RUWA Dental Whitening — Apex Studio Portfolio Demo

This repository now contains one active website project: the **RUWA** Arabic dental-whitening landing page created as an Apex Studio portfolio demonstration.

## Canonical website

- Main page: **`whitening-2026.html`**
- Repository entry point: **`index.html`** — a lightweight redirect to the main page
- Preview alias: **`whitening-preview.html`** — redirects to the main page
- Public preview alias: **`preview/ruwa/index.html`** — redirects to the main page
- Design system: **`WHITENING-2026-DESIGN-SYSTEM.md`**
- Case study: **`portfolio/ruwa-dental-whitening/CASE-STUDY.md`**
- Production-readiness audit: **`portfolio/ruwa-dental-whitening/PRODUCTION-READINESS-AUDIT.md`**

There is only one maintained RUWA page implementation. The root entry point and preview aliases do not contain duplicate website markup.

**Editorial update:** The page-wide medical-copy, clinical-accuracy, and conversion-language review was implemented on 27 November 2026. RUWA remains a fictional portfolio demonstration, not an operating clinic.

## Project facts and transparency

RUWA is a fictional portfolio concept created by Apex Studio. It is not a commissioned or operating clinic and must not be presented as a real commercial clinic or client project.

The page contains **10 content sections** and **4 FAQ entries**. Assessment is now integrated into the four-step treatment journey, while suitability, safety, and realistic expectations are presented together in one section.

The separate demo sentence beneath the Hero contact buttons has been removed as requested. The footer and page metadata continue to identify RUWA as a fictional Apex Studio portfolio demonstration; the Hero portrait caption independently identifies the dentist image as AI-generated.

The Hero portrait at `assets/ruwa-hero-90-768.webp` is the approved AI-generated illustration. Its Arabic alt text and visible disclosure state that it is not a real dentist. Its approved Git blob is protected by a CI SHA guard. Do not replace, edit, crop, recolor, reposition, or present it as a real clinician.

The team contains three distinct AI-generated male dentist illustrations with a visible disclosure. They do not represent real doctors or clinic employees. No doctor identities, degrees, licences, experience, verified reviews, ratings, treatment outcomes, clinic addresses, opening hours, fees, phone numbers, or operational booking services are supplied.

There is **one floating WhatsApp demo control**. It appears only after the Hero's primary internal navigation link leaves the viewport and opens an accessible dialog that explicitly explains that no real WhatsApp channel is connected. The Hero primary and secondary CTAs, header CTA, and final-section CTAs are working internal links to page sections; none implies a live phone call, WhatsApp conversation, appointment, or booking. The phone and WhatsApp configuration values remain empty. No patient data is collected.

## Page architecture

1. Hero — whitening proposition, approved illustrative portrait, and contact actions.
2. Causes of discoloration — surface stains and deeper colour changes.
3. Whitening options — general educational descriptions, not a claim about a real clinic's services.
4. Assessment and treatment journey — four steps from oral-health assessment and option selection to the agreed procedure and aftercare.
5. Suitability, safety, and realistic expectations — relevant health factors, possible effects, result variation, restoration limits, and aftercare.
6. Team-section preview — three illustrative portraits with a visible AI-generated-image disclosure before the cards and placeholders for verified clinician details.
7. Review transparency — three informational cards explaining source verification, explicit permission, and faithful presentation. No hypothetical patient quotations, testimonials, rating stars, or review scores are displayed.
8. Location-section preview — a local abstract Riyadh SVG with an explicit notice that it is not a real map or clinic location; the city-wide Google Maps search is not a clinic pin.
9. FAQ — four focused native HTML details/summary entries covering sessions, result longevity, stain types, and cautions about home-whitening mixtures.
10. Next step — working internal links to the FAQ and assessment sections. One floating WhatsApp demo control remains as a disclosed preview only; no live contact or booking is available.

The shared header, navigation, announcement strip, and footer support these sections; they are not additional numbered content sections.

## Technology and assets

- Standalone HTML, CSS, and JavaScript in `whitening-2026.html`.
- Arabic RTL page content localized for a Saudi audience.
- Locally hosted IBM Plex Sans Arabic for Arabic headings and body copy.
- Cormorant Garamond for the Latin RUWA wordmark.
- Local font declarations in `assets/fonts/local-fonts.css`.
- Optimized RUWA WebP and AVIF assets.
- Responsive layout, accessible navigation, keyboard support, reduced-motion handling, and browser QA.

The former demo page and its page-specific build infrastructure have been removed. No Tailwind build step is required to serve or test RUWA.

## Development and checks

Use Node.js 22.

```sh
npm install
npm audit --audit-level=high
npm run test:ruwa:consistency
npx playwright install chromium
```

The consistency gate verifies the ten-section order and numbering, the combined safety/expectations area, three disclosed team portraits with verified-information placeholders, three review-transparency cards with no patient quotations or decorative ratings, four focused FAQ entries, truthful internal CTAs, one floating WhatsApp demo control, the responsive menu, ARIA targets, footer and metadata demo disclosures, root redirect, and both preview redirects.

The **RUWA Browser QA** GitHub Actions workflow runs the consistency gate, Playwright Chromium checks, full-page responsive captures, Hero fold checks, approved-Hero SHA validation, and immutable public-preview verification.

The workflow does not currently run Lighthouse. Do not quote a Lighthouse score as a result of this workflow.

## Git workflow and deployment

Current working branch: **`feature/elite-whitening-world-class-2026`**  
Pull request: **#9** — keep it open and in Draft until explicitly approved.

Keep RUWA work on that branch. Do not push to `main`, merge the draft PR, or trigger a production deployment without explicit authorization. Automatic GitHub Pages deployment is triggered by pushes to `main`. The workflow also exposes `workflow_dispatch`, but the deployment job now enforces `refs/heads/main`; dispatches from other branches are skipped. Select `main` only for an intentionally authorized production deployment.
