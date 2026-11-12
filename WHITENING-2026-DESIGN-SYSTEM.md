# Apex Studio — Elite Dental Whitening Landing Page

Status: design direction v2 / in-progress preview
Page: `whitening-2026.html`
Branch: `feature/elite-whitening-world-class-2026`
Locale: Saudi Arabic, RTL
Purpose: premium, modern landing-page concept for a dental clinic's teeth-whitening service
Primary action: request an assessment; actual WhatsApp integration is intentionally not configured without the clinic's verified number and permission.

## Current visual direction

**Modern clinical clarity / Celestia-inspired art direction.**

Use the Dribbble reference discussed in the project as inspiration for its contemporary dental-product feel, clean composition, cool blue/white atmosphere, and distinctive dental visual. Do not copy its artwork, layout, branding, or text. The page must have its own identity and Arabic content.

The current preview intentionally focuses on the hero, a concise assessment journey, and a contact placeholder. This is a staged design review, not a finished production landing page.

## Current color tokens

| Token | HEX | Usage |
|---|---|---|
| Navy | `#102D50` | Primary headings, brand, top bar |
| Navy 2 | `#183F6A` | Dark supporting surfaces |
| Blue | `#2879C6` | Highlight, links, icon emphasis |
| Sky | `#EAF5FF` | Hero atmosphere |
| Sky 2 | `#D7EBFC` | Decorative blue fields |
| Paper | `#F7FBFF` | Page canvas |
| White | `#FFFFFF` | Header and content surfaces |
| Ink | `#173653` | Body text |
| Muted | `#66809A` | Supporting text |
| Line | `#DCEAF5` | Hairlines and borders |
| WhatsApp green | `#25D366` | WhatsApp action only, once configured |

The previous warm-teal / lime palette described in the first draft is superseded and must not be carried forward into the current visual revision.

## Typography

- Display: Alexandria, bundled in the repository.
- Body: IBM Plex Sans Arabic, bundled in the repository.
- Fallback: Tahoma, sans-serif.
- Use strong Arabic hierarchy with comfortable line-height and limited font-size jumps.
- Do not add external font requests; use the existing self-hosted font stylesheet.

## Art direction and composition

- Hero: asymmetrical two-column composition on desktop; vertically stacked and centered on mobile.
- Key visual: original inline SVG molar illustration, with dimensional gradients, soft lighting, orbit rings, and subtle floating treatment.
- Background: cool white-to-sky gradients and a very subtle grid texture. Avoid generic loud gradients.
- Header: white translucent surface, compact nav, visible contact action.
- CTA: single prominent green WhatsApp-style action. Until a real clinic number is approved, it leads to the contact placeholder/section and must not imply that a message was sent.
- Supporting cards: minimal use; prioritize editorial whitespace, typography, and a memorable hero visual.
- No random stock imagery in the hero; no invented doctors, patients, testimonials, before/after outcomes, ratings, statistics, addresses, or credentials.

## Current page structure

1. Slim clinical message bar.
2. Compact brand header and navigation.
3. Hero: headline, supporting explanation, assessment CTA, secondary CTA, custom 3D-style tooth artwork, and two small explanatory floating labels.
4. Assessment approach: three steps (assessment, understanding options, deciding next step).
5. Contact placeholder clarifying that verified clinic information is required before launch.
6. Demo disclosure.

The current preview is deliberately only the first design phase. Do not add all remaining page sections until the hero and overall visual language are reviewed and approved.

## Responsive and accessibility rules

- Use fluid sizing via `clamp()` and content widths via a centered max-width wrapper.
- Desktop hero: two columns; tablet/mobile: single-column stack.
- Provide mobile navigation with a visible toggle and `aria-expanded` state.
- Keep tap targets comfortable and avoid horizontal overflow.
- Maintain Arabic `dir="rtl"` and meaningful `lang="ar-SA"`.
- Provide a skip link, descriptive labels for the tooth SVG, visible keyboard focus, and reduced-motion fallback.
- Ensure all in-page anchors point to existing IDs.

