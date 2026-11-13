# Apex Studio — Elite Dental Whitening Landing Page

**Project status:** Staged portfolio concept; browser and Lighthouse QA passed  
**Page:** `whitening-2026.html`  
**Branch:** `feature/elite-whitening-world-class-2026`  
**Preview revision:** `7682704d5fe9784c6f7ecd363049f7251a92f90f`  
**Locale:** Saudi Arabic, right-to-left  
**Project type:** Fictional-clinic portfolio demonstration, not commissioned client work

## Purpose and positioning

Apex Studio created this concept to demonstrate a clear, contemporary Arabic landing-page experience for a dental whitening service. The page explains why assessment should come before selecting a whitening option, then guides visitors to a low-friction inquiry-preparation interaction.

The clinic name **ELITE DENTAL** is fictional. This project must never be represented as a real clinic, a completed client engagement, or a live booking service.

## Design direction

**Modern Clinical Editorial.**

The current direction uses a calm, light clinical canvas, deep blue-green typography, a restrained teal accent, and carefully limited warm details. The result should feel current and trustworthy without looking like a generic medical template.

Transferable design principles:
- **Apple:** deliberate image composition, whitespace, hierarchy, and visual restraint.
- **Stripe:** clear value proposition and a single primary visitor action.
- **Notion:** simple components and consistent visual language.
- **Linear:** careful spacing, states, focus behavior, and motion details.
- **Vercel:** lightweight implementation and dependable technical execution.

These are directional references only. Do not copy proprietary artwork, page layouts, or brand identities.

## Current design tokens

| Token | HEX | Use |
|---|---|---|
| Canvas | `#F4F7F6` | Main page background |
| Paper | `#FFFFFF` | Content surfaces |
| Ink | `#142D38` | Primary text and dark contact panel |
| Ink 2 | `#304A54` | Secondary text |
| Muted | `#64757A` | Supporting text |
| Line | `#DDE6E3` | Borders and separators |
| Teal | `#187A80` | Primary action and key accents |
| Deep teal | `#115A60` | Hover and deeper accents |
| Warm accent | `#B85D4A` | Small eyebrow / editorial detail |
| Soft mint | `#E3F2E9` | Subtle highlight |
| WhatsApp green | `#25D366` | Reserved token only; no live WhatsApp destination is configured |
| WhatsApp ink | `#073A26` | Reserved supporting token |

The identity is intentionally restrained. Do not reintroduce the previous cobalt/coral/acid-lime mix or add decorative effects that compete with the headline and primary action.

## Typography

- Headline: **Alexandria**, loaded from local repository assets.
- Body: **IBM Plex Sans Arabic**, loaded locally.
- Fallbacks: Tahoma and sans-serif.
- Protected headline text: **«التبييض، لكن بفهمٍ أعمق.»**
- The headline font family and exact Arabic wording are protected; do not change them without explicit user approval.
- Keep Arabic copy natural, concise, and appropriate for Saudi visitors.

## Image art direction

- Hero image: Emily Gaibor / Pexels, photo ID 37458050.
- Source: https://www.pexels.com/photo/dentist-in-a-modern-dental-office-37458050/
- Image role: illustrative stock portrait of a male dentist in a contemporary dental office.
- The page explicitly discloses that the photo is not the actual dentist or staff of the fictional clinic.
- Keep the visible credit and stock-photo disclosure. Never present this image as a real employee, patient, testimonial, or treatment result.
- Do not create before/after claims or imply guaranteed clinical outcomes.

## Page structure

1. Slim announcement strip.
2. Minimal identity and responsive navigation.
3. Hero with protected Arabic headline, supporting explanation, primary inquiry CTA, and editorial portrait.
4. Three concise assessment principles.
5. Short approach section: understand the case, explain options, identify the next step.
6. Inquiry-preparation panel.
7. Footer with fictional-demo disclosure and image attribution.

Keep the current page focused. Do not add unrequested sections merely to increase page length.

## Interaction behavior

- The mobile navigation supports open/close state, `aria-expanded`, Escape-to-close, and closes after a navigation selection.
- The main CTA scrolls to the inquiry-preparation panel.
- Visitors select an inquiry topic and prepare a copy-ready Arabic message.
- The interaction copies the message when clipboard access is available and exposes a manual-copy fallback otherwise.
- **No information is transmitted, stored, or submitted.**
- A real WhatsApp link, phone number, booking workflow, or backend must only be added after the real clinic supplies and approves its verified contact details.
- Do not describe the current interaction as a completed booking or sent inquiry.

## Engineering constraints

- Preserve the repository's static HTML/CSS/JavaScript and GitHub Pages architecture.
- Reuse local font assets.
- Avoid unnecessary dependencies or UI frameworks.
- Keep all work on the feature branch.
- Do not alter `main`, `index.html`, production routing, or live deployment settings without explicit approval.
- Do not invent clinic staff, credentials, address, reviews, ratings, patient counts, or treatment results.

## Verified QA snapshot

Latest full workflow run: https://github.com/shoppingmr4-dev/elite-dental-demo/actions/runs/43512839827  
Run date: 13 November 2026  
Tested page revision: `7682704d5fe9784c6f7ecd363049f7251a92f90f`

### Responsive browser checks

All checks passed at 360×800, 390×844, 768×1024, and 1440×900:
- No horizontal overflow.
- No missing in-page anchors.
- No browser JavaScript errors or local HTTP resource errors.
- Local headline font loaded.
- Hero image loaded at all tested viewport sizes.
- Mobile navigation opened, navigated, and closed correctly.
- Inquiry message interaction prepared the expected copy-ready message.
- Reduced-motion behavior and protected headline were checked.

### Lighthouse lab snapshot

| Category | Mobile | Desktop |
|---|---:|---:|
| Performance | 97 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 77 | 77 |
| SEO | 100 | 100 |

| Metric | Mobile | Desktop |
|---|---:|---:|
| First Contentful Paint | 1.7 s | 0.4 s |
| Largest Contentful Paint | 2.4 s | 0.5 s |
| Speed Index | 1.7 s | 0.4 s |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0.011 | 0.008 |

These are one controlled Lighthouse lab run, not a guarantee of field performance for every device or network. The Best Practices score remains 77; the report flags one third-party cookie from the externally hosted Pexels image, alongside further image/cache/rendering diagnostics. Do not claim a perfect Lighthouse score.

## Next step before any real-client launch

Replace only demo-specific material after the actual clinic approves it:
1. Approved clinic identity, location, and verified contact details.
2. Real team photography and credentials, with permission.
3. Clinically reviewed service copy and approved claims.
4. A real inquiry destination and privacy-compliant handling.
5. Final client review and deployment authorization.

Until those inputs exist, keep the project clearly labeled as a fictional portfolio concept.
