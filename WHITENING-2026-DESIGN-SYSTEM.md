# Apex Studio — RUWA Dental Whitening Landing Page

**Project status:** Expanded landing page in staged review; retesting the new educational content  
**Page:** `whitening-2026.html`  
**Branch:** `feature/elite-whitening-world-class-2026`  
**Locale:** Saudi Arabic, right-to-left  
**Project type:** Fictional-clinic portfolio demonstration, not commissioned client work

## Purpose and positioning

Apex Studio created this concept to demonstrate a considered Arabic landing-page experience for a dental whitening service. The page explains why an oral-health assessment should precede treatment selection, outlines common professional options and limitations, answers common questions, and provides a transparent inquiry-preparation interaction.

The clinic name **RUWA | رُواء لطب الأسنان** is fictional and created solely for this portfolio concept. It is not a real clinic name cleared for commercial use, a completed client engagement, or a live booking service.

## Design direction

**Modern Clinical Editorial.**

The page uses a calm light clinical canvas, deep blue-green typography, a restrained teal accent, and limited warm details. The visual hierarchy starts with the protected headline and hero image, moves to patient education, then ends with a clear next step.

Transferable reference principles:
- **Apple:** deliberate image composition, whitespace, hierarchy, and visual restraint.
- **Stripe:** clear value proposition and a focused primary visitor action.
- **Notion:** simple components and consistent visual language.
- **Linear:** careful spacing, states, focus behavior, and motion details.
- **Vercel:** lightweight implementation and dependable technical execution.

These are directional references only. Do not copy proprietary artwork, page layouts, or brand identities.

## Brand identity

- Fictional brand name: **رُواء | RUWA** (working portfolio identity; trademark availability has not been legally cleared).
- Arabic name: **رُواء لطب الأسنان**.
- English wordmark: **Ruwa**, set in **Cormorant Garamond** (500 italic) as a restrained serif signature; loaded from Google Fonts with `display=swap`. The Arabic descriptor remains in IBM Plex Sans Arabic.
- Logo mark: preserve the exact supplied reference composition: the deep-navy stylized **R** and the turquoise crescent smile placed inside its open bowl. Do not separate, reposition, reinterpret, or redraw these forms.
- Header logo is transparent and unboxed. The favicon uses the same transparent PNG mark.
- Primary logo asset: `assets/ruwa-mark.png`, containing the supplied mark with its white background removed and original proportions preserved.
- Palette: deep ink `#142D38` and teal `#187A80`, matching the landing page system.
- Keep the logo crisp at small sizes; do not add shadows, gradients, bevels, or decorative effects.
- Keep the English wordmark restrained and legible; avoid highly decorative handwritten scripts. Only the English wordmark uses Cormorant Garamond.

## Current design tokens

| Token | HEX | Use |
|---|---|---|
| Canvas | `#F4F7F6` | Main page background |
| Paper | `#FFFFFF` | Content surfaces |
| Ink | `#142D38` | Primary text and dark contact panel |
| Ink 2 | `#304A54` | Secondary text |
| Muted | `#5C6D72` | Supporting text |
| Line | `#DDE6E3` | Borders and separators |
| Teal | `#187A80` | Primary action and key accents |
| Deep teal | `#115A60` | Hover and deeper accents |
| Warm accent | `#B85D4A` | Small editorial details |
| Soft mint | `#E3F2E9` | Subtle highlight |
| WhatsApp green | `#25D366` | Brand icon accent only in the portfolio demo; no live WhatsApp destination is configured |

The identity is intentionally restrained. Avoid reintroducing the previous cobalt/coral/acid-lime mix or decorative elements that compete with the headline and primary action.

## Typography

- Arabic display/headings: **Cairo**, self-hosted locally in WOFF2 weights 700 and 800.
- Body, navigation, controls, and supporting text: **IBM Plex Sans Arabic**, loaded locally.
- Numeric and Latin-only labels stay on the body stack so Arabic-only Cairo files are not requested for Latin glyphs.
- Fallbacks: Tahoma and sans-serif.
- Current hero headline: **«اكتشف خيارات تبييض الأسنان لابتسامة أكثر إشراقًا»**. The three-tier hierarchy sets «تبييض الأسنان» as the dominant service phrase, with a quieter lead-in and a teal-highlighted benefit phrase; Cairo 800 is the approved display face.
- Type scale: hero 42–72px, section headings 30–44px, card headings 17–19px, body 14–16px, controls 13–14px, metadata 10–13px.
- Arabic display text uses neutral letter spacing (no negative tracking) and generous line height.
- Keep Arabic copy natural, concise, readable on mobile, and appropriate for Saudi visitors.

## Image art direction