## Engineering constraints

- Preserve the repository's existing architecture: static HTML, existing Tailwind/CSS pipeline, and GitHub Pages compatibility.
- The current standalone preview uses page-scoped CSS and inline SVG so it can be reviewed without changing shared project files.
- Reuse local bundled fonts. Do not add packages, frameworks, CDN libraries, or font assets unless they materially improve the outcome and are justified.
- Do not migrate the existing site to React/Next/Vue just to imitate a large-company stack.
- Do not modify `index.html`, shared CSS, font files, tests, package configuration, or workflows as part of the staged concept unless a reviewed requirement genuinely needs it.
- Keep work on the feature branch. No merge or deployment without explicit user approval.

## Enterprise-grade design and engineering protocol

### 1. Research and reference analysis
- Inspect real, high-quality dental and healthcare product-design references.
- Record what is useful: visual hierarchy, composition, typography, imagery, spacing, motion, interaction, and mobile behavior.
- Use references as inspiration, not as assets or designs to copy.

### 2. Design system before implementation
- Establish color, typography, spacing, grid, radius, shadow, border, icon, button, and motion tokens before coding.
- Define RTL and responsive behavior as first-class requirements.
- Keep the token source of truth in this document and reflect it accurately in the page.

### 3. Art direction
- Build a distinctive visual concept rather than a generic AI landing-page template.
- Avoid repetitive cards, decorative gradients without purpose, random stock imagery, fake trust signals, and unnecessary sections.
- Each section must have a clear communication or conversion purpose.

### 4. Design-first development
- Build and review the hero first.
- Do not implement the entire page before the visual direction is approved.
- Once the hero is approved, extend the same design system consistently through the remaining page.

### 5. Engineering choices
- Respect the existing project stack and the user's limited machine resources.
- Prefer the smallest reliable toolset. Do not install a dependency because it is popular.
- Use Tailwind utility patterns and accessible component principles from systems such as shadcn/ui and Radix as references when useful; do not add these frameworks to a static page without a concrete need.

### 6. Visual QA in a real browser
- Open the actual branch preview in a browser.
- Capture desktop and mobile screenshots at representative viewport sizes.
- Inspect screenshots for alignment, hierarchy, image/artwork quality, whitespace, typography, clipping, and responsive behavior.
- Fix visual defects before expanding the page.
- Never mark a page visually approved based on source-code inspection alone.

### 7. Automated QA
- Use Playwright for navigation, responsive states, console errors, anchors, keyboard behavior, and visible interaction tests.
- Use Lighthouse for performance, accessibility, best practices, and SEO when a runnable local or deployed preview is available.
- Record actual results and test environment. Never invent a passing result.

### 8. Honest reporting
- Distinguish static source checks from browser tests and Lighthouse results.
- State clearly when browser rendering or automation was not run.
- Do not describe a temporary preview link as the production site.
- Do not call a draft "finished" or "approved" before the user sees and accepts the rendered result.

### 9. Project protection
- Work on a separate feature branch.
- Preserve the original homepage and shared assets.
- Do not merge, publish, deploy, or configure a live clinic integration without explicit authorization.

## Tooling status and rationale

- Playwright and Lighthouse dependencies are already listed in the project's package configuration. They should be used for real QA once an executable local/deployed preview is available.
- The actual UI UX Pro Max skill was not installed or exposed in this session, so it was not run.
- Storybook is not required for this one-page static concept at the current stage.
- shadcn/ui and Radix are component-design references, not dependencies for this standalone static HTML preview.

## Current QA record

- Static inspection confirmed Arabic RTL, existing local font stylesheet reference, responsive breakpoints, reduced-motion fallback, a responsive menu layout, three page sections, and no broken in-page anchors.
- The default branch's `index.html` blob was verified identical to the feature branch's `index.html`.
- Browser screenshot review, Playwright, and Lighthouse have not yet been executed for this revision. Do not claim visual or automated test approval until they have been run.
