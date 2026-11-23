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

The current page has **10 content sections** (Hero, assessment, causes, options, suitability, expectations, dentist/team, a transparent patient-reviews section, FAQ, and contact) and **4 FAQ entries**.

The Hero portrait at assets/ruwa-hero-90-768.webp is the approved AI-generated illustrative image. The page's Arabic alt text and disclosure identify it as AI-generated and explicitly state that it is not a real dentist. Its approved Git blob is protected by a CI SHA guard. Do not replace, edit, crop, recolor, reposition, or present it as a real clinician.

There are **3 WhatsApp actions and 2 phone actions**. The WhatsApp and phone configuration values are intentionally empty. Every action therefore opens the local accessible dialog explaining that the relevant channel is not activated. No real phone number, WhatsApp URL, booking system, lead form, patient data collection, or appointment confirmation is configured.

No doctor identity, qualification, clinic address, hours, fee, patient review, rating, patient photograph, treatment result, or business credential is supplied as verified information. Never invent one.

## Page architecture

1. Hero — focused whitening proposition, approved illustrative portrait, and clear contact actions.
2. Assessment approach — why evaluation precedes choosing a treatment.
3. Causes of discoloration — surface stains and deeper colour changes.
4. Whitening options — general educational descriptions, not a claim that a real clinic offers each option.
5. Suitability and safety — factors that may affect suitability or timing.
6. Realistic expectations — sensitivity, individual variation, and restorations.
7. Dentist/team — three distinct male portrait crops extracted from an existing AI-generated RUWA concept image, clearly disclosed as illustrative; each card reserves space for verified clinician information and makes no real identity or credential claims.
8. Patient reviews — a transparent editorial notice explaining that no verified patient reviews are available in this fictional demo; it contains no testimonials, names, ratings, or review counts.
9. FAQ — four native HTML details/summary entries.
10. Consultation/contact — WhatsApp and phone actions that disclose their inactive demo state.

The shared header, navigation, announcement strip, and portfolio-disclosure footer support these sections; they are not additional numbered content sections.

## Separate legacy root page

The root **index.html** and **assets/css/site.css** belong to the repository's existing Elite Dental Clinic Tailwind demo. They are separate from RUWA and are intentionally not changed by RUWA page work.

The **build:css** script compiles the Tailwind stylesheet used by the legacy root page. It does not build or alter whitening-2026.html, which has its own page styles and scripts.

GitHub Pages deployment is configured to run from **main** only. Changes on the RUWA feature branch are staged and tested but are not deployed by that workflow.

## Development and checks

Requires Node.js 22 for the current RUWA QA workflow.

- Install dependencies: **npm install**
- Check repository/page/document consistency: **npm run test:ruwa:consistency**
  - The gate verifies the ten-section order, the disclosed team portraits, transparent review-section state and three publication criteria, four FAQ entries, five contact controls, all `aria-controls` targets, the protected Hero disclosure, and both preview redirects.
- Build the legacy root-page stylesheet only: **npm run build:css**
- Existing legacy responsive test: **npm run test:responsive**

The dedicated **Elite Whitening Browser QA** GitHub Actions workflow runs the repository consistency gate, Chromium/Playwright checks, full-page responsive captures, Hero fold checks, the protected-image SHA guard, and immutable public-preview verification. It tests the actual RUWA page across mobile, tablet, laptop, and desktop widths.

The workflow does not run Lighthouse in its current configuration. Do not quote Lighthouse scores as if they were measured by this workflow.

## Git workflow

Current working branch: **feature/elite-whitening-world-class-2026**  
Pull request: **#9** (draft; do not merge without explicit approval).

Keep RUWA edits on that branch. Do not change the root index page, production routing, GitHub Pages deployment settings, or the protected Hero asset as part of ordinary RUWA maintenance.
