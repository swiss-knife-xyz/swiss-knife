# DESIGN.md - ETH.sh Orgs Directory

## IPFS gateway tool

- Scope: `/ipfs`, served at `ipfs.eth.sh`. A compact developer utility for turning
  a CID or existing IPFS URL into links across public gateways.
- Direction: minimal, precise, familiar. Essence: input, inspect, open.
- Reuse the ETH.sh tool palette, Inter headings/body and JetBrains Mono data,
  4px spacing scale, `md` controls and `lg` directory edges from `STYLING.md`.
  Use `bg.base`/`bg.subtle`, `text.primary`/`text.secondary`, `border.default`
  and restrained `primary.400` accents. No new page fonts or shadows.
- Layout: one labelled input, two small example buttons directly below, then
  gateway rows. Each row shows the generated destination and opens a new tab.
  Keep the directory visible before input; its links initially open provider sites.
- States: derive links locally as the input changes, show an inline CID error,
  clear without retaining stale destinations, wrap long URLs at mobile widths.
- Sharing: synchronize input through `?cid=`, serializing valid gateway URLs to
  their extracted CID and file suffix. Restore shared input on load; examples
  and clear update the URL without reloading the page.
- Accessibility: visible labels/focus, native links/buttons, safe external-link
  attributes and text validation. No automatic content requests or animation.
- Audit: follows the existing explorer directory's compact row pattern, shared
  typography and semantic tokens; no decorative cards or extra workflow steps.

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

## Solidity compiler

- Scope: `/solidity/compiler`, a browser-based developer workspace.
- Direction: precise, compact, familiar; aesthetic essence: edit, compile, inspect.
- Reuse ETH.sh's Inter headings/body and JetBrains Mono code, 32/24px page title,
  16px section titles, 14px body, 12–13px code and captions. Keep existing
  `bg.base`, `bg.subtle`, `text.*`, `border.default`, `primary.*` and semantic
  status tokens; 4px spacing scale, `md` controls and `lg` workspace corners.
- Signature layout: a shared file/action toolbar above the dominant source editor
  and adjacent artifact panel. At narrow widths the output follows the editor in
  normal page flow. No empty control sidebar, decorative cards or new fonts.
- Output: contract selection, ABI/creation/runtime tabs, contextual copy/download,
  inline errors, collapsible warnings and an explicit stale-source state.
- Accessibility: labelled editor/dropdown/icon controls, keyboard-accessible tabs,
  named status text alongside icons, and no additional animation.
- Changelog (2026-11-22): replaced the fixed-width sidebar with a responsive
  workspace; compiler readiness now comes from its worker rather than a timer.
- Audit (2026-11-22): verified compilation, syntax errors and recovery, warnings,
  multiple-contract selection, all artifact tabs, copy and ABI download in the
  browser. Checked 320px, 390px and 768px without horizontal page overflow, plus
  the desktop layout. Retained the established ETH.sh typography and tokens.
- Compiler deployment (2026-11-22): wallet control sits below the compiler
  version outside the workspace. Compiled artifacts expose a shared network
  selector (Sepolia by default), existing ABI constructor widgets and a deploy
  action. Keep chain switching separate from submission; show transaction and
  contract explorer links with automatic confirmation tracking. Source edits
  require recompilation, and pending submissions lock recompilation/selection.
- Local files, first slice (2026-11-22): a single IndexedDB workspace with
  individual source records, file actions and open editor tabs. Saves run
  quietly; unsaved edits trigger browser close/reload confirmation, while save
  failures remain visible. Desktop gets a 200px file sidebar; smaller screens use a Files drawer.
  Monaco models use stable file IDs so switching tabs preserves undo/view state.
  Closing a tab retains its file. Atomic saves check revisions to prevent stale
  tabs overwriting newer data; failed saves retain edits and expose recovery.
  Compilation still targets one selected file; folders/import graphs and named
  workspace switching are separate follow-up features.
- Local-file audit: 15 storage/deployment tests passed, including transaction
  rollback, stale-tab conflicts, failed-save recovery and overlapping edits.
  Browser checks covered file creation/rename, tab close/reopen, undo across
  file switches, reload recovery, active-file compilation and mobile drawer
  navigation at 320px/390px without horizontal overflow.
- Workspace backups (2026-11-22): the Files menu exposes ZIP export/import.
  Imports preview additive file renaming versus explicit workspace replacement;
  active/open tabs round-trip through a versioned manifest. Keep menu popovers
  inside their drawer so focus/stacking remain correct on mobile. ZIP handling
  stays client-side and validates paths, source hashes and decompression limits.
