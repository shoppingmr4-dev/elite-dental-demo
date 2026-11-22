# RUWA Dental Whitening — Apex Studio Portfolio Demo

This repository contains two separate dental-page projects. Keep their responsibilities distinct.

## Current RUWA source of truth

- Primary page: **whitening-2026.html**
- Design and implementation notes: **WHITENING-2026-DESIGN-SYSTEM.md**
- Case study: **portfolio/elite-dental-whitening/CASE-STUDY.md**
- Production-readiness audit: **portfolio/elite-dental-whitening/PRODUCTION-READINESS-AUDIT.md**

The RUWA page is a standalone Arabic Saudi-locale, RTL dental-whitening portfolio demonstration. It is the only page to edit when working on RUWA.

The old paths **whitening-preview.html** and **preview/ruwa/index.html** are compatibility aliases. Both redirect to whitening-2026.html so they cannot drift into separate, outdated implementations.

## Important project facts

RUWA is a fictional portfolio concept created by Apex Studio. It is not a commissioned or operating clinic and is not cleared as a real commercial brand.

The current single-page landing page has **13 content sections** (Hero, trust principles, About, causes of discoloration, assessment approach, whitening options, suitability and safety, realistic expectations, illustrative team, blank facilities gallery, sample reviews, FAQ, and final contact) and **4 FAQ entries**.

The Hero portrait at assets/ruwa-hero-90-768.webp is the approved AI-generated illustrative image. The page's Arabic alt text and disclosure identify it as AI-generated and explicitly state that it is not a real dentist. Its approved Git blob is protected by a CI SHA guard. Do not replace, edit, crop, recolor, reposition, or present it as a real clinician.

There are **3 WhatsApp actions and 2 phone actions**. The WhatsApp and phone configuration values are intentionally empty. Every action therefore opens the local accessible dialog explaining that the relevant channel is not activated. No real phone number, WhatsApp URL, booking system, lead form, patient data collection, or appointment confirmation is configured.

The page now includes one clearly disclosed AI-generated fictional clinician portrait, two intentionally blank team-image spaces, three sample review cards with prominent non-genuine-content disclosures, and blank facility-image spaces. None represents a real doctor, patient, rating, clinic facility, or address.

## Page architecture

The current visitor journey follows this order:

1. **Hero:** focused whitening proposition, approved illustrative portrait, and clear contact actions.
2. **Trust principles:** clarify the educational scope and avoid guaranteed-result claims.
3. **About RUWA:** explain the fictional portfolio concept and its content approach.
4. **Causes of discoloration:** explain surface staining and deeper colour changes.
5. **Assessment approach:** show why dental and gum health should be assessed before choosing an option.
6. **Whitening options:** explain general approaches without claiming that a real clinic offers them.
7. **Suitability and safety:** outline factors that may affect suitability or timing.
8. **Realistic expectations:** discuss sensitivity, individual variation, restorations, and limitations.
9. **Illustrative team:** one disclosed AI-generated portrait and two blank team-image spaces.
10. **Facilities image spaces:** two intentionally blank white frames; no real premises are implied.
11. **Sample reviews:** three clearly disclosed sample-copy cards, not actual patient feedback.
12. **FAQ:** four native HTML details/summary entries, including aftercare and duration.
13. **Final consultation/contact:** WhatsApp and phone actions that disclose their inactive demo state.

The shared header, navigation, announcement strip, and portfolio-disclosure footer support the page; they are not additional numbered content sections.
## Separate legacy root page

The root **index.html** and **assets/css/site.css** belong to the repository's existing Elite Dental Clinic Tailwind demo. They are separate from RUWA and are intentionally not changed by RUWA page work.

The **build:css** script compiles the Tailwind stylesheet used by the legacy root page. It does not build or alter whitening-2026.html, which has its own page styles and scripts.

GitHub Pages deployment is configured to run from **main** only. Changes on the RUWA feature branch are staged and tested but are not deployed by that workflow.

## Development and checks

Requires Node.js 22 for the current RUWA QA workflow.

- Install dependencies: **npm install**
- Check repository/page/document consistency: **npm run test:ruwa:consistency**
  - The gate verifies the 14-section single-page order, four FAQ entries, five contact controls, demo-content disclosures, the local clinician image, blank image placeholders, all `aria-controls` targets, the protected Hero disclosure, and both preview redirects.
- Build the legacy root-page stylesheet only: **npm run build:css**
- Existing legacy responsive test: **npm run test:responsive**

The dedicated **Elite Whitening Browser QA** GitHub Actions workflow runs the repository consistency gate, Chromium/Playwright checks, full-page responsive captures, Hero fold checks, the protected-image SHA guard, and immutable public-preview verification. It tests the actual RUWA page across mobile, tablet, laptop, and desktop widths.

The workflow does not run Lighthouse in its current configuration. Do not quote Lighthouse scores as if they were measured by this workflow.

## Git workflow

Current working branch: **feature/elite-whitening-world-class-2026**  
Pull request: **#9** (draft; do not merge without explicit approval).

Keep RUWA edits on that branch. Do not change the root index page, production routing, GitHub Pages deployment settings, or the protected Hero asset as part of ordinary RUWA maintenance.
