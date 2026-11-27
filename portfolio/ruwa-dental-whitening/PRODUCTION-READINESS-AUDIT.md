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

The current page has a coherent service-specific education journey. It contains **10 main content sections** plus the shared header, announcement strip, and footer. The visible section markers now run from 01 to 10 in DOM order. The assessment approach is integrated into the four-step treatment journey, while suitability, safety, and realistic expectations share one combined section. The missing items are real-business evidence and an operational conversion destination, not decorative content.

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

| DOM order | ID | Section | Decision | Evidence-based rationale |
|---:|---|---|---|---|
| Header | main-nav | Brand, eight section links, «اتصل بنا» phone button | KEEP / demo contact action | Button opens the disclosed contact-unavailable dialog; no phone number is invented. |
| 01 | top | Hero | KEEP / protect | Explains the whitening subject and presents the approved illustrative portrait and first actions. |
| 02 | causes | Causes of discoloration | KEEP | Provides concise context about surface and deeper colour changes. |
| 03 | options | Whitening options | KEEP / clinical review for a real clinic | General education is not proof that a real clinic offers all listed options. |
| 04 | journey | Assessment and treatment journey | KEEP / consolidated | Integrates assessment, option discussion, implementation, and aftercare into one ordered four-step sequence. |
| 05 | suitability | Suitability, safety, and realistic expectations | KEEP / consolidated / clinical review required | Combines health and timing factors with result variation, possible effects, restoration limits, and aftercare. |
| 06 | team | Dentist/team | KEEP / unchanged demo-only section | The three distinct AI-generated illustrative male portraits remain exactly as approved; no real clinician identity or credentials are claimed. |
| 07 | reviews | Review transparency | KEEP / transparent standards only | Three informational cards explain source verification, explicit permission, and faithful presentation. No hypothetical patient quotations, testimonials, star icons, scores, or review count are shown. |
| 08 | visit | Location-section preview | KEEP / demo-only | Uses a committed abstract Riyadh SVG and says that the real branch address will be added only after verification. The artwork is not a map or clinic location; Google Maps searches Riyadh city-wide only. |
| 09 | faq | Frequently asked questions | KEEP | Six focused native details/summary entries cover session count, result longevity, surface versus internal discoloration, DIY-whitening cautions, temporary sensitivity, and whitening limits for restorations. |
| 10 | consultation | Next step | KEEP / internal links | The section links to FAQ and assessment content. It does not pretend to place a call, send a message, or book an appointment. |
| Footer | — | Portfolio and image disclosures | KEEP | Prevents the sample from being mistaken for a real operating clinic. |

The team section contains three equal demo-only profile cards with distinct AI-generated illustrative male portraits; a clear disclosure appears before the cards and placeholders reserve space for details only after identity and professional credentials are verified. No authentic patient review, testimonial, rating score, or review count is supplied. The review-transparency panel uses three informational cards about source verification, explicit permission, and faithful presentation; hypothetical quotations and decorative rating stars have been removed. The location preview displays an abstract Riyadh illustration, not a real map, clinic, branch, or address; the separate Google Maps action searches the city only. No before-and-after gallery, clinic gallery, pricing section, or hours-of-operation section exists in this page.

## 4. Confirmed current content and interaction behavior

The Hero supporting copy, treatment-options introduction, suitability explanation, realistic-expectations introduction, team preview, review-transparency heading, location preview, final informational CTA, and footer copy were refined for one consistent patient-centered message. Two FAQs were added to address sensitivity and whitening limits for restorations.

- Page language is ar-SA and direction is RTL.
- The page has a document title, meta description, Open Graph title/description/image, and favicon. The metadata now emphasizes teeth-whitening options and suitability while retaining the fictional-demo disclosure.
- The current Hero image is assets/ruwa-hero-90-768.webp.
- The current Hero image alt text and visible caption explicitly identify it as AI-generated and not a real dentist.
- FAQ count: **6 native details entries**.
- Contact controls: **three restored top-of-page contact buttons** (Hero WhatsApp, Hero «اتصل بنا», header «اتصل بنا») plus one floating WhatsApp demo control. The two final CTAs remain internal links.
- WHATSAPP_NUMBER and PHONE_NUMBER remain intentionally empty.
- The floating WhatsApp preview opens the local contact-unavailable dialog, which explicitly states that no real WhatsApp, phone, or booking channel is connected.
- Contact dialog ID: contact-unavailable-dialog.
- The page has no HTML form, lead endpoint, appointment availability, booking confirmation, data collection, or analytics/ad pixels.
- It does not transmit or store visitor details.