- Named workspaces (2026-11-22): use a searchable selector in the workspace
  toolbar with a compact actions menu. Each workspace retains files/open tabs
  and the last selected workspace restores on reload. IndexedDB v2 migrates
  existing data without resetting file IDs/content. Switching first drains
  pending saves, and failures leave edits in place. Compilation/deployment lock
  workspace changes; deletion is confirmed and never removes the last workspace.

- Folders/multi-file slice (2026-11-22): a compact 240px desktop file tree
  replaces the flat list; the same tree lives in the mobile drawer. Folder rows
  use a chevron and folder icon, file rows retain existing selection/menu
  treatment. New-file/folder actions use focused path inputs; rename/move keeps
  stable file IDs and prompts users to update affected imports. Empty folders
  persist in IndexedDB metadata and ZIP manifests. Existing ETH.sh typography,
  semantic tokens and spacing remain unchanged.
- Compilation uses the selected entry and local transitive imports, excluding
  unrelated files. Output identities are source path + contract name. Each
  build captures immutable contents; edits to source paths/content disable
  deployment until recompilation. Errors/warnings navigate to the matching
  source location using UTF-8 compiler offsets converted to editor positions.
- Folder audit: no decorative cards/colors or extra prose; compact labelled
  actions, keyboard folder toggles, focus-managed path dialogs and destructive
  folder confirmation. Verified nested ZIP import, folder rename, dependent
  source compilation, stale dependency edits and error-to-editor navigation.

- Desktop pane sizing: output stays at 300px (340px on wide screens); the code
  editor takes the remaining width after the file tree. Mobile remains stacked.

- Solidity IntelliSense (2026-11-22): use Monaco's native suggestion, signature,
  hover and definition UI inside the existing editor. No new panels or labels.
  A separate parser worker supplies scoped variables, contract/struct members,
  inherited/imported declarations and local import paths; static Solidity
  types, snippets and builtin namespaces work before a successful compile.
  Changed files sync incrementally. Providers are scoped to workspace source
  models and disposed on teardown; stale/cancelled requests are discarded.
  Compile and deployment behavior remains explicit.

- Automatic checks (2026-11-22): a checked-by-default Auto-compile checkbox sits
  beside Compile. Reuse Monaco's native red/yellow squiggles and diagnostic
  hover UI, with no new error panels. Compiler work is debounced by 750ms,
  single-flight and snapshot-checked; edit/navigation remains available.
  Import scanning and source serialization happen after the debounce. Unchanged
  graphs reuse a completed build. Pending deployments pause checks.
  Error positions account for UTF-8 compiler ranges and UTF-16 editor columns.

- Automatic-check audit: browser verified default-on compilation, red error
  ranges and native hover messages, yellow unused-variable warnings, automatic
  clearing after fixes, and off/manual/on behavior. Scheduling/marker tests
  cover debouncing, single-flight queues, stale responses, workspace switches,
  dependency edits, deployment pauses, retry/cleanup and Unicode source ranges.

- Output sizing: desktop uses a thin draggable, focusable separator. Output is
  bounded to 260–640px while reserving at least 320px for editing. Pointer
  capture and animation-frame updates resize the pane without rerendering the
  compiler page. Arrow keys adjust width (Shift for larger steps), Home/End
  choose bounds, and double-click restores the responsive default. Mobile
  remains stacked; a chosen width survives workspace changes in this session.

- Resize audit: browser drag changed output from 300px to 440px; keyboard bounds
  and double-click reset passed. Narrowing the desktop viewport clamps output
  while leaving a 320px editor; at 320px the divider is hidden with no overflow.

- Shared explorer (2026-11-22): compiler and contract source viewer now use
  FileExplorerPanel/FileExplorerTree for the same folder/Solidity icons,
  indentation, selection and disclosure styles. Optional sibling action slots
  expose compiler file/folder menus without nesting buttons or changing the
  current selection. Editable folders stay separate (no compact chains) so
  empty folders and every folder's actions remain accessible. The compiler
  also reuses SearchPanel with source updates debounced during editing.
  File IDs, IndexedDB, open tabs, file Undo and ZIP backup logic are retained.
- Shared-explorer audit: 64 tests, typecheck and production build passed. Browser
  checks covered create/rename/move, empty folders, delete/undo, search line
  navigation, mobile menus at 320px, and the original read-only source viewer.
