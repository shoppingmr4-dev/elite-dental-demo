# RUWA Dental Whitening — Repository and Production-Readiness Audit

**Audit date:** 24 November 2026  
**Working branch:** feature/elite-whitening-world-class-2026  
**Pull request:** #9 (draft; not merged)  
**Canonical RUWA page:** whitening-2026.html  
**Project type:** fictional Apex Studio portfolio demonstration  
**Portfolio verdict:** Suitable for Apex Studio portfolio presentation as a clearly disclosed fictional demonstration.  
**Production verdict:** NOT READY for a real clinic; verified clinic identity, clinical approval, authentic team/review evidence, contact channels, privacy handling, and operational booking remain unavailable.

## 1. Executive finding

RUWA is a fictional portfolio concept, not a commissioned or operating dental clinic. It must not be presented as a real clinic, and it must not acquire invented doctors, qualifications, ratings, testimonials, prices, addresses, opening hours, patient statistics, clinical outcomes, or appointment inventory.

The current page has a coherent service-specific education journey. It contains **11 main content sections** plus the shared header, announcement strip, and footer. Its educational structure does not need extra placeholder sections. The missing items are real-business evidence and an operational conversion destination, not decorative content.

## 2. Repository source-of-truth and route audit

- Canonical implementation: **whitening-2026.html**.
- Legacy path **whitening-preview.html** redirects to the canonical implementation.
- Legacy public route **preview/ruwa/index.html** redirects to the canonical implementation.
- These aliases must not contain a second landing-page implementation.
- Root **index.html** is a minimal redirect to **whitening-2026.html**; it is not a second website implementation.
- The former demo page, its page-specific build files, and its legacy-only CI workflows have been removed from the active repository.
- GitHub Pages deployment is configured on main only. The feature branch and draft PR are not themselves a production deployment.

## 3. Existing RUWA page inventory

The actual current DOM order is:

| Order | ID | Section | Decision | Evidence-based rationale |
|---:|---|---|---|---|
| Header | main-nav | Brand, seven section links, phone CTA labelled «اتصل بنا» | KEEP | Directs visitors to the current patient-education journey, including the treatment journey and reviews-transparency note. |
| 01 | top | Hero | KEEP / protect | Explains the whitening subject and presents the approved illustrative portrait and first actions. |
| 02 | approach | Assessment approach | KEEP | Explains why assessment precedes choosing an option. |
| 03 | causes | Causes of discoloration | KEEP | Provides concise context about surface and deeper colour changes. |
| 04 | options | Whitening options | IMPROVE only for a real clinic | General education is not proof that a real clinic offers all listed options. |
| 05 | journey | Treatment journey | KEEP | Explains the general sequence from initial assessment and option selection to the procedure and aftercare, without claiming a clinic-specific protocol. |
| 06 | suitability | Suitability and safety | KEEP / clinical review required | Explains factors that may affect suitability or timing. |
| 07 | expectations | Realistic expectations | KEEP | Covers individual result variation, possible temporary sensitivity and gum irritation, restorations that do not whiten like natural teeth, and general aftercare without invented clinic-specific restrictions or timelines. |
| 08 | team | Dentist/team | KEEP / demo-only | Three distinct AI-generated illustrative male portraits extracted from the existing RUWA concept image; no real clinician identity or credentials are claimed. |
| 09 | reviews | Patient reviews | KEEP / transparency-only | States that no verified patient reviews are available in this fictional demo; includes publication criteria but no testimonials or scores. |
| 10 | faq | Frequently asked questions | KEEP | Four native details/summary entries are present. |
| 11 | consultation | Final contact | KEEP / activate only with verified details | The actions disclose that real channels are not configured. |
| Footer | — | Portfolio and image disclosures | KEEP | Prevents the sample from being mistaken for a real operating clinic. |

The team section contains three equal demo-only profile cards with distinct AI-generated illustrative male portraits extracted from an existing RUWA concept image; these are not real doctor profiles or credentials. No authentic patient review/testimonial, review count, or rating score is supplied. The new patient-reviews panel is a transparency notice only, not social proof. No before-and-after gallery, clinic gallery, pricing section, map, or hours-of-operation section exists in this page.