- Hero image: Emily Gaibor / Pexels, photo ID 37458050.
- Source: https://www.pexels.com/photo/dentist-in-a-modern-dental-office-37458050/
- Image role: illustrative stock portrait of a male dentist in a contemporary dental office.
- The page explicitly discloses that the photo is not the actual dentist or staff of the fictional clinic.
- Keep the visible credit and stock-photo disclosure. Never present this image as a real employee, patient, testimonial, or treatment result.
- Use a concise, unrotated light disclosure label: «صورة توضيحية من Pexels؛ لا تمثل طبيبًا أو موظفًا بالعيادة.» Keep the extra vertical decorative note off mobile screens.
- Do not create before/after claims or imply guaranteed clinical outcomes.

## Page architecture

1. Slim announcement strip with a single concise whitening message, without repeating the clinic name or decorative glyphs.
2. Sticky branded navigation with a white translucent surface, refined spacing, and a compact rounded menu panel on tablet and phone.
3. Hero: three-tier service-first headline, supporting explanation, a primary «تواصل عبر واتساب» demo CTA with a WhatsApp icon, a secondary guide link, and an editorial image with a quiet stock-photo disclosure. Both primary CTAs open the same transparent portfolio-preview dialog.
4. Assessment approach: understand the case, explain possible options, and identify the next step.
5. Causes of discoloration: surface staining compared with deeper changes in natural tooth color.
6. Treatment options: in-office professional whitening, dentist-supervised custom take-home trays, and care for surface staining.
7. Suitability: oral health, sensitivity or cracks, existing restorations, and pregnancy/breastfeeding considerations.
8. Realistic expectations: possible temporary sensitivity, gum irritation, individual variation, and the fact that restorations do not whiten like natural teeth.
9. FAQ: six concise questions with native, keyboard-operable disclosure controls.
10. Inquiry-preparation panel and footer with the fictional-demo disclosure and image attribution.

The aim is to answer real visitor questions without adding fake proof points, fabricated clinic credentials, testimonials, ratings, or statistics.

## Clinical content guardrails

The educational copy is intentionally general and non-diagnostic:
- A dental examination and history help identify causes of discoloration and factors that may affect suitability.
- Options may include professionally administered whitening, dentist-supplied custom take-home trays, and management of surface stains. These are not interchangeable and are not suitable for everyone.
- Whitening toothpastes mainly help remove some external stains; they should not be described as equivalent to professional bleaching.
- Only natural teeth change shade with bleaching; fillings, crowns, veneers, and implant restorations do not whiten in the same way.
- Temporary tooth sensitivity and gum irritation are possible adverse effects.
- Untreated dental disease or unhealthy gums may need attention before cosmetic whitening is considered.
- Pregnancy and breastfeeding are presented as matters to discuss with a clinician; the NHS advises against whitening during those periods.
- Never promise an exact shade, a guaranteed outcome, or a fixed duration for every patient.

The page includes educational links to the NHS and American Dental Association. All medical copy must be reviewed by a licensed dentist in the intended jurisdiction before use by a real clinic.

Primary references:
- NHS, “Teeth whitening” (reviewed 19 August 2025): https://www.nhs.uk/tests-and-treatments/teeth-whitening/
- American Dental Association, “Whitening” (updated 11 November 2026): https://www.ada.org/resources/ada-library/oral-health-topics/whitening
- ADA public guide, “Teeth Whitening”: https://www.mouthhealthy.org/all-topics-a-z/teeth-whitening

## Interaction behavior

- Navigation links follow the visitor journey: assessment steps, causes of discoloration, whitening options, suitability, and FAQs. The wordmark links back to the top, so no duplicate “Home” link is needed; the assessment CTA remains a separate, clearly labelled button.
- The compact navigation supports open/close state, `aria-expanded`, Escape-to-close, and closes after a selection.
- FAQ entries use native `details` and `summary` elements.
- The header and hero CTAs both use **«تواصل عبر واتساب»** with the recognizable WhatsApp brand glyph, while retaining RUWA's teal button surface (`#187A80`).
- Both CTAs are native buttons that open one shared HTML `dialog`; neither contains a phone number, external URL, or live WhatsApp destination.
- The dialog is visibly labeled as an Apex Studio portfolio preview and explains that a real clinic's approved WhatsApp Business account will be connected at handoff.
- The dialog explicitly states that no conversation is opened and no visitor data is sent or stored in this demo.
- The dialog supports close buttons, Escape, backdrop click, focus placement on its heading, and focus restoration to the exact trigger. Background scrolling is locked only while the dialog is open.
- A live WhatsApp destination must only be added after the real clinic supplies and approves its verified business contact details and response process.
- Do not describe the current interaction as a live message, clinical assessment, or completed booking.