- Compiler Explorer refinement: darker `bg.subtle` background; desktop sidebar
  has a draggable 220–480px divider using the shared pane resize control.
  Both dividers reserve editor space, support keyboard controls and reset on
  double-click. Browser drag/keyboard checks and all 64 tests passed.

- Compiler settings: the solc version opens a compact modal using existing
  searchable selectors. Version, EVM target, optimizer/runs and via IR save per
  workspace on Apply; Cancel leaves the active build untouched. Unsupported EVM
  targets reset to compiler default when changing versions. Binary downloads use
  a separate three-version cache with classic script fallback. Settings changes
  invalidate stale artifacts; version changes replace the worker. ZIP backups
  carry configuration. Browser checks covered configured compilation, switching
  0.8.30 to 0.8.29 diagnostics, reload persistence and a 320px modal layout.

- Standard JSON portability: import joins the existing Explorer backup menu;
  input/output download actions sit beside the Output heading. Import previews
  file replacement/collisions, the entry file and compiler configuration before
  applying changes. Nested compiler settings reuse the existing dialog. Advanced
  metadata/library/optimizer settings remain attached to the workspace and ZIP.
  Downloaded input always reflects the captured build, not current edits. Browser
  checks covered real downloads, import preview modes, nested settings and 320px
  layout. Real solc 0.8.30 reproduced identical ABI, bytecodes and metadata after
  import; unit tests cover malformed/unsupported data and configuration fidelity.

- Shared source outline: a collapsible section below Files lists the selected
  Solidity file's declaration hierarchy, signatures and visibility/mutability
  badges. Rows jump to source; chevrons toggle children separately. It uses the
  existing dark Explorer styling, scrolls independently and is reused by the
  compiler drawer and contract source viewer. Debounced worker parsing keeps
  editing responsive and ignores stale results.

- Function selectors: muted, native Monaco code lenses above public/external
  functions, using a copy icon and click-to-copy feedback. Shared registration
  serves compiler and read-only sources without changing the code or line
  numbers. Selectors update through a debounced worker as the source changes.

- Compiler dependencies: the Explorer package icon opens a compact modal with
  installed version/source counts and npm package/exact-version inputs. Installs
  are explicit, cancellable and show file-count progress. Library paths display
  LIB instead of edit/delete actions; Monaco enforces read-only source viewing.
  Package updates and removal live in the same modal.

- Missing npm imports: an inline package-icon code lens above the import opens
  the shared dependency installer, prefilled with the package and pinned version
  when available. It disappears as soon as the source is present. Function
  selector lenses remain unchanged alongside it.

- Dependency sources: npm/GitHub tabs share the compact installer. GitHub uses
  Repository and Git reference fields with a repository link and explicit Fetch
  latest action. Installed cards link to the pinned GitHub tree and show a short
  commit SHA with its full value on hover. Import annotations and folder deletion
  open this same modal.

- Verified-contract import: a labelled toolbar button next to workspace actions opens a compact two-stage modal.
  Address/link and the shared network selector lead to a source review with
  explorer attribution, pinned compiler, entry path and collapsed file list.
  Create workspace is the primary action; existing workspaces are preserved.
  Reuse existing dark tokens, small typography, rounded inputs and icon buttons.
  Lookup can be cancelled; errors stay inline and failed saves remain retryable.
  New imports also appear in Deployments as Imported, with the original address,
  source attribution and existing Interact/download actions. Delete is only shown
  for deployments made from the compiler.
  Address-only deep links open network selection; address + chainId imports use
  the same loading/error surface and create directly. Workspace-linked URL
  identity survives editing and reload, with no extra controls or confirmation.
  Imported constructor arguments stay collapsed initially and show compact typed,
  named decoded values on expansion, with a copy action beside each parameter.
  Constructor forms place a compact two-line reuse action at the top right; its
  modal shows decoded deployment rows with right arrows and disables mismatches.
  Only the deployment list scrolls; its scrollbar is hidden and edge shadows
  appear when more content remains above or below.

## Homepage omnibox