## 4. Confirmed current content and interaction behavior

- Page language is ar-SA and direction is RTL.
- The page has a document title, meta description, Open Graph title/description/image, and favicon.
- The current Hero image is assets/ruwa-hero-90-768.webp.
- The current Hero image alt text and visible caption explicitly identify it as AI-generated and not a real dentist.
- FAQ count: **4 native details entries**.
- Contact controls: **3 WhatsApp actions and 3 phone actions**, including a context-aware floating WhatsApp control and a header phone action labelled «اتصل بنا».
- WHATSAPP_NUMBER and PHONE_NUMBER are intentionally empty.
- When clicked with those values empty, the actions open the local contact-unavailable dialog. They do not open WhatsApp or begin a phone call.
- Contact dialog ID: contact-unavailable-dialog.
- The page has no HTML form, no lead endpoint, no appointment availability, no booking confirmation, no data collection, and no analytics/ad pixels.
- It does not transmit or store visitor details.

All aria-controls references must resolve to real IDs. The header phone action, Hero actions, and floating WhatsApp control must reference contact-unavailable-dialog; the mobile menu toggle must reference main-nav. The consistency and browser tests enforce this relationship.

## 5. Protected Hero image

- Path: assets/ruwa-hero-90-768.webp
- Approved Git blob SHA: 11209e185ca8d671f74e54eda8fdefb1d42382d2
- File size: 105,004 bytes
- Intrinsic dimensions: 768 × 1152
- HTML class: hero-portrait
- Loading: eager, fetchpriority high.

The binary is guarded by a Git SHA check in the dedicated workflow. Browser checks also validate its path, dimensions, parent figure, and presentation. The image must not be replaced, regenerated, retouched, recoloured, recropped, resized, repositioned, transformed, or otherwise restyled without explicit approval.

The source-of-truth page and its current alt/caption identify this asset as AI-generated. Older preview documentation used a conflicting stock-image credit; both old preview paths are now redirects and that obsolete credit has been removed from RUWA materials. Do not reintroduce a stock-photo credit or imply that the pictured person is a real treating dentist.

## 6. Missing real-clinic inputs

The repository does not contain verified:
- Operating clinic identity or registered business details.
- Confirmed service location, street address, map point, or opening hours.
- Official phone number or monitored WhatsApp Business account.
- Actual booking destination or appointment inventory.
- Named dentist, professional registration, licence, or qualifications.
- Authentic clinician/team/facility photographs.
- Actual treatment menu and service availability.
- Approved service prices, package contents, discounts, or offer terms.
- Authentic patient reviews, ratings, or clinical outcome evidence.
- Clinic privacy notice, data controller/contact, retention policy, or secure lead-handling endpoint.

These are production blockers. Do not add placeholder-looking proof to the demo.

## 7. Recommended production information architecture

Once genuine clinic data is supplied and approved, use this one conversion-oriented sequence:

1. Hero — service, real clinic context, honest benefit, and one primary action.
2. Verified trust strip — only verifiable clinic and professional facts.
3. Understanding the problem — concise reasons and concerns relevant to whitening.
4. Assessment journey — what is assessed and why.
5. Real service options — only the methods actually offered, plus accurate terms/pricing when confirmed.
6. Doctor profile — replace the current disclosed demonstration template only when the treating professional’s identity, registration, and publishable qualifications are verified; do not present the AI illustration as the real clinician.
7. Suitability and safety — clinically reviewed constraints and expectations.
8. Patient reviews — conditional on genuine, authorized material and applicable rules; omit when unavailable.
9. FAQ — focused questions based on real visitor concerns.
10. Location and contact — genuine address, hours, directions, staffed contact, and final CTA.
11. Footer — accurate business, privacy, and legal information.

Before/after results, clinic photographs, detailed team galleries, promotions, and price cards are conditional, not compulsory sections. Never insert them without authentic source material.

## 8. Clinical integrity and ethical persuasion