## Live-clinic contact-channel strategy (future production use)

For this dental-whitening landing-page use case, the preferred default primary channel is **the clinic's verified official WhatsApp Business account**, but only when the clinic confirms that reception actively monitors it during published hours and has a clear response owner. The live CTA should then read **«تواصل عبر واتساب»**, open the verified click-to-chat destination, and use a recognizable WhatsApp mark. Keep the button surface in RUWA teal (`#187A80`) so the page retains its visual identity; the channel label and icon provide the functional distinction. Do not use the WhatsApp green token merely to make the button more noticeable.

This is a strategic default, not a claim that WhatsApp will always produce the highest conversion. If the clinic cannot answer messages reliably, do not make WhatsApp the primary action. Use a real online booking system instead only when it displays genuine appointment availability and completes the booking with a clear confirmation; otherwise use a verified, staffed phone line with a `tel:` link. Never label an inquiry as a confirmed appointment.

Before enabling a live contact CTA, obtain the clinic's approved destination and confirm ownership, operating hours, response responsibility, and the exact post-click behavior. Do not invent numbers or point to a personal/unmonitored account.

Use chat for basic service questions and appointment coordination, not as a substitute for clinical assessment. Do not prompt visitors to send dental photographs, detailed medical histories, diagnoses, or other sensitive health information through an ordinary chat flow. Saudi SDAIA guidance identifies data related to an individual's health as sensitive personal data under the PDPL and describes additional safeguards for processing it: https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/PDPL/. Any collection of clinical information must use a clinic-approved, privacy-compliant channel and workflow.

Until real clinic contact details and operational readiness are provided, keep both demo CTAs **«تواصل عبر واتساب»** opening the local explanatory preview dialog only. Do not attach a fake `wa.me` URL or imply that a conversation has started.

## Engineering constraints

- Preserve static HTML/CSS/JavaScript and the existing GitHub Pages architecture.
- Reuse local font assets.
- Avoid unnecessary dependencies or UI frameworks.
- Keep all work on the feature branch.
- Do not alter `main`, `index.html`, production routing, or live deployment settings without explicit approval.
- Do not invent clinic staff, credentials, address, reviews, ratings, patient counts, or treatment results.

## Quality assurance

The prior approved preview revision passed Playwright and Lighthouse. The expanded page adds five educational sections, six FAQ entries, additional navigation targets, tablet navigation behavior, and the WhatsApp portfolio-preview dialog. The browser QA script covers the expanded experience.

**Verified:** Playwright and Lighthouse passed on code commit `c1a4b051b95ded4f1a29a39bbf2add94ebdb6ca2`. Browser checks passed at 360×800, 390×844, 768×1024, and 1440×900; both Cairo and IBM Plex Sans Arabic loaded locally, with no browser errors or horizontal overflow. Lighthouse: mobile Performance 96; desktop Performance 100; Accessibility, Best Practices, and SEO 100 on both. The following documentation-only commit does not change the tested page or test script. Record the new revision and results here only after the new workflow completes successfully.

**Latest CTA verification (14 November 2026):** GitHub Actions run [#120](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/43649799213) passed on code commit `d1daab495eb9c2a4fc64f4957f7603a722301f66`. Playwright passed at 360×800, 390×844, 768×1024, 1024×900, and 1440×900, including both WhatsApp CTAs, the native preview dialog, Escape and close-button behavior, focus restoration, scroll-lock cleanup, and the absence of fake contact destinations. Mobile and desktop Lighthouse audits completed successfully. [Screenshots and HTML/JSON reports](https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/43649799213/artifacts/14135776596) were uploaded; no Lighthouse scores are asserted here.

The dedicated workflow checks 360×800, 390×844, 768×1024, 1024×900, and 1440×900. It checks exact hero headline text and its three-tier hierarchy, Cairo heading loading, IBM Plex body loading, local font loading, responsive navigation, all in-page anchors, section/card counts, FAQ open/close behavior, both WhatsApp CTAs, native dialog semantics, explanatory copy, Escape and close-button behavior, focus restoration, absence of fake contact destinations, image loading, reduced-motion behavior, JavaScript errors, and horizontal overflow. It also creates mobile and desktop Lighthouse reports.

## Before any real-client launch

Replace demo-specific material only after the actual clinic approves it:
1. Approved clinic identity, location, and verified contact details.
2. Real team photography and credentials, with permission.
3. Clinically reviewed service copy and approved claims.
4. A real inquiry destination and privacy-compliant handling.
5. Final client review and deployment authorization.

Until those inputs exist, keep the project clearly labeled as a fictional portfolio concept.