- Artifact: developer-tool launcher inside the existing homepage hero, centered below the logo/text columns and their Explore Tools / GitHub row. Adjectives: direct, compact, precise, restrained. Essence: paste to tool.
- Keep the logo aligned with the text column above; the omnibox has an independent centered 640px maximum width. Preserve the site's existing heading/body typography, with `sm` controls and destination titles and `xs` metadata. Use a 4px spacing rhythm, `md` result corners and a 16px field perimeter; no additional font. A warm ETH.sh-red / peach / pale-white gradient travels around the 1.5px edge over six seconds, accelerating across the middle of each long edge, with a faint static halo and a subtle red tint inside the dark input. Focus increases the edge/halo contrast; navigation speeds the orbit up. Only transforms and opacity animate. Reduced motion keeps a static gradient border.
- Tokens: `bg.subtle` for the input surface, `bg.emphasis` for the selected result, `text.primary` / `text.secondary` / `text.tertiary` for hierarchy, and `border.default` / `border.strong` for defined edges. Error state uses existing semantic red tokens.
- Signature: an input becomes a short list of contextual destinations. Addresses prefer Contract Explorer; transactions prefer the calldata decoder. Explorer Directory remains a secondary action. Transaction inputs offer only Decode transaction calldata and Explorer Directory. Integers retain arbitrary precision and sign when passed as wei. Probable Unix timestamps (seconds or milliseconds mapping to 2000–2199 UTC) prioritize Epoch Converter with a UTC date preview, retaining ETH unit conversion as the secondary action. Epoch deep links prefill seconds and display the converted date immediately.
- Keep typed input focused during arrow navigation; Enter follows the highlighted destination. Native links support normal browser actions. A visible label and inline validation retain invalid input. Known explorer links infer the network; plain addresses and hashes start on Ethereum. ENS (.eth, including subdomains), .gwei and .wei names use the shared name resolver before entering the address flow. Typed names resolve on submission. Pasted .gwei/.wei names resolve immediately; .eth names stay on the homepage with Open Explorer and ENS History choices. ENS History opens directly without an address lookup. Show a resolving spinner and allow retry on failure; ignore results after unmount. Pasting a complete address, transaction or calldata immediately opens its default tool, shows only that destination, and replaces its Enter hint with a spinner while navigation loads; typed entries and integers retain explicit submission.
- Audit: one functional surface, quiet result states, no decorative cards; the animated gradient is isolated to the input perimeter, secondary alternatives remain subordinate. Verify desktop and phone layouts, keyboard selection, URL inference, and existing decoder/converter URL entry points.

- Text fallback in the homepage omnibox uses `lib/toolNavigation.ts`, shared with All Tools: the same catalog, related-page labels, matching, and ordering. Show up to six tool/page results in a bounded scrolling menu; keep data recognition and paste navigation ahead of text search.


### Constructor reuse modal

- Direction: compact inspection panel, precise and understated; retain existing
  dark surfaces and typography. A divided deployment header gives contract name,
  chain logo, imported provenance and shortened address a clear hierarchy.
- An explicit blue Use arguments action with a right arrow anchors each header;
  compatibility is communicated by both text and icon, and mismatches disable use.
- A ruled two-column definition list pairs parameter names/types with readable
  values and copy buttons. Narrow layouts stack labels above values. The modal
  body owns scrolling; parameter values wrap without nested scroll areas.
- Use existing semantic tokens and crisp borders; no glow, decorative gradients,
  new fonts or explanatory filler. Preserve constructor checks and exact values.

### Workspace search and replace

- Extend the existing compact Explorer search view with a disclosure for the
  replacement input and a per-file or workspace replacement action.
- Review changes in a bounded modal: path headers, line numbers, paired red/green
  source rows. Reuse dark surfaces, semantic colors, crisp borders and typography.
- Keep dependency results searchable but read-only. Preserve search drafts while
  switching views; apply edits together and offer a guarded Undo toast.

### Local source history

- Put the compact History action immediately before compiler settings; retain
  file-specific Local history in each file action menu.
- A dark modal pairs a compact revision timeline with the existing unified diff.
  Narrow screens stack the timeline above the preview. Paths, times and action
  labels provide hierarchy; no decorative surfaces or new typography.
- Restore is an explicit primary action; stale/no-op previews disable it. Deleted
  files stay discoverable through the workspace view and its Deleted files filter.


### Compiler library linking

- Only show Libraries when the selected artifact requires external addresses.
  Match the constructor fieldset's border/legend and use shared address inputs.
- Keep qualified source paths muted, reuse actions compact and checks inline.
  Scope values to the selected deployment network; status says Code found rather
  than claiming the deployed library implementation has been verified.
- Keep constructor inputs visible and stable during address-only recompilation.
  Inert deployment controls prevent changes during final validation/submission.

## Calldata clear-signing summary

- Direction: compact, quiet, precise; transpose WalletChan's transaction-review
  card into ETH.sh's existing Inter/JetBrains Mono and neutral semantic tokens.