The current page is educational and non-diagnostic. Before adapting it to a real clinic:
- A licensed dentist in the intended jurisdiction must review all clinical copy, suitability language, and safety claims.
- Confirm which treatments are provided by the clinic.
- Do not guarantee shade, duration, or individual results.
- Do not imply that a general FAQ answer is individualized medical advice.
- Do not request dental images or detailed medical history through ordinary marketing chat.
- Do not send sensitive health information to standard advertising or analytics tools.
- Verify local healthcare advertising, professional, privacy, and consumer rules with competent official or legal sources before launch.

## 9. Accessibility, responsive design, and technical requirements

Targets for future production:
- WCAG 2.2 AA review, including keyboard navigation, focus visibility, contrast, semantics, and touch targets.
- Correct ar-SA RTL structure and readable Arabic line lengths.
- No horizontal overflow, clipping, overlap, or inaccessible controls.
- Reduced-motion support.
- Core Web Vitals targets: LCP ≤ 2.5 s, INP < 200 ms, CLS < 0.1.

The page has no canonical URL or LocalBusiness structured data. Those should only be added when a real production domain and verified business details exist.

## 10. Final verification — 24 November 2026

The latest successful RUWA Browser QA run is [GitHub Actions #45506899194](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/45506899194), executed against application commit `9a3b47ec9e321b8994bc5af27f07234046a38873`.

Verified results:
- Approved Hero asset SHA guard: passed.
- Repository consistency and section/order checks: passed.
- Dependency security audit (`npm audit --audit-level=high`): passed.
- Full-page visual capture: nine viewport widths (320, 360, 390, 430, 768, 1024, 1280, 1366, 1440); no horizontal overflow and no duplicate IDs reported.
- Hero above-the-fold checks: nine viewports passed.
- Playwright browser suite: all nine responsive checks passed, including navigation, sticky-header synchronisation, FAQ keyboard (Enter/Space) and pointer interaction, and contact-dialog focus handling.
- Immutable public preview: Chromium checks passed at 1024px, 1280px, and 1440px; zero JavaScript errors were reported in those public-preview checks.
- Social metadata: Open Graph and Twitter metadata accurately disclose that this is a fictional Apex Studio demo; the immutable WebP OG image responds with HTTP 200 and the expected image content type.
- Screenshot and metrics evidence: [artifact 14971429866](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/45506899194/artifacts/14971429866).

The screenshots were also manually inspected at desktop 1440px and mobile 390px and 320px, including the full-page composition, Hero, expectations/suitability area, and footer. The page metadata includes a clear fictional-demo disclosure, title, Arabic description, Open Graph and Twitter preview metadata, theme colour, and favicon; the document declares `lang="ar-SA"` and `dir="rtl"`. The internal anchor audit found no missing targets, and all eight local asset references resolved in the repository. The approved Hero is 768 × 1152, 105,004 bytes, preloaded with high priority; team images are lazy-loaded with intrinsic dimensions.

Limitations:
- This workflow does not run Lighthouse. No Lighthouse performance/accessibility/SEO score is claimed.
- LCP, INP, and CLS have not been measured with field data or a Lighthouse lab run; do not describe Core Web Vitals as verified.
- A canonical URL and LocalBusiness/medical-provider structured data remain intentionally absent because this is a staged fictional demo without a real production domain or verified business identity.
- The GitHub Actions runner emitted deprecation warnings for some action/runtime dependencies; the workflow still completed successfully. These warnings are maintenance notes, not page-runtime failures.

The public portfolio preview is technically and visually suitable for presentation as a disclosed concept. This is not a production-readiness approval for a real dental clinic.

## 11. Final verdict

The RUWA portfolio page has eleven main sections, including the treatment-journey overview and patient-reviews transparency notice. That notice is not social proof: no authentic patient review, rating, or review count has been supplied. Adding fabricated clinicians, patient reviews, ratings, clinic facts, or prices would be a regression. Keep the page honest and focused; publish patient reviews only after genuine material and authorization are verified.

The RUWA implementation remains staged on the feature branch. Do not merge the PR, publish a production site, or activate a contact channel without explicit approval and verified clinic information.
