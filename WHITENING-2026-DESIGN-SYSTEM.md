# Apex Studio — RUWA Dental Whitening Design and Implementation System

**Project:** fictional RUWA dental-whitening portfolio concept  
**Current source of truth:** whitening-2026.html  
**Working branch:** feature/elite-whitening-world-class-2026  
**Pull request:** #9 (draft; not merged)  
**Locale:** ar-SA · RTL  
**Status:** portfolio preview only; not a live clinic website

## 1. Purpose and source-of-truth rules

This document describes the current implementation, not a proposed or historical design.

There is one maintained RUWA implementation: **whitening-2026.html**. The files **whitening-preview.html** and **preview/ruwa/index.html** are compatibility redirect pages and must not contain a second copy of the landing page.

The root **index.html** is a minimal redirect to **whitening-2026.html**. It contains no second website implementation, legacy branding, or build dependencies.

RUWA is a fictional portfolio identity. No real clinic, dentist, employee, qualification, patient, review, rating, treatment result, price, address, opening time, phone number, or booking service is represented.

## 2. Brand and visual direction

**Direction:** Modern Clinical Editorial — contemporary, clear, calm, responsive, and service-focused.

| Token | Value | Role |
|---|---|---|
| Canvas | #F4F7FA | Main background |
| Paper | #FFFFFF | Content surfaces |
| Ink | #142D38 | Primary text |
| Ink 2 | #304A54 | Secondary text |
| Muted | #5C6D72 | Supporting text |
| Line | #DCE5EA | Borders and dividers |
| Teal | #187A80 | Primary action and key accent |
| Deep teal | #115A60 | Hover and emphasis |
| Coral | #B85D4A | Small editorial detail |
| Pale blue | #EAF3F8 | Quiet background tint |
| WhatsApp green | #25D366 | Icon recognition only; not the button background |

Do not add decorative trust badges, ratings, clinic logos, or medical credentials. Do not imitate proprietary artwork or copy another brand's page.

## 3. Typography and layout

- Arabic headings, navigation, interface, buttons, and body: locally hosted IBM Plex Sans Arabic, shared consistently across the full page.
- Preserve the existing typographic hierarchy, sizes, line heights, and weights; change the family, not the layout.
- Latin RUWA wordmark: locally hosted Cormorant Garamond, italic 500.
- Arabic copy remains natural, concise, and localized for a Saudi Arabic audience.
- Page direction is RTL; layout, icon placement, navigation, and focus order must remain correct for Arabic reading.
- Keep the first screen clear: one service proposition, supporting explanation, primary action, secondary contact option, and approved image.
- Maintain responsive behavior rather than using fixed desktop-only dimensions.
- Respect prefers-reduced-motion and preserve visible keyboard focus.

## 4. Approved Hero portrait — protected

- Asset: assets/ruwa-hero-90-768.webp
- Approved Git blob SHA: 11209e185ca8d671f74e54eda8fdefb1d42382d2
- File size: 105,004 bytes
- Intrinsic size: 768 × 1152
- HTML class: hero-portrait
- Current presentation: contained image, bottom-centered focal position, eager loading, and high fetch priority.

Do not add a separate demo sentence beneath the Hero contact buttons. Preserve the fictional-portfolio disclosure in the footer and page metadata. The Hero portrait caption must continue to identify the dentist portrait as an AI-generated illustration, not a real dentist.

The current page alt text and visible disclosure state that this is an AI-generated illustrative dentist portrait, not a real dentist. Keep that disclosure. Never assign a real name, credential, clinic affiliation, patient identity, or testimonial to this image.

The approved file, its HTML element, figure placement, dimensions, focal position, framing, transform, and loading priority are protected. The source image's earlier documentation was inconsistent; the old Pexels-based preview has been retired. Do not add an external stock-photo credit to this image.

## 5. Current page architecture — exactly 10 content sections

Header and announcement strip:
- RUWA wordmark and Arabic descriptor.
- Eight navigation links to the visitor journey, including the treatment journey, patient-reviews transparency note, and city-level location section.
- One phone-labelled header action: «اتصل بنا».
- Mobile menu with aria-expanded state and keyboard behavior.

Content sections in actual DOM order:

| DOM order | ID | Section | Current role |
|---:|---|---|---|
| 01 | top | Hero | Explain the whitening subject and give the first contact action |
| 02 | causes | Causes of discoloration | Explain surface staining and deeper colour changes |
| 03 | options | Whitening options | Explain general options without claiming they are RUWA clinic services |
| 04 | journey | Assessment and treatment journey | Combine oral-health assessment, option discussion, agreed procedure, and aftercare into four ordered steps |
| 05 | suitability | Suitability, safety, and realistic expectations | Combine health/timing factors with result variation, potential effects, restoration limits, and aftercare |
| 06 | team | Dentist/team | Preserve the three distinct AI-generated illustrative male portrait cards exactly as approved; no real clinician identity or credentials are claimed |
| 07 | reviews | Patient reviews | Preserve the transparent demo-only notice exactly as approved; no patient quotes, names, ratings, counts, or AggregateRating data are invented |
| 08 | visit | Clinic location | Identify Riyadh, Saudi Arabia at city level only; provide an official keyless Google Maps satellite-view link; no clinic address or pin is invented. Embedded Maps Embed API requires an authorized API key |
| 09 | faq | Frequently asked questions | Answer two focused, non-redundant visitor questions |
| 10 | consultation | Final contact | Offer WhatsApp and phone actions with an explicit inactive state |