- Top-level card: horizontally centered, full width up to 640px, 16px padding, `lg` radius,
  `bg.subtle` surface, `border.default` edge, no shadow or decorative accents.
- Title and muted source attribution share a baseline, followed by a light rule.
  Field labels use 12px secondary text; amounts use 18px semibold tabular figures.
- Amount labels sit above a right-aligned amount/token identity group. Other
  fields use compact label/value rows. Nested calls fill the available card width.
- Visible amounts use grouped integer digits and at most eight decimal places;
  hover and keyboard focus disclose the full precision and raw value.
- Keep the calldata panel mounted while its Events sibling is active. Hide the
  panel visually instead of discarding resolved descriptors and token metadata.

- Result composition: at 1200px and wider, matched clear-signing summaries occupy
  a sticky 340–440px left column; the decoded tree and its actions fill the right.
  Below this breakpoint the centered summary stacks above the tree. Unmatched
  summaries leave no empty column or gap. Long summaries can scroll within the
  available viewport height; Events switching preserves the mounted result.

- The Clear Signing heading stays outside the desktop scroll viewport. Hide
  native scrollbars and show non-interactive top/bottom gradient shadows only
  while content remains beyond that edge. ResizeObserver tracks async nested
  content and viewport changes; smaller screens use normal document scrolling.

## Tx calldata review

- At wide desktop sizes, a matched clear-signing preview sits in a 320–420px
  left column beside the complete Send Transaction form. To Address, Value and
  the calldata editor stack in the right form. Mobile places the form first and
  the preview below; unmatched calls and deployments keep one form column.
- Clear signing remains outside the decode modal. Debounce live editing, bind
  previews to the complete current envelope, and immediately suppress stale
  recipient/value/chain results.
- All decoded transaction modals use `components/decodedParams/CalldataTree.tsx`,
  shared with the main decoder, including typed controls and raw-byte disclosures.

- Tx progress uses a neutral inline status surface directly below the primary
  action, with compact loading/success/error states and transaction links. Scroll
  the new status into view (respect reduced motion). Do not use Tx-page toasts.
- A requested URL network stays pinned. A mismatch turns the primary action into
  Switch to {network}; switching is a separate click from sending. Recheck the
  live wallet chain before signing and pin receipt tracking to the submitted chain.

- Tx desktop reviews start vertically centered in the initial viewport when short,
  scroll with the page to a 24px sticky inset, and stay within the form's bounds.
  Tall reviews cap their body to the viewport, keeping the Clear Signing heading
  outside the scroll region and using the shared edge shadows. Expand the available body height as page scrolling brings the panel toward
  its sticky inset. Recalculate on content/viewport resize; mobile retains natural document scrolling.

- Nested clear-signing batches follow WalletChan's flat numbered sections: a
  blue index/count pill, uppercase call label and rule; embedded summaries have
  no repeated card border. Calls without a descriptor show To/Value rows and a
  function-name disclosure, expanding the shared calldata tree. Unknown bytes
  remain available on expansion. Cached examples use their existing nested
  decoder snapshots and make no live fallback lookups.

- Calldata trees use their container width, rather than the browser width, to
  switch parameter rows to labels above full-width values. Narrow trees keep
  compact integer format selectors beside the input. Nested clear-signing disclosures
  hide the global expand/collapse toolbar; the main decoder retains it.

- Explorer parameter import uses underline Calldata / From transaction tabs in
  one stable modal. The transaction form accepts a hash or configured explorer
  URL and uses the shared NetworkSelect for its independent lookup chain. URL
  paste detects the chain and submits; hashes use explicit submission. Import
  calldata and native value into the loaded ABI without sending a transaction
  or switching the wallet; closing the modal discards late lookup responses.


### Compiler scroll behavior

- Keep the Explorer toolbar and source tabs at the top with native CSS sticky
  positioning during main-page scrolling. Pin Outline to the visible bottom,
  bounded by the full-height sidebar. The mobile drawer keeps its own layout.
- Compiler layout ancestors use horizontal overflow clipping without creating
  scroll containers. Avoid scroll-event transforms or per-frame height updates;
  the browser owns positioning so fast scrolling stays in sync.


### Inline compiler errors

- Show complete, wrapped compiler error messages directly below their source
  lines using Monaco view zones. Keep the existing squiggles and output cards.
- Use compact mono text, semantic red and a quiet ruled surface. Resize zones
  with the editor width; clear stale messages on edits or file switches.


### Imported workspace provenance

