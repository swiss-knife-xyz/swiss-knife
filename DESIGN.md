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

## Cross-explorer verification

- Scope: `/explorer/verify`, a developer tool within the existing ETH.sh theme.
- Direction: compact, precise, quiet. Reuse the current Inter/mono font stacks,
  semantic background/text/border tokens, 4px spacing scale and Chakra controls.
- Layout: one source form followed by a review with destination rows. On mobile,
  inputs stack and each destination retains its own readable result and action.
- Identity: choose several explorers from one imported source; no decorative
  hero, side accent border, nested status cards or extra banners.
- Details: source/settings, API keys and alternate deployment inputs stay secondary.
- Accessibility: labelled inputs, keyboard dropdowns, native detail toggles, named
  external links, text status labels and reduced-motion-aware scrolling.
- Audit (2026-11-22): 8/10. Verified empty, review, alternate deployment and status
  layouts at 320, 390, 768 and 1280px, with no horizontal page overflow. Retained
  the established app type/palette rather than introducing a standalone style.
- Changelog (2026-11-22): expanded provider/network selection and independent
  destination states while preserving the existing tool-page visual language.

## Tool Open Graph cards

- Direction: familiar, minimal, readable. Reuse the approved CowSwap card's
  Poppins Bold/Light typography, #111111 background, white copy and red ETH.sh mark.
- Shared composition: left-aligned tool title and short description; lower-right
  inline logo and ETH.sh wordmark with “All your EVM dev tools in one place!” below.
- Artwork variant: retain existing screenshots/diagrams on the left and place
  editable title/description on the right. Avoid decorative panels or gradients.
- Changelog (2026-11-22): replaced tool PNG metadata with shared dynamic OG cards;
  preserved screenshot artwork and added before/after comparison to the local gallery.
- Audit: all 33 image routes rendered at 1200×630 with no missing artwork or
  clipped copy in the contact sheet. Compare view passed desktop and 390px
  mobile checks, with stacked comparisons and no horizontal overflow.
- 7702 Beat now renders a wallet grid from the same data module as the page,
  replacing the frozen screenshot. All extracted data declarations match the
  original page; the image shows all current wallets without chain cards or
  summary statistics. Shared footer rendering preserves the CowSwap card.
- App Store retains the original oversized heading, italic subtitle, large app
  grid and stacked brand column, with ETH.sh replacing the former domain.
- USDC Pay retains its full-height payment preview, large right-hand title,
  italic cyan/green copy and x402 credit, using the same stacked ETH.sh branding
  as App Store. The App Store render remains byte-for-byte unchanged by reuse.
- Homepage OG is code-rendered: the original dark field, scattered rotated tool
  names and central logo/wordmark remain, with ETH.sh and the corrected tagline.
- Applied the shared tool composition to Explorer, verification, encoder,
  directory, transaction sending and all six Uniswap tool cards. Parameterized
  directory previews retain their address/hash, and app-specific cards retain
  third-party artwork and hostname. All 15 remaining review entries rendered
  at 1200×630; the obsolete generic helper and base PNG were removed.
- After approval, removed the temporary comparison gallery, baseline captures,
  QA screenshots and unused legacy OG PNGs. Migrate's current branded PNG stays
  in use; the homepage and faucet overview both use their dynamic routes.

## Mock-token deployment workspace

- Scope: `/mock-tokens`; technical utility for developers creating permissionless test tokens.
- Direction: compact, precise, restrained. Aesthetic essence: quiet deployment workspace.
- Signature: token-standard tabs above the configuration, paired with a live token identity and deployment column; stack the columns on mobile.
- Use existing ETH.sh tokens and fonts rather than introducing a page-specific palette or font download.

| Role | Existing token / scale |
| --- | --- |
| Heading / body / data | Site heading and body stacks; `mono` for addresses and quantities |
| Type | `2xl` page title, `md` section titles, `sm` labels/body, `xs` metadata |
| Surfaces | `bg.base`, `bg.subtle`, `bg.muted` |
| Text | `text.primary`, `text.secondary`, `text.tertiary` |
| Edges / actions | `border.default`, `primary.500`; semantic colors only for status |
| Spacing / radius | 4px rhythm; `md` controls, `lg` surfaces; defined edges without shadows |

- ERC20/ERC721/ERC1155 tabs use accessible keyboard navigation and retain draft values. Disable configuration changes during submission.
- Keep name and symbol inputs plain; show the entered name and symbol together in the deployment summary. Group supply and recipient fields; keep NFT metadata guidance adjacent to the URI input.
- Network selection and wallet connection remain visible without opening a modal. Deploy opens the wallet directly; Switch Chain replaces it when needed.
- Show token identity and formatted supply before implementation details. Compiler files and constructor data use progressive disclosure.
- Preserve deployment validation, live account/network checks and duplicate-submission protection. Do not deploy to a public network during visual verification.
- After confirmation, verify automatically on Sourcify and the chain’s Etherscan explorer. Show independent compact statuses below the contract address; keep the Etherscan key on the server.

## All Tools drawer

- Artifact: developer navigation; compact, clear, restrained. Aesthetic: quiet tool index.
- Use the shared homepage catalog, ordered Tools for Devs, Useful Tools, Directories.
- Main tool names are always links. Related pages use a separate 36px chevron target; pages already featured in a category are not repeated in a submenu.
- Fixed header with search; one scrolling navigation body. Full width on narrow phones, 380px on larger screens. Search expands matching related pages.
- Existing Inter/body stack and semantic tokens: `bg.base`, `bg.subtle`, `bg.emphasis`, `text.primary`, `text.secondary`, `border.subtle`, `primary.300` for current links. 14px rows, 12px category labels, 4px spacing rhythm, `md` corners.
- Use spacing and text hierarchy, without tool cards, emoji decoration, gradients, or extra explanatory copy. Preserve keyboard focus, labeled navigation, and real anchors.
- Audit: links and expansion are independent; no nested interactive controls; active state uses `aria-current`; search has a label and an empty state; no extra animation or font loading.