The assessment content now lives inside the first two steps of the four-step treatment journey. Suitability and safety remain together with a nested realistic-expectations panel, preserving its four existing patient-information cards. The patient-reviews section remains after the dentist/team section and before the city-level Riyadh location panel, and is unchanged: it is an editorial transparency panel, not a testimonial feed. The location panel identifies Riyadh, Saudi Arabia without inventing a neighborhood, street address, branch, or map pin. Its Google Maps action opens the official satellite map in a new tab; it is not embedded in-page because no Maps Embed API key is configured. It states that no verified patient reviews are available in this fictional demo and lists three publication principles (verifiable source, explicit permission, and faithful presentation). It includes no patient names, photos, quotes, star ratings, review counts, or Review/AggregateRating structured data. The footer preserves the fictional portfolio disclosure and AI-image disclosure. The team section remains unchanged and contains three equal demonstration cards using distinct portraits extracted from an existing AI-generated RUWA concept image; it contains no real doctor identity or professional credentials.

## 6. FAQ source of truth

There are **2 native HTML details/summary FAQ entries** in the current page. They cover session count and result longevity without repeating the main sections. The tests assert this exact count.

Do not describe the current page as having six FAQs. Do not add duplicate questions simply to increase page length. Add a question only when it answers a real, relevant visitor concern and the answer has been clinically reviewed.

## 7. Contact behavior — exact current state

There are **3 WhatsApp actions and 3 phone actions**:

- Header: phone action labelled «اتصل بنا».
- Hero: primary WhatsApp action.
- Floating control: circular WhatsApp button, shown only while the Hero WhatsApp action is outside the viewport.
- Hero secondary action: phone.
- Final contact area: WhatsApp and phone.

The central JavaScript configuration contains empty values for WHATSAPP_NUMBER and PHONE_NUMBER. With those values empty:

- No WhatsApp chat opens.
- No tel: call begins.
- No external number or live destination is fabricated.
- Each control uses the shared central contact handler and opens the native contact-unavailable dialog while its number is empty. The floating button is controlled by IntersectionObserver and leaves the keyboard tab order while hidden.
- The dialog identifies which channel is not activated.
- The dialog supports its close controls, Escape, backdrop click, focus placement, focus restoration, and temporary background scroll lock.
- The page does not collect or transmit visitor data.

Every control that uses aria-controls must reference an element ID that exists. The contact controls must reference contact-unavailable-dialog; the mobile menu toggle must reference main-nav.

There is no HTML form, lead endpoint, appointment inventory, booking confirmation, message-copy feature, or actual clinic contact channel in this version. Do not call a dialog opening a booking or conversion.

## 8. Clinical and trust-content boundaries

The copy is general educational information, not diagnosis or individualized clinical advice. It describes possible options and limitations without guaranteeing outcomes.

Before adaptation for a real clinic:
- A licensed dentist in the intended jurisdiction must review all medical claims and safety wording.
- Verify which treatments the clinic actually offers.
- Verify all professional identities, roles, qualifications, and licences before publishing them.
- Use only genuine, authorized testimonials or results if local rules permit them.
- Do not fabricate ratings, review counts, before/after photos, clinical outcomes, equipment, facilities, discounts, or prices.
- Do not ask visitors to send dental photographs or sensitive health details through an ordinary marketing chat.

Authentic doctor identity and verified professional credentials, genuine reviews, clinic photographs, pricing, maps, and opening hours remain conditional future additions. The current reviews panel explains the publication standard without implying that real reviews exist; actual reviews may be added only when genuine, verifiable, authorized material is supplied. The current team card is only a disclosed visual template.

## 9. Engineering constraints

- Standalone static HTML/CSS/JavaScript page.
- Keep GitHub Pages compatibility; do not require a server runtime or database.
- Keep all current work on the RUWA feature branch.
- Do not modify main, the legacy root index, deployment configuration, or the approved Hero asset without explicit project approval.
- Do not introduce a framework or heavy third-party script unless a measured requirement justifies it.
- Avoid analytics or advertising scripts that would transmit health-related information.
- Do not add local-business structured data until real business facts and a production domain are verified.

## 10. Quality and verification

The dedicated workflow is .github/workflows/whitening-2026-browser-qa.yml. It verifies:
- Approved Hero image Git blob SHA.
- Full-page responsive rendering and section captures.
- Hero content visibility before scrolling.
- Playwright interaction checks across mobile, tablet, laptop, and desktop widths.
- Internal navigation, mobile menu, floating header, FAQ open/close, contact actions, modal focus behavior, and no horizontal overflow.
- The public immutable preview in Chromium.

The latest successful browser QA run at this audit was [GitHub Actions run 45506899194](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/45506899194) on application commit `9a3b47ec9e321b8994bc5af27f07234046a38873`. All configured steps passed: the protected Hero image check, repository consistency, dependency audit, full-page visual capture at nine viewport widths, Hero fold checks, Playwright interaction checks at nine widths, and public-preview Chromium checks at 1024px, 1280px, and 1440px. The public-preview test also verified truthful fictional-demo Open Graph/Twitter metadata and confirmed that the immutable WebP social-preview image resolves successfully with HTTP 200. Evidence is preserved in [artifact 14971429866](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/45506899194/artifacts/14971429866). The workflow does not execute Lighthouse; no Lighthouse score or Core Web Vitals result is asserted.

## 11. Redirect and deployment behavior

- Canonical maintained page: whitening-2026.html
- Legacy alias: whitening-preview.html → whitening-2026.html
- Public path alias: preview/ruwa/index.html → ../../whitening-2026.html

GitHub Pages deploys from main only. The working branch and draft PR are not a production deployment.