- Show a quiet amber Modified locally row between the workspace toolbar and
  editor whenever source files or compiler settings differ from the immutable
  imported snapshot. Do not wait for saving or compiling. Reverting all changes
  clears the indicator; navigation and tab changes do not affect it.
- Put Compare with original and Open original in new workspace alongside the
  indicator. Use the existing unified diff in a bounded modal, with a changed-file
  selector and lazy loading. Keep large-file previews bounded.
- Fresh originals come from the saved import snapshot, retain their imported
  deployment entry, and never replace the user's edited workspace.

- In original-source comparisons, clicking code or a line number closes the modal
  and opens that local file/line with the shared brief highlight. Original-side
  deleted lines map to the nearest surviving local location; removed files stay
  read-only in the comparison. Bring offscreen targets into the main viewport.


### Responsive constructor header

- Keep only the collapsible title in the fieldset legend. At narrow output widths,
  place the compact blue reuse action inside the box on its own right-aligned row.
  A container query moves it alongside the title when at least 480px is available.
  The fieldset border stays continuous and inputs retain their full content width.


### Revert imported workspace

- Keep the comparison header concise: changed-file count and file selector only.
- Put Revert to original in the comparison footer. A second confirmation names
  the scope: every imported file and compiler setting, restoring deleted sources
  and removing local additions. Do not modify deployment history.
- Save a pre-revert source checkpoint through the existing local-history path.
  Guard against changed workspaces and storage conflicts; failures keep the
  comparison open with a concise error. Successful revert clears provenance.


### Shared original-source comparison

- Reuse Contract Diff's SourceCodeExplorer in the compiler comparison modal:
  folder tree and outline on the left, changed tabs and Old/Diff/New controls
  on the right. Include unchanged, added and removed sources in the tree.
- Both entry points use the same bounded source-diff builder. Preserve compiler
  line navigation and the confirmed Revert to original action. Keep large source
  previews available without unbounded diff computation.

### Shared rich string output

- Scope: contract return strings and calldata decoder strings use one shared
  viewer. Direction: compact, precise, professional, aligned with the ETH.sh
  tool theme rather than nested cards.
- Keep the existing Inter UI and JetBrains Mono value stacks, semantic
  `bg.subtle`, `bg.muted`, `text.secondary`, `text.tertiary` and border tokens.
  Use 4px spacing increments, 12px data text, 11px keys and 4px control corners.
- One ruled surface owns Preview / Raw JSON (or SVG) / Original controls,
  copy-current-view and source-link actions. Nested objects and arrays are
  disclosures inside that surface; nested URL/image fields have inline previews
  without their own tab bars. Small content widths place keys above values.
- Images use a bounded, natively resizable preview without captions or decorative
  shadows. Original strings remain available and copyable; raw JSON is read-only,
  formatted and syntax-highlighted using the shared ContentSizedEditor. Load the
  editor only when its raw tab opens. Keep the toolbar limited to view tabs and
  actionable copy/source buttons; omit format icons and preview footer text.
- Preserve typed address/integer/bytes helpers and snapshot-only enrichment.
  Loading, unavailable/retry and image-error states stay inline. Buttons keep
  keyboard focus and disclosures expose their expanded state.
- Audit: one surface, no nested card stacks, no word-per-letter table columns,
  no new palette, no decorative motion. Browser QA covers narrow explorer and
  decoder views, metadata images, nested JSON and raw/original switching.

### Shared output integration

- `ParamValue` owns primitive output dispatch and forwards the selected chain to
  rich string content. Explorer code normalizes ABI values and selects tree or
  raw-data decoding; it does not duplicate leaf control configuration. JSON
  metadata infers a type before using the same dispatcher.
- Raw-call loading and errors hide the existing viewer without unmounting it.
  Repeated calls preserve units, raw-byte formats and disclosure state. New tree
  branches expand immediately; existing collapsed branches retain their state.

## Calldata draft editing

- Scope: the existing decoder's ABI calls, recursive tuples/arrays and nested
  calldata, including packed Safe MultiSend transactions.
- Direction: compact, precise, familiar; essence: inspect, edit, encode.
- Reuse the current Inter/body and mono data fonts, semantic `bg.*`, `text.*`,
  `primary.*` and error colors, 4px spacing rhythm and Chakra control radii.
- Signature: the same parameter tree becomes the editing surface, preserving
  branch disclosure and ancestry. Array actions and raw-byte editing sit beside
  their branch; one primary Encode changes action follows the tree.
- Drafts, reset/cancel and generated output are explicit. Transaction events stay tied to the original transaction. Clear signing
  follows valid draft calldata while retaining the transaction’s destination,
  sender, network and native value. Invalid drafts show a status instead of an
  outdated summary.
