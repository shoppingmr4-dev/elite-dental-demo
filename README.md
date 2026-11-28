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

**Editorial update:** The page-wide medical-copy, clinical-accuracy, and conversion-language review was implemented on 27 November 2026. The current messaging aligns around patient-specific suitability; the FAQ now addresses seven distinct decision questions, including what to tell the dentist before whitening. RUWA remains a fictional portfolio demonstration, not an operating clinic.

## Project facts and transparency

RUWA is a fictional portfolio concept created by Apex Studio. It is not a commissioned or operating clinic and must not be presented as a real commercial clinic or client project.

The page contains **10 content sections** and **7 FAQ entries**. Assessment is now integrated into the four-step treatment journey, while suitability, safety, and realistic expectations are presented together in one section.

The separate demo sentence beneath the Hero contact buttons has been removed as requested. The footer is the single visible location that identifies RUWA as an Apex Studio portfolio project rather than an operating clinic. Page metadata describes the whitening information without presenting a local medical service claim; the Hero portrait caption uses patient-facing copy while the footer carries the AI-image disclosure.

The Hero portrait at `assets/ruwa-hero-90-768.webp` is the approved AI-generated illustration. Its Arabic alt text describes the portrait as an illustration. The footer discloses that the imagery is AI-generated and does not represent real people. Its approved Git blob is protected by a CI SHA guard. Do not replace, edit, crop, recolor, reposition, or present it as a real clinician.

The team contains three distinct illustrative male dentist portraits. The footer discloses that the imagery is AI-generated and does not represent real doctors or clinic employees. No doctor identities, degrees, licences, experience, verified reviews, ratings, treatment outcomes, clinic addresses, opening hours, fees, phone numbers, or operational booking services are supplied.

The page contains six contact controls: WhatsApp and phone buttons in the Hero, the header phone button, WhatsApp and phone buttons in the final section, and a floating WhatsApp control. All six open the accessible contact-unavailable dialog because no phone number or WhatsApp account is connected; none invents contact details or pretends to place a call or send a message. The floating control appears after the Hero WhatsApp button leaves the viewport. No patient data is collected.

## Page architecture

1. Hero — whitening proposition, approved illustrative portrait, WhatsApp contact button, and call-us button.
2. Causes of discoloration — surface stains and deeper colour changes.
3. Whitening options — general educational descriptions, not a claim about a real clinic's services.
4. Assessment and treatment journey — four steps from oral-health assessment and option selection to the agreed procedure and aftercare.
5. Suitability, safety, and realistic expectations — relevant health factors, possible effects, result variation, restoration limits, and aftercare.
6. Dentist selection — three cards explaining professional licensing, relevant whitening experience, and clear treatment planning; the footer identifies the illustrative portraits as AI-generated.
7. Patient reviews — three clearly labelled slots reserved for genuine, verified, permissioned patient feedback. No fabricated quotations, testimonials, star ratings, or review scores are displayed.
8. Location-section preview — a local abstract Riyadh SVG with an explicit notice that it is not a real map or clinic location; the city-wide Google Maps search is not a clinic pin.
9. FAQ — seven focused native HTML details/summary entries covering session count, result longevity, stain types, DIY-whitening cautions, sensitivity, restoration limits, and information to share with the dentist before whitening.
10. Next step — a final contact section with WhatsApp and phone buttons that open the contact-unavailable dialog. No live contact or booking is available until verified details are connected.

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

The consistency gate verifies the ten-section order and numbering, the combined safety/expectations area, three AI-illustrative team portraits with professional-information placeholders, three patient-review slots without fabricated patient statements or decorative ratings, seven focused FAQ entries, three WhatsApp and three phone controls, final-section contact actions, and one floating WhatsApp control, the responsive menu, ARIA targets, footer and metadata demo disclosures, root redirect, and both preview redirects.

The **RUWA Browser QA** GitHub Actions workflow runs the consistency gate, Playwright Chromium checks, full-page responsive captures, Hero fold checks, approved-Hero SHA validation, and immutable public-preview verification.

The workflow does not currently run Lighthouse. Do not quote a Lighthouse score as a result of this workflow.

## Git workflow and deployment

Current working branch: **`feature/elite-whitening-world-class-2026`**  
Pull request: **#9** — keep it open and in Draft until explicitly approved.

Keep RUWA work on that branch. Do not push to `main`, merge the draft PR, or trigger a production deployment without explicit authorization. Automatic GitHub Pages deployment is triggered by pushes to `main`. The workflow also exposes `workflow_dispatch`, but the deployment job now enforces `refs/heads/main`; dispatches from other branches are skipped. Select `main` only for an intentionally authorized production deployment.
