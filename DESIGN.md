# DESIGN.md - ETH.sh Orgs Directory

## Context

- Artifact type: directory and ecosystem aggregation page.
- Scope: `/orgs`, inside the existing ETH.sh tool-page design system.
- Positioning: technical, minimal, source-led.
- Audience: Ethereum ecosystem readers, builders, funders, and researchers. Primary action: scan organizations, then open official links or details.
- Adjectives: coherent, minimal, professional, scannable, credible.
- Visual translations: coherent -> use the same tokens and component grammar as faucet and 7702beat. Minimal -> one primary directory surface. Professional -> Inter, subdued borders, restrained blue accents. Scannable -> rows, short labels, predictable columns. Credible -> source links and research notes available from each record.
- Aesthetic essence: tool, directory, restrained.
- Single-minded proposition: Ethereum stewardship has more specialized homes now, and the page should make that easy to scan.
- Mode: dark. Density: balanced.
- Constraints: Next.js app router, Chakra UI, ETH.sh styling guide, no gradients, no extra page font loading, WCAG 2.2 AA target.

## Aesthetic

- Direction: ETH.sh tool-page aggregation, matching faucet and 7702beat rather than a standalone editorial page.
- Defining trait: a row-based directory replaces stacked editorial sections.
- Signature move: every organization is a row first, with deeper research available through per-row expansion.

## Typography

- Display: existing ETH.sh heading stack, Inter via `--font-inter`.
- Body: existing ETH.sh body stack, Inter via `--font-inter`.
- Mono: JetBrains Mono for code/data when needed.
- Scale: ETH.sh tool scale from `STYLING.md`: h1 32px desktop, h2 24px, body 14px, small 12px.
- Tracking: `0` for this page to match faucet.
- Measure: intro copy stays short; detailed notes are constrained in expanded rows.

## Color

- Strategy: use ETH.sh professional blue tool tokens; organization identity comes from logo, name, and official links rather than decorative color marks.
- Distribution: 85 neutral / 15 blue action.
- Palette:
  - bg: oklch(0.14 0.006 285) | `bg.base` #0A0A0B
  - surface: oklch(0.18 0.006 285) | `bg.subtle` #111113
  - muted surface: oklch(0.23 0.008 285) | `bg.muted` #18181B
  - fg: oklch(0.98 0.004 285) | `text.primary` #FAFAFA
  - muted: oklch(0.74 0.012 285) | `text.secondary` #A1A1AA
  - quiet: oklch(0.55 0.014 285) | `text.tertiary` #71717A
  - border: oklch(1 0 0 / 0.10) | `border.default` rgba(255,255,255,0.10)
  - accent: oklch(0.62 0.19 260) | `primary.500` #3B82F6
  - accent-fg: oklch(0.98 0.004 285) | #FAFAFA
  - success / warning / error: existing ETH.sh semantic status tokens.

## Spacing, Radius, Shadow

- Spacing base: ETH.sh 4px scale.
- Radius: `md` for controls, `lg` for top-level surfaces.
- Shadow approach: defined edges only. No page-level shadows.

## Layout And Composition

- Grid: one app-width container, capped at 1180px like faucet.
- Rhythm: compact title, directory surface, optional supporting sections,
  contextual treasury table, sources.
- Signature layout move: table rows on desktop and card-like stacked rows on mobile.
- Scanning: F-pattern.
- Responsive: desktop table converts to stacked row cards on mobile.

## Components And States

- Buttons: Chakra variants using ETH.sh hover/focus states; Details is secondary, website links sit beside org names, and handles are clickable text links.
- Rows: light separators, left-aligned text, org count in the Organization header, no nested card stacks, subtly blue-tinted focus tags, independently collapsible detail areas collapsed by default on every viewport, with a Details header control to collapse or expand all rows together.
- Focus ring: `0 0 0 1px var(--chakra-colors-primary-400)`.

## Motion

- Duration scale: only default Chakra transitions and no page-level animation.
- What animates: color/background on hover only.
- Reduced motion: no additional motion required.

## Iconography

- Set: Lucide, sized 12-16px in controls.
- Icons support actions and labels; they do not define the page identity.

## Imagery And Graphic Device

- Mode: organization favicons fetched from official domains.
- Avoid: gradients, glassmorphism, stock imagery, decorative illustrations.

## Accessibility

- Contrast: ETH.sh token contrast target.
- Focus: visible focus on links, buttons, filters, and input.
- Keyboard: native buttons and links.
- Targets: primary controls are at least 30px high, with larger row-level spacing.
- Color independence: organization identity is conveyed through names, logos,
  labels, and links rather than color-only markers.

## Tokens

```css
:root {
  --orgs-bg: var(--chakra-colors-bg-base);
  --orgs-surface: var(--chakra-colors-bg-subtle);
  --orgs-fg: var(--chakra-colors-text-primary);
  --orgs-muted: var(--chakra-colors-text-secondary);
  --orgs-border: var(--chakra-colors-border-default);
  --orgs-accent: var(--chakra-colors-primary-500);
  --orgs-radius: var(--chakra-radii-lg);
}
```

- Adapter: Chakra UI props projected from existing ETH.sh semantic tokens.

## Cards And Surfaces

- One top-level directory surface, one compact focus-area surface, one contextual
  ETH treasury surface, one source surface.
- Expanded row details use `whiteAlpha` backgrounds inside the directory surface.
- No cards inside cards.
- ETH treasury quotes are contextual live data: server-proxied through
  `/api/treasury-quotes`, cached server-side, and hydrated from client
  `localStorage` before revalidation.

## Slop Audit

- Date: 2026-07-02. Result: fixed mismatch with existing app pages.
- Fixed tells: bespoke typography, custom dark palette, decorative page background, oversized editorial hero, too many visible sections, repeated heavy record surfaces.
- Residual risk: the page still carries a lot of researched content, but it is now behind row expansion instead of visible by default.

## Changelog

- 2026-07-02: Rebuilt `/orgs` as a minimal ETH.sh-style aggregator page aligned with faucet and 7702beat.
- 2026-07-02: Moved org website links and clickable handles into the identity block, tightened logo treatment with a local EF mark, removed decorative org color dots, removed the search/filter and duplicate stat strips, moved org count into the table header, made detail rows independently collapsible and collapsed by default, added a Details header toggle for all rows, redesigned coverage as a tighter focus-area map, tinted focus tags, and renamed Source trail to Sources.
- 2026-07-02: Changed desktop behavior so organization details also start collapsed, matching mobile and keeping the directory scan-first.
- 2026-07-03: Added a separate ETH treasury companies table for public
  ETH treasury firms with direct ecosystem connections. These rows are
  contextual, not first-class orgs, and are excluded from the org count and
  focus-area lanes.
- 2026-07-03: Added cached treasury quote display for ticker price and 1D
  change, using a private Finnhub server API key and client-side localStorage
  hydration.
- 2026-07-03: Added anchored cross-references from focus-area pills and
  treasury ecosystem mentions back to organization rows, plus a subtle anchor
  affordance on the treasury heading.
- 2026-07-03: Added a brief blue row flash when organization anchor links are
  opened so cross-reference jumps have clear visual confirmation.