- Accessibility: labelled fields and array actions, keyboard disclosure, visible
  errors and status copy. Narrow layouts stack labels and values using the
  existing tree's container rules; no added animation, fonts or decorative cards.
- Audit (2026-11-23): desktop and 390px browser checks passed for nested Safe
  editing, encoding and decoding again. Shared labels stay in the tree, with no
  duplicate labels above inputs. Existing typography/palette retained; field
  errors and byte-replacement behavior have UI coverage.

- Draft toolbar: yellow Editing draft label inside a softly tinted yellow bordered
  box. The blue primary Encode new calldata button sits in the center, with reset and close icons beside the
  Reset changes / Cancel editing labels on the right. The controls stack on phones.

- Encoded calldata and its copy/decode actions appear immediately below the draft
  toolbar and above the editable parameter tree; encoding errors share that position.

- Decode result uses a top-right arrow and opens a new decoder tab with the
  generated calldata, preserving the current draft. Known contract addresses and
  chain IDs are carried into that tab; other sources retain their ABI definitions.

- Encoded results with a known contract include a centered Send Transaction ↗
  link beneath the bytes, opening Tx with the destination, chain and calldata prefilled.

- Tx decode modal reuses EditableCalldata, with Edit calldata at the far left
  of the copy toolbar. Drafts remain isolated until Use new calldata applies the encoded bytes and
  closes the modal; nested editing,
  reset/cancel, encoding and new-tab result links follow the decoder’s shared UI.

- Copy params and Copy decoded JSON are hidden during editing on the decoder
  and in the Tx modal, then restored when editing ends.

- Applying modal calldata waits for the modal to close, then scrolls to the Tx
  calldata input and briefly highlights it in blue. Reduced motion uses immediate
  scrolling and no color transition; timers are cleaned up on unmount.

- Tx Decode starts loading the modal editor in parallel with decoding and reuses
  a resolved recipient only when it still matches the current address input.

- Add item reveals a new array entry after rendering, expanding collapsed
  ancestors and keeping its header below sticky context. The shared behavior
  applies to scalar entries and tuple rows in both decoder and Tx modal.

- Tx reopens the last successful decode immediately for unchanged calldata,
  recipient, chain and RPC settings. Changed inputs and failed decodes take the
  normal decode path; resetting the form clears the saved result.

- Tx calldata controls include Edit in Contract Explorer ↗ for a known recipient,
  sharing the address-field link and its calldata/value import. Controls wrap on
  narrow screens; the link opens a new tab.

## Calldata encoder

- Scope: `/calldata/encoder`, a technical developer workspace. Direction: compact,
  precise, professional. Aesthetic essence: build, encode, inspect.
- References: the calldata decoder's quiet tabs and editable parameter fields,
  plus the contract explorer's existing ABI input widgets. Retain the ETH.sh
  Inter/JetBrains Mono stacks and semantic palette; no extra fonts or artwork.
- Tokens: `bg.subtle` workspace, `border.default` edges, `text.primary` labels,
  `text.secondary` supporting text, `primary.400` selected tabs, `primary.600`
  primary action. Use the existing 4px spacing rhythm, `md` controls and `lg`
  workspace corners, 14px section headings and 12–13px labels/code.
- Signature: one workspace with four peer input modes and a shared action footer.
  Function name and parameters are compact groups rather than independent cards.
  Manual parameters keep their type/name toolbar and typed value together.
- Manual/ABI/address/MultiSend modes retain their own drafts. Address lookup uses
  a two-column desktop form; MultiSend uses paired fields, stacking on mobile.
  Mode tabs use a two-by-two grid on phones so every mode remains visible.
- The editor's `compact` variant is opt-in; embedded bytes builders retain their
  existing surface/plain variants. Scope input typography and density to this page.
- Result: separate output surface with byte count, selector highlighting,
  compact standard/packed and full/parameters tabs, and contextual copy action.
- Accessibility: native keyboard tabs, named input controls and actual buttons
  for ABI disclosures; copy remains independent of disclosure. Keep shared
  input validation, focus rings and typed-value conversions.
- Audit (2026-11-24): retained the established app theme, removed redundant
  section surfaces and the secondary mode row, kept labels near inputs and a
  single primary action. No decorative imagery, shadows or new motion. Browser
  verification covered manual and ABI encoding, mode switching and mobile layout.
- Changelog (2026-11-24): redesigned the encoder around a compact tabbed workspace.