The Hero WhatsApp button, Hero call-us button, header call-us button, and floating WhatsApp preview reference contact-unavailable-dialog. They disclose the unavailable demo channels and do not place calls or open WhatsApp. The two final-section CTAs remain internal links. The consistency and browser tests enforce these boundaries.

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

1. Hero — service, genuine clinic context, honest benefit, and one primary action.
2. Verified trust information — only verifiable clinic and professional facts.
3. Understanding the problem — concise reasons and concerns relevant to whitening.
4. Whitening options — only the methods actually offered, plus accurate terms/pricing when confirmed.
5. Assessment and treatment journey — what is assessed, how options are discussed, and how the plan is followed.
6. Suitability, safety, and realistic expectations — clinically reviewed constraints, possible effects, and limitations.
7. Doctor profile — only when the treating professional’s identity, registration, and qualifications are verified.
8. Patient reviews — only when genuine, authorized material and applicable rules permit publication; otherwise omit.
9. FAQ, location/contact, and footer — answer remaining questions and provide verified business, privacy, and legal information.

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

## 10. Previous verification snapshot — 24 November 2026

The latest successful run before the section consolidation was [GitHub Actions #45506899194](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/45506899194), executed against application commit `9a3b47ec9e321b8994bc5af27f07234046a38873`.

Verified results:
- Approved Hero asset SHA guard: passed.
- Repository consistency and section/order checks: passed on the pre-consolidation structure; rerun required for the current nine-section version.
- Dependency security audit (`npm audit --audit-level=high`): passed.
- Full-page visual capture: nine viewport widths (320, 360, 390, 430, 768, 1024, 1280, 1366, 1440); no horizontal overflow and no duplicate IDs reported.
- Hero above-the-fold checks: nine viewports passed.
- Historical Playwright browser suite: all nine responsive checks passed on the previous page structure. A new run is required for the consolidated sections and persistent-on-selection menu behavior.
- Immutable public preview: Chromium checks passed at 1024px, 1280px, and 1440px; zero JavaScript errors were reported in those public-preview checks.
- Social metadata: Open Graph and Twitter metadata accurately disclose that this is a fictional Apex Studio demo; the immutable WebP OG image responds with HTTP 200 and the expected image content type.
- Screenshot and metrics evidence: [artifact 14971429866](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/45506899194/artifacts/14971429866).

The screenshots were also manually inspected at desktop 1440px and mobile 390px and 320px, including the full-page composition, Hero, expectations/suitability area, and footer. The page metadata includes a clear fictional-demo disclosure, title, Arabic description, Open Graph and Twitter preview metadata, theme colour, and favicon; the document declares `lang="ar-SA"` and `dir="rtl"`. The internal anchor audit found no missing targets, and all eight local asset references resolved in the repository. The approved Hero is 768 × 1152, 105,004 bytes, preloaded with high priority; team images are lazy-loaded with intrinsic dimensions.

Limitations:
- This workflow does not run Lighthouse. No Lighthouse performance/accessibility/SEO score is claimed.
- LCP, INP, and CLS have not been measured with field data or a Lighthouse lab run; do not describe Core Web Vitals as verified.
- A canonical URL and LocalBusiness/medical-provider structured data remain intentionally absent because this is a staged fictional demo without a real production domain or verified business identity.
- The GitHub Actions runner emitted deprecation warnings for some action/runtime dependencies; the workflow still completed successfully. These warnings are maintenance notes, not page-runtime failures.

The results above are historical and predate the section consolidation; they do not verify the current branch. The current consolidated page must pass the latest browser and consistency workflows before this audit can be marked current. The public portfolio preview is a disclosed concept only, not a production-readiness approval for a real dental clinic.

## 11. Final verdict

The RUWA portfolio page contains ten main sections in DOM order, including the consolidated treatment journey and safety/expectations section. The protected team portraits remain unchanged, but the disclosure now appears before the three illustrative profile cards. The patient-review presentation has been changed to three transparency-standard cards; hypothetical review-style phrases and decorative stars have been removed. No authentic patient review, rating, or review count has been supplied. The Hero, header, and final CTAs use truthful internal links; only one floating WhatsApp demo preview remains, with a disclosure dialog. Adding fabricated clinicians, patient reviews, ratings, clinic facts, or prices would be a regression.

The RUWA implementation remains staged on the feature branch. The Hero and header CTAs navigate internally to educational sections; the final CTAs link to FAQ and assessment content. One floating WhatsApp demo control opens a disclosure dialog only. Do not merge the PR, publish a production site, or activate a contact channel without explicit approval and verified clinic information.
