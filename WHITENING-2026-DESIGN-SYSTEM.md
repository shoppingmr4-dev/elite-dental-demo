# ELITE DENTAL — Whitening 2026 Design System

Status: bespoke project system / v1  
Page: `whitening-2026.html`  
Direction: Arabic RTL, locale `ar-SA`  
Audience: Saudi adults researching professional teeth whitening  
Primary conversion: appointment inquiry (demo form only; WhatsApp requires real clinic number)

## Capability disclosure
The UI UX Pro Max skill was not installed or exposed in the current environment. This system was authored using a documented product-design workflow and the repository's existing architecture. Do not represent it as output from an executed UI UX Pro Max run.

## Design concept
**Clinical editorial / Organic precision** — a restrained, high-clarity health experience. The page uses a warm mineral paper base, deep botanical teal, a muted sage field, and a small chartreuse highlight. Editorial section numbers, asymmetric layouts, fine rules, and clipped geometry provide a recognisable visual system without ornamental clutter.

## Color tokens

| Token | HEX | Purpose |
|---|---|---|
| paper | #F7F8F4 | Main canvas |
| paper-2 | #EEF3EE | Alternate section |
| surface | #FFFFFF | Cards / form |
| ink | #123538 | Primary headings / dark section |
| ink-2 | #315456 | Secondary text |
| muted | #667B78 | Body text |
| brand | #0C7774 | Main action / links |
| brand-dark | #075C5C | Dark brand panels |
| brand-soft | #DDEEE8 | Soft fields / icon plates |
| accent | #D9EF83 | Rare editorial accent |
| WhatsApp | #25D366 | WhatsApp-style action when configured |
| line | #D9E4DC | Dividers |
| warning | #A75C42 | Reserved for caution states |

OKLCH values can be derived during token export; HEX is the source of truth for this release.

## Typography
- Display: Alexandria (bundled, Arabic coverage present), 700–800.
- Body: IBM Plex Sans Arabic (bundled, Arabic coverage present), 400–700.
- Fallback: Tahoma, sans-serif.
- Display line-height: 1.2–1.35.
- Body line-height: 1.78–2.05.
- Hero display uses fluid sizing with `clamp()`.
- Number labels use the Latin glyphs in the same families and `direction:ltr`.

Both font families are already in the repository with OFL license files. No new font binary or shared font CSS was added.

## Layout & geometry
- Max content width: 1240px.
- Side gutters: `clamp(20px, 4.5vw, 68px)`.
- Section rhythm: `clamp(76px, 9vw, 132px)`.
- Header height: 78px desktop / 65–70px mobile.
- Main hero: two-column 1 : 1.04 composition; stacked below 840px.
- Step grid: four columns desktop, two columns small screens.
- Form grid: two columns desktop, one column mobile.
- Radii: 12 / 20 / 30 / 42px; selective asymmetric corners for editorial framing.
- Shadows: restrained low-opacity teal, reserved for hero image and booking shell.
- Dividers: 1px low-contrast green-gray; no generic card grid for every section.

## Interaction
- Dominant CTA: assessment request.
- Sticky navigation with compact mobile disclosure.
- FAQ uses native `details/summary`.
- Demo form validates locally only and does not transmit or persist data.
- Mobile bottom CTA appears below 840px.
- Reduced motion preference is respected.
- Visible focus rings on interactive controls.

## Image direction
- Main photo: Emily Gaibor, Pexels, photo ID 37458052. Source page: https://www.pexels.com/photo/dentist-in-clinic-wearing-white-coat-37458052/
- Pexels listing reports 4000 × 6000 px and free Pexels licence. It is a stock image; it must not be described as the clinic's actual dentist.
- A second contextual dental examination image is illustrative only and is lazy-loaded.
- Do not use stock photos as patient testimonials or clinical result evidence.

## Page architecture
1. Demo disclosure / announcement
2. Header / responsive navigation
3. Hero / dentist image / assessment CTA
4. Cleaning vs whitening distinction
5. Care principles
6. Treatment pathways (clinic / dentist-supervised home, with clinical confirmation required)
7. Four-step process
8. Suitability and caution factors
9. Before / after care guidance
10. FAQ
11. Demo booking form
12. Footer / source credit

## Engineering constraints
- Static HTML + inline page-scoped CSS/JS to preserve GitHub Pages compatibility.
- Existing self-hosted fonts are referenced, not modified.
- No new framework, package, CDN library, global stylesheet, or workflow was added.
- No repository-wide files were modified.
