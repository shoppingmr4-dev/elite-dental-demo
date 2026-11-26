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

## Project facts and transparency

RUWA is a fictional portfolio concept created by Apex Studio. It is not a commissioned or operating clinic and must not be presented as a real commercial clinic or client project.

The page contains **9 content sections** and **2 FAQ entries**. Assessment is now integrated into the four-step treatment journey, while suitability, safety, and realistic expectations are presented together in one section.

The separate demo sentence beneath the Hero contact buttons has been removed as requested. The footer and page metadata continue to identify RUWA as a fictional Apex Studio portfolio demonstration; the Hero portrait caption independently identifies the dentist image as AI-generated.

The Hero portrait at `assets/ruwa-hero-90-768.webp` is the approved AI-generated illustration. Its Arabic alt text and visible disclosure state that it is not a real dentist. Its approved Git blob is protected by a CI SHA guard. Do not replace, edit, crop, recolor, reposition, or present it as a real clinician.

The team contains three distinct AI-generated male dentist illustrations with a visible disclosure. They do not represent real doctors or clinic employees. No doctor identities, degrees, licences, experience, verified reviews, ratings, treatment outcomes, clinic addresses, opening hours, fees, phone numbers, or operational booking services are supplied.

There are **3 WhatsApp actions and 3 phone actions**. The Hero WhatsApp action and final-section WhatsApp action share the existing contact handler; a third circular floating WhatsApp control appears only while the Hero WhatsApp action is outside the viewport. The header action is now **اتصل بنا** and uses the phone channel. The WhatsApp and phone configuration values remain intentionally empty, so each action opens the accessible local unavailable-contact dialog. No patient data is collected and no appointment is confirmed.

## Page architecture

1. Hero — whitening proposition, approved illustrative portrait, and contact actions.
2. Causes of discoloration — surface stains and deeper colour changes.
3. Whitening options — general educational descriptions, not a claim about a real clinic's services.
4. Assessment and treatment journey — four steps from oral-health assessment and option selection to the agreed procedure and aftercare.
5. Suitability, safety, and realistic expectations — relevant health factors, possible effects, result variation, restoration limits, and aftercare.
6. Dentist/team — three illustrative portraits with explicit disclosure and no invented identities or credentials; this protected section remains unchanged.
7. Patient reviews — a transparent notice that no verified patient reviews are available in this fictional demo; this protected section remains unchanged.
8. FAQ — two non-redundant native HTML details/summary entries.
9. Consultation/contact — WhatsApp and phone actions that disclose their inactive demo state.

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

The consistency gate verifies the nine-section order, the four cards in the combined safety/expectations area, three disclosed team portraits, the unchanged transparent reviews state, two focused FAQ entries, six contact controls, smart floating WhatsApp visibility, the persistent-on-selection navigation menu, header phone action, ARIA targets, retained footer and metadata demo disclosures, root redirect, and both preview redirects.

The **RUWA Browser QA** GitHub Actions workflow runs the consistency gate, Playwright Chromium checks, full-page responsive captures, Hero fold checks, approved-Hero SHA validation, and immutable public-preview verification.

The workflow does not currently run Lighthouse. Do not quote a Lighthouse score as a result of this workflow.

## Git workflow and deployment

Current working branch: **`feature/elite-whitening-world-class-2026`**  
Pull request: **#9** — keep it open and in Draft until explicitly approved.

Keep RUWA work on that branch. Do not push to `main`, merge the draft PR, or trigger a production deployment without explicit authorization. Automatic GitHub Pages deployment is triggered by pushes to `main`. The workflow also exposes `workflow_dispatch`, but the deployment job now enforces `refs/heads/main`; dispatches from other branches are skipped. Select `main` only for an intentionally authorized production deployment.
