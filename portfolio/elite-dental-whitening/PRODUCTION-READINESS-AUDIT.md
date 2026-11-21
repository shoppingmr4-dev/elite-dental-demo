# RUWA Dental Whitening — Production Readiness Audit

**Audit date:** 21 November 2026  
**Audited branch baseline:** `f51745f2320312c63847a54ae12045178340e100`  
**Working branch:** `feature/elite-whitening-world-class-2026`  
**Pull request:** #9 (open draft; not merged)  
**Target file:** `whitening-2026.html`  
**Verdict:** **NOT READY — real-clinic and conversion blockers remain.**

## 1. Executive finding

RUWA is documented in this repository as a fictional Apex Studio portfolio concept, not a commissioned or operating dental clinic. It is not truthful to relabel the existing page as a real clinic website, remove its demo disclosure, add invented proof, or enable a fabricated booking flow.

The present page has a coherent patient-education journey, but it is not yet a production landing page for a real dental business. Its principal gaps are the lack of real clinic identity, verified medical authority, authentic commercial/service details, location/contact information, a working appointment destination, and privacy/measurement configuration.

**No changes were made to `whitening-2026.html` in this audit.** Without the missing business facts, restructuring the visible page into a purported real clinic offer would either create empty sections or misrepresent the business. Keep the portfolio disclosure and current preview interactions until verified client information is supplied.

## 2. Approved Hero image — locked and verified

The approved Hero image is protected:

- Path: `assets/ruwa-hero-90-768.webp`
- Git blob SHA at audit baseline: `11209e185ca8d671f74e54eda8fdefb1d42382d2`
- File size: **105,004 bytes**
- Intrinsic dimensions: **768 × 1152**
- HTML element: `.hero-portrait`
- Parent figure: `figure.hero-visual`
- Declared width/height: **768 / 1152**
- Loading priority: `loading="eager"`, `fetchpriority="high"`
- Fit and focal position: `object-fit: contain`, `object-position: center bottom`

The image binary, its HTML element, caption, CSS, framing, crop, size, transform and position were not edited. A CI asset-SHA guard and Playwright assertions were added to protect the approved image in future changes.

**Provenance discrepancy:** the current HTML alt text and caption say the portrait is AI-generated. Older design documentation attributed a Pexels photograph (Emily Gaibor, photo ID 37458050) to the Hero. These statements conflict. The image is preserved, but its provenance should be confirmed by the project owner before any stock-credit or commercial-use claim is made. Continue to disclose it as illustrative and never present it as an actual member of a real clinic's team.

## 3. Existing page inventory and disposition

The current structure contains eight main content sections, plus the sticky header and footer.

| Existing order | Section | Purpose and audit decision |
|---|---|---|
| Header | Brand, five navigation links, WhatsApp-labelled action | Keep the compact navigation. The button is a preview trigger, not a live contact destination. |
| 01 | Hero — «اكتشف خيارات تبييض الأسنان لابتسامة أكثر إشراقًا» | Keep the approved headline/image composition for the portfolio version. A production version needs verified clinic name, geography and actual service details; do not edit the image. |
| 02 | Assessment approach | Keep. It explains evaluation before treatment selection and helps set responsible expectations. |
| 03 | Causes of discoloration | Keep, but review with a licensed dentist before clinic use. It provides relevant context; it should not expand into a long generic article. |
| 04 | Whitening options | Keep subject to confirming which methods the actual clinic offers. The current copy is general education, not proof that RUWA provides these services. |
| 05 | Suitability and safety | Keep. Clinically review all claims for the target jurisdiction. |
| 06 | Realistic expectations | Keep. Consider merging overlapping material with suitability only after clinical review; it currently has a distinct purpose. |
| 07 | FAQ | Keep. The actual HTML contains **four** native `details` entries, not six as older project notes stated. |
| 08 | Consultation/inquiry preparation | Keep only as an explicitly labelled portfolio interaction. It is not a working lead form or booking service. |
| Footer | Portfolio disclosure and image disclosure | Keep while this remains a fictional portfolio concept. |

The current sequence—Hero → assessment → causes → options → suitability → realistic expectations → FAQ → inquiry—is not demonstrably scattered. It follows a clinically understandable explanation path. Adding empty doctor, review, price, location or offer sections without authentic source information would reduce trust rather than improve conversion.

## 4. Current conversion and technical state

### CTA and inquiry behavior

- The header and Hero WhatsApp-labelled controls open the same local explanatory HTML dialog.
- The dialog explicitly says this is a portfolio preview and that no conversation is opened or visitor data transmitted.
- The consultation panel includes a topic selector and a button that prepares/copies a message.
- There is **no** HTML `<form>`, form submission endpoint, live WhatsApp URL, telephone link, real booking system, or confirmed appointment event.
- A local copy action is not a lead submission. A dialog opening is not a WhatsApp click or a booking.

These interactions must not be represented as production conversions.

### Business proof and content

The repository does not supply verified:
- Operating clinic name or registered business identity.
- City, address, map location or opening hours.
- Telephone number or official WhatsApp Business number.
- Named dentists, professional registration/licences or qualifications.
- Authentic clinic/team photographs.
- Actual service menu and treatment availability.
- Prices, package contents, promotion or offer terms.
- Patient reviews, ratings or outcome evidence.
- Booking-system URL or appointment inventory.

Do not invent or visually imply these items.

### Privacy, analytics and SEO

- No real lead collection currently takes place.
- No clinic privacy policy, data retention notice, consent management, or form destination is supplied.
- No GA4, Google Ads conversion ID, Meta Pixel ID, or corresponding configured events were found in the page.
- The page has a title, meta description, Open Graph title/description/image, and favicon.
- A canonical URL and structured local-business data are not configured. Add them only after the production domain and verified clinic facts exist.
- A service landing page should not transmit dental history, diagnoses, photos or other sensitive health information to advertising/analytics platforms.