## Decoder explorer links

- From Address and From Tx expose a compact, right-aligned “Open in Contract
  Explorer” text action below their inputs, using the transaction page's shared
  call-link format. Keep current chain, recipient, calldata and transaction value.
- Hide unresolved destinations and stale transaction drafts. Use a new tab and
  retain the separate external block-explorer link in transaction mode.
- Changelog (2026-11-24): added contextual Contract Explorer links in both modes.

## Contract parameter forms

- Scope: editable function parameters in Contract Explorer, including recursive
  tuple and array fields. Direction: compact, precise, readable. Reuse existing
  Inter/mono fonts, semantic dark surfaces and blue focus states.
- Apply compact density through a React context around editable inputs only;
  read results and other tools keep their existing density. Fields and format
  selectors use 32px height, 12px labels and 12–13px monospace values.
- Array items use a thin outlined row, a small index/collapse button and a named
  remove control. Show item counts beside the array name, and a quiet empty
  state with a centered Add action. Fixed arrays retain disabled add/remove.
- Hide the redundant tuple heading inside array items. Standalone tuples use a
  native disclosure button and a light nesting rail. Avoid cumulative padding,
  progressively lighter backgrounds and decorative tabs at every nesting level.
- Keep integer values and unit selectors in one row on narrow screens. Place
  address/bytes quick-fill actions beside labels; bytes-builder actions are
  independent small icon/text actions rather than tabs joined to the field.
- Preserve mounted values on collapse, stable item identities on deletion,
  automatic focus for additions, typed validation, copy, ENS and bytes builders.
- Audit (2026-11-24): checked the supplied two-operation EntryPoint call on desktop
  and mobile, plus empty nested arrays and adding an aggregator tuple. No page
  overflow at 390px; no new font, palette, shadow or animation system introduced.
- Changelog (2026-11-24): replaced the padded recursive input presentation with
  compact contract-parameter rows and accessible disclosure controls.


## Bytes builder modal

- Scope: the dynamic-bytes field builder in contract forms, the encoder and nested
  builders. Reuse the encoder's compact 32px controls, restrained dark surfaces,
  12–13px field typography, 4px spacing rhythm and blue primary Apply action.
- Use three peer tabs: Manual, From ABI and From Address. Manual always shows an
  optional function-name input; blank encodes parameters, a name adds a selector.
  Remove the Payload format dropdown. No Safe MultiSend mode in this dialog.
- From ABI accepts JSON objects or human-readable signatures. Function choices
  use full signatures to distinguish overloads; constructors encode arguments.
  From Address uses the shared network selector and verified ABI lookup, with
  independent network state, stale-request protection and explicit fetch errors.
- Keep manual parameters, ABI text/selection/values, address/network/fetched ABI,
  active mode and generated output in the mounted dialog controller. Closing or
  applying retains those drafts for reopening; changing mode invalidates output
  while preserving each mode's inputs. Do not imply persistence across reloads.
- Preserve nested builders, local base-unit inputs, validation, copy, result
  scrolling and a separate Set bytes value action. Labels, tabs and modal focus
  remain keyboard accessible; reduced motion uses instant result scrolling.
- Audit (2026-11-24): verified manual/function bytes, human-readable ABI decoding
  into input fields, verified Base ABI lookup, close/reopen recovery, and 390px
  mobile sizing without horizontal overflow. Existing builder tests plus new
  mode/draft, overloaded-function, constructor and stale-fetch tests pass.
- Changelog (2026-11-24): aligned the modal with the standalone encoder workflow.

## Validation error reveal

- Contract function forms observe their actual `aria-invalid` input markers.
  Newly marked fields expand all containing array/tuple/function disclosures;
  after React commits those openings, scroll once to the first invalid leaf in
  parameter order. Do not move keyboard focus or reset mounted draft values.
- Keep reveal scoped to the current function. A general execution/RPC error with
  valid inputs must not expand parameters or move the page. A repeated failed
  attempt can reveal the same invalid fields again after manual collapse.
- Use smooth centered scrolling with a small scroll margin; reduced-motion
  preferences use instant scrolling. Cancel observers/queued work on unmount.
- Changelog (2026-11-24): added automatic expansion and scrolling for invalid
  scalar fields, selectors and recursively nested tuples/arrays.
- Audit: browser-verified against an empty collapsed EntryPoint `handleOps` row;
  tests cover nested ancestors, first-field ordering, repeat attempts, all basic
  input types, fixed arrays, valid-input execution errors and unmount cleanup.
