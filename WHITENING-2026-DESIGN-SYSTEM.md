# Apex Studio — Elite Dental Whitening Landing Page

Status: editorial visual direction / staged preview
Page: `whitening-2026.html`
Branch: `feature/elite-whitening-world-class-2026`
Locale: Saudi Arabic, RTL
Purpose: a modern, distinctive landing-page concept for a dental clinic's teeth-whitening service.
Primary action: assessment inquiry. A real WhatsApp link is not configured until the clinic's verified number and permission are provided.

## Design direction

**Editorial Dental / Modern Graphic Identity.**

The previous cool-blue gradient and decorative 3D-tooth concepts are superseded. The current direction takes inspiration from contemporary editorial cosmetic-dentistry work: strong typographic hierarchy, confident art direction, intentional color blocking, a photographic service detail, and restrained navigation.

Reference principles:
- Grand Street Dental: use an editorial brand identity and purposeful graphic shapes rather than a generic clinic template.
- Lumière case study: use a cinematic first impression, explain treatments clearly, and keep consultation flow low-friction.
- LUMA / BNBWT Dribbble concepts: borrow the discipline of art direction, typography, photo composition, and subtle motion — never copy their artwork, identity, or layout.
- Avoid copying any real clinic's claims, staff, location, stats, testimonials, or patient outcomes.

## Current color tokens

| Token | HEX | Purpose |
|---|---|---|
| Canvas | `#F5F1E8` | Main warm-paper background |
| Paper | `#FBF9F3` | Alternate content surface |
| Ink | `#151916` | Main text / dark surfaces |
| Ink 2 | `#303831` | Secondary headings |
| Muted | `#74776F` | Supporting text |
| Line | `#DAD7CE` | Quiet separators |
| Cobalt | `#3156E8` | Brand contrast / emphasis |
| Deep blue | `#213DB7` | Supporting blue |
| Coral | `#EF7058` | Small expressive accent |
| Acid lime | `#DDF078` | Rare highlight / marker |
| WhatsApp | `#25D366` | CTA styling only; real destination requires clinic number |

The prior blue-gradient / teal-lime concepts are superseded. Do not reintroduce generic medical-blue gradients or oversized artificial tooth illustrations.

## Typography

- Display: Alexandria, locally bundled in the repository.
- Body: IBM Plex Sans Arabic, locally bundled in the repository.
- Fallback: Tahoma, sans-serif.
- Use bold, deliberate Arabic headline scale and controlled line length.
- Use small Latin editorial labels sparingly for issue/section markers.
- Do not fetch fonts from external CDNs.

## Image direction

- Hero image: Kaboompics / Pexels, photo ID 6627598 — close-up still-life of a dental shade guide. Pexels listing states free use and original dimensions 6720 × 4480.
- Source page: https://www.pexels.com/photo/samples-of-teeth-6627598/
- The image illustrates a shade-selection tool; it is not a patient before/after result or proof of clinical outcome.
- Hero image is placed as a photographic editorial panel with art-directed crop and graphic framing. It is requested at 1600px width for reasonable transfer size, with its original 3:2 ratio declared. It must not look like an unrelated stock-image card.
- Do not use identifiable patients, fake clinicians, before/after imagery, or stock photos as testimonials.

## Current page architecture

1. Slim announcement strip.
2. Minimal branded navigation with a mobile menu.
3. Editorial hero: bold Arabic headline, explanation, one dominant assessment CTA, photo composition, and short clinical notes.
4. Short assessment approach: understand the cause, explain suitable options, decide the next step.
5. Compact consultation placeholder with a clear notice that verified clinic details are required before launch.
6. Demo disclosure and Pexels image attribution.

This is a staged visual approval page, not yet the full production landing page. Do not add every possible section before the user approves the art direction.

## Interaction and accessibility

- Native anchor navigation; all internal targets must exist.
- Responsive menu uses button state and `aria-expanded`.
- Hero CTA points to the demo inquiry section; it does not claim to send a WhatsApp message.
- Use the real clinic's verified WhatsApp number only after supplied and approved.
- Maintain Arabic `lang="ar-SA"` and `dir="rtl"`.
- Provide skip link, descriptive image alt, visible keyboard focus, and reduced-motion fallback.
- Use restrained entrance motion for hero copy and photo, with a subtle image hover scale on pointer devices; disable these for reduced-motion users.
- Mobile layouts must avoid horizontal overflow and maintain comfortable tap targets.

## Engineering constraints

- Preserve static HTML and existing GitHub Pages architecture.
- Reuse local bundled fonts and existing CSS conventions; do not add frameworks just for brand prestige.
- Do not add shadcn/ui or Radix to a simple static landing page unless a real component requirement justifies them.
- Tailwind CSS v4 remains available in the repository; page-scoped CSS is acceptable for this isolated concept preview.
- Do not modify `index.html`, shared CSS, font files, tests, package configuration, or CI workflows unless a reviewed requirement demands it.
- Keep work on the feature branch. No merge or deployment without explicit authorization.

## Enterprise design and QA protocol

1. Research actual reference sites and identify transferable principles rather than copying screenshots.
2. Establish color, typography, spacing, grid, component, image, and responsive tokens before coding.
3. Build the hero first; do not produce the full page before the visual direction is approved.
4. Use a real browser to inspect desktop and mobile screenshots before claiming visual approval.
5. Use Playwright for responsive state, menu interactions, anchor navigation, keyboard behavior, and console errors.
6. Use Lighthouse for performance, accessibility, best practices, and SEO where a runnable preview is available.
7. Distinguish source-level checks from browser tests. Never claim a test passed if it did not run.
8. Respect the existing stack and keep dependencies to the minimum necessary.
9. Do not invent clinic staff, ratings, testimonials, stats, address, or contact details.
10. No merge, publication, live deployment, or real clinic integration without explicit permission.

## Tooling status

- The repository already lists Playwright and Lighthouse dependencies; availability does not mean they were run.
- The UI UX Pro Max skill was not installed or exposed in this session and has not been run.
- Storybook is unnecessary for this single-page static preview at the current stage.
- Apple Human Interface Guidelines, Stripe-like design-system discipline, and Notion-like consistency are reference principles, not installed libraries or claims of access to their private internal systems.

## Current QA record

- Latest source inspection confirmed Arabic RTL, local font stylesheet use, three content sections, responsive breakpoints, mobile navigation handling, reduced-motion support, and no broken in-page anchors in the preceding revision.
- The latest revision uses a compressed Pexels shade-guide image, a custom sparkle mark, entrance motion, keyboard focus styling, and a refreshed editorial visual direction. It has not yet had a browser-rendered screenshot review, Playwright run, or Lighthouse run in this session.
- The main branch homepage must remain byte-for-byte unchanged.