## 5. Production blockers — required inputs

| Priority | Required input | Why it is needed |
|---|---|---|
| P0 | Official clinic identity, target country/city and approved brand details | Cannot truthfully identify the business or localize legal requirements without it. |
| P0 | Verified official phone / WhatsApp Business / real booking destination | The page needs a functioning, monitored conversion route. |
| P0 | Actual service scope and available whitening methods | Existing educational options do not establish which services a real clinic provides. |
| P0 | Clinical review by a licensed dentist in the target jurisdiction | Medical claims, safety statements and treatment information require professional approval. |
| P1 | Clinic address, hours, directions and approved location/map | Needed for local relevance and useful clinic contact information. |
| P1 | Dentist names, accurate titles, credentials and permission to publish | Needed before any medical-team or authority section is created. |
| P1 | Real clinic photographs and licence/consent records | Needed before showing the clinic or staff as authentic. |
| P1 | Actual fees and offer terms, if a campaign promotes a price or discount | Prevents misleading commercial claims. |
| P1 | Privacy notice, data controller/contact, retention and secure inquiry handling | Needed before collecting personal information. |
| P2 | Analytics accounts, measurement IDs, event definitions and consent rules | Needed to measure real conversions without mistaking clicks for confirmed bookings. |
| P2 | Legal/regulatory review and campaign-owner authorization | Needed before paid advertising and publication. |

Patient testimonials and before/after images are **not presumed necessary**. Their use must be checked against the rules of the actual target jurisdiction and must never be fabricated.

## 6. Recommended production information architecture

Once the P0/P1 inputs exist, use this conversion-oriented sequence. Do not create empty sections to fill the outline.

1. **Hero:** protected approved image, the actual service, clear geography, honest benefit and one primary CTA.
2. **Verified clinic trust strip:** only substantiated facts, licence/credentials or clinic facts that are permissible to publish.
3. **Actual service and offer:** scope, what's included, fees and conditions only when confirmed.
4. **Patient journey / assessment:** what happens before a treatment choice and how the appointment proceeds.
5. **Treatment options:** only methods offered by the real clinic; condense the causes-of-discoloration explanation if it interrupts the service journey.
6. **Suitability, safety and realistic expectations:** keep clinically important limits and adverse-effect information; merge duplicate paragraphs/cards where that improves clarity.
7. **FAQ:** four current topics may be retained and expanded only for real, recurring patient objections.
8. **Location and contact:** address, hours, directions, verified contact and final CTA.
9. **Footer:** legal/identity/privacy information that is accurate for the business.

A doctor/team profile, patient evidence, pricing block or promotional offer is conditional on genuine source material and applicable rules. Do not force these into the page.

## 7. Paid-advertising readiness

Google Ads' official guidance emphasizes relevance between ad and landing page, mobile usability, ease of contact, simple navigation, quick loading, important information near the top, and useful original content. Its destination requirements also require a functional, accessible, useful destination that is easy to navigate and not misleading.

References:
- [Google Ads — Optimize your ads and landing pages](https://support.google.com/google-ads/answer/6238826)
- [Google Ads — Destination requirements](https://support.google.com/adspolicy/answer/6368661)

This is a design/readiness review, not an approval or guarantee of campaign acceptance. The present RUWA portfolio page is not a live business destination and must not be launched as one.

The design-system file identifies Saudi Arabic as the intended locale, but no actual operating clinic or target campaign jurisdiction has been confirmed. Obtain jurisdiction-specific legal/healthcare-advertising review before publication. If Saudi Arabia is confirmed, check current MOH/SFDA requirements and PDPL/privacy requirements with the responsible professional; do not assume a generic Google Ads review is sufficient.

## 8. Accessibility and performance

Use WCAG 2.2 AA and WAI-ARIA guidance as review references:
- [WCAG 2.2](https://www.w3.org/TR/wcag/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

Core Web Vitals targets are:
- LCP: ≤ 2.5 seconds.
- INP: < 200 milliseconds.
- CLS: < 0.1.

These are targets, not measured outcomes in this audit.

## 9. QA baseline and protection added

Baseline evidence before this audit:
- GitHub Actions run [#44843573088](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/44843573088) succeeded on baseline commit `f51745f2320312c63847a54ae12045178340e100`.
- The existing Playwright suite checked the page at 320, 360, 390, 430, 768, 1024, 1280, 1366 and 1440 CSS-pixel widths.
- That run did not include a Lighthouse step; no Lighthouse score is claimed for it.

This audit adds:
1. A CI guard that fails if the Git blob SHA of `assets/ruwa-hero-90-768.webp` differs from the approved baseline SHA.
2. Playwright assertions that preserve the image's source, declared and intrinsic dimensions, parent `figure.hero-visual`, and focal position.
3. Additional report fields recording the Hero image/container geometry during responsive browser QA.

The audit does not claim a successful test for the new guard until the new GitHub Actions run for the resulting commit finishes successfully.

## 10. Skills and tool availability

The tool skill registry available in this execution exposed the plugin-management skill only. The requested Anthropic Frontend Design, UI/UX Pro Max and Vercel Web Interface Guidelines were not available as installable skill packages in this session, so this audit does not claim they were loaded.

The repository does include Playwright and an established Chromium/GitHub Actions test workflow. Official Google Ads and W3C references above were consulted as external standards.

## 11. Final verdict

**NOT READY — essential real-business and conversion requirements are missing.**

The approved Hero image remains protected. The existing page structure is coherent enough to retain as the current portfolio version. The next production stage depends on verified clinic details, real service/clinical approval, and an operational contact/booking destination—not on adding decorative sections or replacing approved design work.
