# Solidity workspace roadmap

Last updated: 2026-11-23.

## Direction

Build a lightweight browser Solidity workspace inspired by early Remix. Focus
on write → compile → deploy → interact, within ETH.sh's current dark design.
Implement one reviewable feature at a time and pause for user feedback after
that feature. Do not automatically advance through this roadmap.

No initial plugin marketplace, terminal, Git client, AI panel or full debugger.

## Interface

- Header: workspace selection (once supported), compiler version/settings,
  existing wallet controls.
- Left: compact, collapsible file explorer. Use a drawer on small screens.
- Center: Monaco file tabs, per-file cursor/view/undo state during the session.
- Right: compiled contract selection, collapsed artifact disclosure, deployment.
  Consider Output/Deploy views as this area grows.
- Diagnostics: concise errors/warnings linked to source locations.
- Preserve the established ETH.sh components, typography and semantic colors.
  No outer rounded workspace card; retain internal pane dividers.
- ABI/bytecode/runtime are secondary and start collapsed. Deployment remains
  visible independently of artifact expansion.

## Existing baseline

- [x] Responsive editor/output layout and real compiler-worker readiness.
- [x] ABI, creation bytecode and runtime inspection/copy/download.
- [x] Wallet connection above the workspace.
- [x] Deployment network selector, default Sepolia; separate chain switch action.
- [x] Constructor parameters reuse existing ABI inputs, including bytes builders.
- [x] Automatic receipt tracking and deployed-contract/explorer links.
- [x] Deployment disabled for stale compilation results.

## Feature 1: local source files — accepted

- [x] One local workspace using IndexedDB, not localStorage.
- [x] Create, rename and delete files with immediate undo.
- [x] Open/close file tabs without deleting sources.
- [x] Autosave and restore file contents, open tabs and active file after reload.
- [x] Reuse Monaco models for per-file undo/view state while switching tabs.
- [x] Background autosave; browser close/reload confirmation while edits remain unsaved.
- [x] Save failures remain visible with retry/recovery actions.
- [x] Atomic, incremental file writes with revision checks against stale-tab writes.
- [x] Save failures retain edits; retry and emergency JSON download.
- [x] Mobile file drawer.

Compilation targets the selected entry file and its transitive workspace imports.
Named workspaces, folders and local relative/direct imports are now supported.
Current tests cover persistence, rollback, conflicts, failed-save recovery,
overlapping edits and existing deployment flows. Browser checks cover editing,
file/tab switching, undo, rename, reload, compilation and mobile layouts.

## Subsequent features — proposed order, review each separately

### 2. Workspace backup and restore — accepted

- [x] Export source files plus a versioned, integrity-checked workspace manifest.
- [x] Restore source contents, names, open tabs and active file from that ZIP.
- [x] Import ordinary flat Solidity ZIPs too.
- [x] Preview Add files (rename collisions) versus Create new workspace.
- [x] Export current files before replacing a workspace.
- [x] Validate archive paths, manifest/hash consistency, file counts and sizes.
- [x] Verify desktop export/add/restore and mobile drawer import.

Current limits: 20 MB compressed ZIP, 5 MB per source, 50 MB total source, 500
files. Nested folders (including empty folders) round-trip in version 2 backups; version 1 backups remain supported. Compiler settings/dependency locks will
join the manifest when those features exist. Optional browser persistence and
bounded recovery/history remain follow-up work; backups provide portability.

### 3. Named workspaces — accepted

- [x] Searchable workspace selector and create/rename/delete actions.
- [x] Each workspace owns its files, open tabs and active file.
- [x] Flush pending saves before switching; failed saves keep the current edits.
- [x] Remember the last selected workspace after reload.
- [x] Migrate existing single-workspace data in place without resetting sources.
- [x] Case-insensitive unique names and atomic deletion of only that workspace.
- [x] Keep at least one workspace; confirm deletion before removing its files.
- [x] Block workspace switching while a deployment or compilation is pending.
- [x] Scope delayed file actions/undo to the originating workspace.

Compiler settings per workspace will arrive with feature 5. Deployment history
and receipt recovery after reload remain feature 7. Sources stay local; no
account/cloud requirement.

### 4. Folders and multi-file compilation — implemented, under user review

- [x] File/folder tree, nested folder creation and rename/move/delete actions.
- [x] Persist empty folders and preserve file IDs/editor models through moves.
- [x] Relative and direct imports within a workspace.
- [x] Compile a selected entry file with its transitive dependency graph using Standard JSON.
- [x] Ignore unrelated sources while compiling that entry.
- [x] Treat outputs as file path + contract name, avoiding duplicate-name collisions.
- [x] Compile an immutable source snapshot; workspace source/path edits mark output stale.
- [x] Surface missing imports and link errors/warnings to the correct file/line.
- [x] ZIP backups retain folder structure and isolate colliding imports together.

Renaming/moving files or folders does not rewrite source imports; the dialog
reminds users to update affected imports. External package/URL retrieval and
library linking are deferred. Compiler settings remain feature 5.

### Editor language support — implemented, under user review

- [x] Automatic Solidity keywords, sized types and declaration snippets.
- [x] Builtin members (`msg`, `block`, `tx`, `abi`), address and array helpers.
- [x] Parser-backed scoped variables, parameters, structs, inherited/imported symbols.
- [x] Local import-path completion, including file moves and workspace switches.
- [x] Hover details, function parameter hints and F12 navigation across editor tabs.
- [x] Parse in a dedicated worker; sync changed files and dispose scoped providers.

This is local editor assistance, not a full Solidity language server. Compiler
errors/warnings refresh automatically after typing pauses, with a manual Compile
action available too. External packages must first be
available as workspace files; dependency retrieval remains feature 6.

### 5. Compiler configuration — settings implemented, under review

- [x] Searchable stable official compiler versions (0.5.0 onward).
- [x] Optimizer/runs, version-compatible EVM targets and via IR.
- [x] Separate, bounded binary cache (up to three versions), with direct script fallback.
- [x] Persist settings per workspace; invalidate results and caches on settings changes.
- [x] Version changes terminate the previous worker and ignore late responses.
- [x] ZIP backup/restore includes settings; Add files keeps the destination's settings.
- [x] Download captured Standard JSON build input and raw compiler output.
- [x] Import inline Solidity Standard JSON with file/settings preview and entry selection.

Settings open from the solc version button in the compilation toolbar. Apply commits the draft; Cancel leaves
it unchanged. Reset returns to solc 0.8.30 with optimization disabled and the
compiler's default EVM. Configuration is local and compilation remains in the worker.
Standard JSON portability is now implemented, under review. The Output download
menu uses the captured build, including when live edits have made it stale.
Import lives in the workspace dropdown’s three-dot menu. Create new workspace imports files and
settings atomically and switches to it; Add files keeps the current settings and relocates collisions.
Compiler version is inferred from the entry pragma (it is absent from Standard JSON), with manual override. Metadata,
libraries, optimizer details and requested outputs survive import and backup;
the workspace adds ABI and bytecode requests needed for its UI. URL-only Standard JSON sources and unsupported compiler options fail with a clear message rather than
being silently discarded; dependency resolution remains feature 6.

### 6. External dependencies — npm and GitHub implemented, under review

- [x] Explicit install from the Explorer's Dependencies action using an exact npm version.
- [x] Resolve imported sources and transitive relative imports within that package.
- [x] Download source text directly from UNPKG in the browser, with four requests in flight.
- [x] Verify SHA-256 metadata hashes and store the exact version/source lock in IndexedDB.
- [x] Dependency sources are read-only; package/folder mutations cannot bypass the lock.
- [x] Explicit updates re-resolve consumers against the new version, preserving surviving file IDs.
- [x] Cancel downloads and reject stale workspace results; failures leave existing sources intact.
- [x] Version 3 ZIP backups include locks and verified source contents; versions 1/2 still import.
- [x] Standard JSON includes dependency sources, so compilation needs no remote import callback.
- [x] Public GitHub repositories pinned to an exact commit, with canonical and GitHub/raw URL imports.

Add an npm import to the source, then select the package and exact version in
Dependencies. Other npm packages imported by that dependency need separate pinned
installs. Compilation never retrieves or updates packages automatically. Only
reachable sources are downloaded. No package JavaScript or install scripts run.
Backups with dependency locks import as new workspaces to preserve their package
paths; adding ordinary source files remains supported. Limits match workspace
backups: 500 files, 5 MB per source, 50 MB total. Existing editable package paths
are never overwritten by installation.

Browser acceptance: OpenZeppelin 5.4.0 fetched five ERC20 sources, compiled an
ExampleToken using solc 0.8.30, survived reload and rejected edits to ERC20. The
Dependencies modal fits a 320px viewport. Tests cover integrity failures,
missing files, exact-version validation, cyclic/transitive imports, cancellation,
updates removing obsolete internals, source collisions, locks in ZIP backups and
IndexedDB persistence. All 101 tests pass.

Reference: https://unpkg.com (exact-version URLs and file metadata/integrity API).

### 7. Deployment history and verification — history implemented, under review

- [x] Save exact build, source snapshot, compiler settings, constructor arguments,
  transaction value, account, chain and transaction hash for each deployment.
- [x] Resume pending receipt tracking after reload, never resubmit automatically.
- [x] Verify on Sourcify/Etherscan using that immutable deployment build, reusing
  existing verification flows.
- [x] Retain deployment-linked build records even when trimming disposable caches.

### 8. Contract interaction — complete via Explorer link

- [x] Interact opens the existing full Contract Explorer.
- Embedded interaction panels and cross-domain ABI/source sharing are intentionally
  out of scope. Explorer already supports inferred interfaces for unverified
  contracts and manual ABI input; users can also verify their saved source.

### 9. Focused quality-of-life features

- [x] Optional auto-compile, inline Monaco diagnostics and click-to-jump errors.
- [x] Workspace-wide find/replace and search/replace keyboard shortcuts.
- [ ] Bounded local source revision history with preview and restore.
- [ ] Contract byte-size indicators and deployment-size limit warnings.
- [x] Import a verified contract into a new workspace.

## Storage architecture

IndexedDB stores workspace metadata, individual files, dependencies, builds and
deployment records as those features arrive. Keep stable file IDs separate from
names so rename operations do not discard editor models. Current schema has
workspaces/files stores and a workspace index to support later expansion.

Use separate caches for compiler binaries and rebuildable artifacts. Limit
cache/history growth; never evict original source files automatically. Preserve
schema migrations and atomic writes. Browser storage is origin-specific and can
be cleared or evicted: ZIP backups are the portable recovery path between
localhost, solidity.eth.sh, devices and browsers. OPFS/native folder access can
be considered later if real file size/performance needs justify them.

## References

- Remix file explorer: https://remix-ide.readthedocs.io/en/latest/file_explorer.html
- Remix compiler: https://remix-ide.readthedocs.io/en/latest/compile.html
- Solidity Standard JSON: https://docs.soliditylang.org/en/latest/using-the-compiler.html
- Browser storage: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

## Automatic compilation and inline diagnostics — implemented, under review

- Auto-compile starts enabled; a compact toolbar checkbox can disable it.
- Wait 750 ms after edits or entry changes, with one worker compile in flight.
- Coalesce pending edits; discard stale results across edits/workspace switches.
- Source import scanning and serialization run after the debounce, not on each
  keystroke. Reuse unchanged dependency graphs instead of recompiling them.
- Use native Monaco red error and yellow warning markers/tooltips. Convert solc
  UTF-8 byte ranges to UTF-16 editor positions in one pass per source.
- Clear stale markers as edits invalidate a build; clear resolved markers after
  successful checks. Apply each diagnostic to the correct source model only.
- Keep editing and source/workspace navigation available during compilation.
- Pause during deployment so auto-checks cannot replace its captured artifacts.

## Shared file explorer — implemented, under review

The compiler and source-code viewer share the Explorer panel/tree. Compiler
menus retain create/rename/move/delete, file Undo and ZIP import/export. Empty
editable folders remain visible and individually actionable; read-only viewers
retain compact folder chains and target/diff indicators. The compiler reuses
the existing source search panel with line navigation. Storage, file IDs and
editor tabs are unchanged. Both desktop and the mobile drawer use this shared UI.
The compiler Explorer retains its darker background and supports desktop width
resizing, keyboard adjustment and double-click reset alongside the output pane.

Scoped package paths (for example `@openzeppelin/contracts/...`) are accepted
as local workspace paths, including within collision-relocated imported folders.
Standard JSON containing bundled dependencies needs no network resolver. The
mock-token Standard JSON was checked with its pinned solc 0.8.28: all 21 sources
import and MockERC20/MockERC721/MockERC1155 compile successfully.

Import now uses a progress flow: Mode → Setup → Review. Setup is shown for
Standard JSON in a new workspace; Add files and ZIP imports go directly to Review.
Back preserves choices, setup validates compiler compatibility before advancing,
and only the final confirmation applies files. The destination, compiler, entry and collapsible source list appear on Review. Tested at 320px without overflow.

Import destinations are now Add files to current workspace (name) or Create new
workspace; replacement is no longer exposed. New workspaces use an editable,
collision-avoiding name derived from the filename. Current edits are flushed
before a single IndexedDB transaction creates the imported sources, folders,
compiler settings and active entry and selects the new workspace. Failures keep
the current workspace intact. Browser testing created mock-tokens with all 21
files and selected solc 0.8.28; tests cover persistence, switching and duplicate
name rollback.

Import Setup places the entry selector above compiler options. Entry changes
automatically choose the newest stable compiler satisfying its pragmas and
transitive local imports, while preserving imported settings. Exact pragmas
select exact releases. Commented/quoted pragmas are ignored. Async selection
cannot overwrite a newer entry or an explicit manual selection; unavailable
releases/settings show a manual-selection fallback. Browser checks confirmed
0.8.30 → 0.8.28 for MockTokens and automatic updates when changing entry files.

Shared source outline now appears below Files in both the compiler and the
contract source viewer. It groups contracts/interfaces/libraries and their
functions, constructors, variables, events, errors and nested types. Declaration
clicks reveal the source line; diff views navigate to the corresponding source.
Files, Outline and declaration groups collapse independently. Parsing runs only
for the active Solidity file in a debounced worker; stale responses cannot move
the cursor. Compiler mobile navigation closes the file drawer. Browser checks
covered editable/read-only navigation, mobile drawer actions and layout at 320px.
All 90 workspace tests, TypeScript and the production build passed.

Function selectors appear as native Monaco code lenses above public/external
functions in both compiler and read-only source editors. Clicking copies the
selector with temporary feedback. Canonical ABI types normalize aliases, payable
addresses, arrays and resolvable local structs/enums/value types. Unresolved
imports, unevaluated constant dimensions and library storage signatures are
omitted rather than hashed incorrectly. Parsing is debounced in a worker; model
and version checks reject stale results. Editor disposal removes providers,
commands, listeners and workers. Browser checks confirmed mint/transfer selectors,
clipboard copying and read-only file switching. All 95 workspace tests,
TypeScript and the production build passed.

Workspace actions now include Export Standard JSON directly after Import. It
exports every current source and compiler setting without selecting an entry or
compiling; the workspace name and solc version appear in the filename. Build
input downloads still reflect their captured compilation. Browser download
verification confirmed all 21 mock-token sources and current settings;
TypeScript and diff checks passed.

Missing npm imports now have an Install dependency code lens above the import
statement in the compiler. It shares the selector worker/debounce and opens the
existing Dependencies modal with the package and any installed version prefilled.
Installed source paths suppress the action immediately; comments, quoted import
examples, relative paths and known editable project directories do not suggest
packages. One page-level installer handles desktop, mobile and code-lens entry
points. Browser testing installed ERC721 from the annotation, compiled ExampleNFT
and confirmed the annotation disappeared. All 103 tests and typechecking passed.

Dependencies labels now have right-aligned actions: an npmjs package link and
Fetch latest beside Exact version. Latest-version metadata comes directly from
the npm registry in the browser and only fills the draft version; installation
remains explicit. Editing either field, changing the requested package or closing
the modal cancels/invalidates pending lookups. Browser checks confirmed the live
version lookup and a 320px layout; eight focused tests and typechecking passed.

Compilation failures use compact individual error cards with a readable message
and file/line/column; clicking a card opens the exact source location. The list
remains capped at min(60vh, 480px), and source excerpts/caret blocks are omitted.
Navigation in compiler and shared source viewers flashes the entire destination
line for 0.5 seconds, fading over another 400 ms; repeated navigation replaces
the previous cue and model/disposal cleanup clears it. Browser checks confirmed
card navigation, the visible highlight and subsequent removal. Focused card,
flash and Explorer tests and TypeScript passed.

GitHub dependencies share the existing modal, import code lenses, read-only tree
and removal flow. Repository plus commit/tag/branch is resolved once to a full
commit SHA. Fetch latest explicitly fills HEAD's SHA; installation stays separate.
Source downloads use immutable raw URLs, verify Git blob hashes from the commit's
file tree and save SHA-256 source locks. Truncated trees, symlinks/submodules,
unsafe paths and conflicting commit references fail without replacing sources.

Supported imports include github.com/owner/repo/path.sol, GitHub blob/raw URLs
and raw.githubusercontent.com URLs. URLs map to canonical local github.com paths
using captured compiler remappings, preserving source text and diagnostic offsets.
Standard JSON and ZIP round-trips retain those mappings/locks; language assistance
and compiler-version inference follow remapped local imports. Imports from other
repositories require separate installs. No GitHub credentials or server proxy are
used. Public GitHub API rate limits apply.

Browser acceptance installed ERC20, OwnableRoles and Ownable from Vectorized/solady
at 258f67cc71e39cff307b726939ade17e9d8bcf5c. SoladyToken compiled with solc
0.8.30, the installer closed, and the sources/commit persisted after reload.
The modal fits 320px. All 117 tests, TypeScript and production build passed.
References: https://github.com/Vectorized/solady and
https://docs.github.com/en/rest/git/trees#get-a-tree.

Resolved imports now show an Open file code lens. It opens or reselects the local
editor tab using the existing navigation flow, including relative, npm and
remapped GitHub sources. The shared read-only source viewer supports this action
as well. Missing dependencies keep their Install dependency action. Stale or
removed import targets cannot execute. Browser checks opened Solady ERC20 in the
compiler and OpenZeppelin ERC20 in the read-only viewer. Folder rows no longer
retain a selected background after clicking; only the active file stays selected.
The full 121-test suite passed for import navigation; subsequent focused Explorer
and CodeLens checks (12 tests) and TypeScript passed after the folder refinement.

Editor integrity follow-up: source editing now uses a native Monaco listener bound
by model URI and current workspace ID. The React wrapper receives defaultValue
instead of a controlled value/onChange pair, so switching into a read-only
library cannot route a programmatic setValue event through the previous file's
callback. Programmatic synchronization is suppressed, current-file/locked-path
checks are repeated before writing, and stale workspace callbacks are rejected.
Fast Refresh retains attached models and in-memory workspace edits; language
providers re-register on effect replay. Real unmount still releases models.
Deployment locks now also make the source editor read-only rather than dropping
edits while deployment is busy. The integrity audit covers autosave during an
in-flight write, storage failure recovery, revision conflicts, workspace switching,
read-only dependencies, model synchronization and effect replay.

All 129 tests, TypeScript and production build passed. Browser acceptance restored
the known Solady demo, opened the dependency through its code lens, switched back,
replayed hot reload while the dependency was active, then reloaded the page. The
custom token and dependency remained distinct in the exported Standard JSON.
Explicit import navigation also expands ancestors and reveals its file inside the
Files scroller, without scrolling the surrounding page or initial workspace load.

Compilation now keeps a session-only LRU of up to ten builds, bounded by a
16-million-character source/output budget. Returning to an unchanged file or
workspace restores output and diagnostics immediately, even when another file is
compiling. Cache checks compare entry identity, compiler settings, filenames and
transitive source contents without reparsing imports on each keystroke. Source,
import, remapping and settings changes invalidate affected results; manual Compile
still forces a rebuild. Failed explicit rebuilds cannot be hidden by old cached
successes. Deployment history must retain its own immutable builds independently
of this disposable cache. Browser checks switched between SoladyToken and its
ERC20 dependency with Compiled output visible immediately on each return.


Deployment history stores immutable source/settings/compiler-output snapshots and
per-attempt journals in a separate IndexedDB database. An atomic save must finish
before the wallet opens; unavailable storage prevents sending. Rejected wallet requests are discarded; pending transactions, confirmed
receipts, reverts and unavailable confirmations remain distinct. A returned hash is saved even if navigation has
unmounted the original form. If post-broadcast storage fails, the hash remains in
memory, the browser warns before close, and Download deployment / Retry saving
provide recovery without resending a transaction. Read-only receipt tracking
resumes on reload without a connected wallet; interrupted requests without a hash
say Check wallet. Cross-tab updates cannot downgrade terminal receipts or replace
an existing transaction hash. New history entries expand to show their address,
chain-explorer and local Interact links, arguments and deployment backup download.
History remains available when source edits invalidate or evict compiler builds.

Acceptance uses mocked wallet/receipt tests and a temporary responsive component
preview (removed after review). No live transaction was sent. Verification remains
the next separately reviewable part of feature 7.
Final validation: 150 tests, TypeScript and production build passed. The compiler
workspace was restored after the responsive preview, with SoladyToken source and
compiled output intact. Post-broadcast recovery also survives client-side route
navigation in a bounded-by-unsaved-attempts session buffer until IDB saving succeeds.

History cleanup: wallet rejections are removed automatically, including older
rejected entries on load. Unreferenced snapshots for rejected attempts are also
removed. Each deployment has Delete with a seven-second Undo action. Deletion
is recoverable locally and persists across reloads; a tombstone prevents late
wallet responses and receipts from resurrecting the entry. Undo preserves the
latest receipt state and shared build. Targeted deployment/storage/UI checks:
26 tests passed, plus TypeScript and diff checks.

Deployment downloads now contain only the exact saved Solidity Standard JSON
input (sources and compiler settings), suitable for explorer verification. The
button says Download Standard JSON and the filename includes the saved compiler
version. Transaction records, ABI, bytecode and raw compiler output stay in local
history instead of being bundled into the file. This replaces the earlier full
deployment-backup download. Storage warnings now ask users to keep the tab open
and retry saving, since a Standard JSON download does not preserve a transaction
hash.


Saved deployments now offer explicit Verify on Sourcify / explorer actions below
constructor arguments, outside their disclosure. No verification submits until a
provider is selected. Both tools share VerificationStatusRow and the existing
provider adapters. The mock-token Etherscan job engine was extracted into a shared
server service; compiler requests provide the saved Standard JSON, pinned compiler
version, exact constructor data and SPDX-derived license instead of fixed mock
artifacts. Server submission validates the mined successful creation transaction,
contract address and complete init calldata before sending source. Keys remain
server-only; Sourcify is called directly from the browser. Existing submission
locks, quotas, GUID polling, indexing/rate-limit backoff and unknown-delivery
handling remain shared with mock tokens. Status polls do not repeat source uploads.

Verification validation: 161 compiler tests, 22 mock-token UI tests and 19 Node
server/provider tests passed, plus TypeScript. A temporary component preview
confirmed placement with constructor arguments expanded/collapsed; it was removed.
No live verification submission was made during automated or browser checks.
Production build passed for the shared verification extraction and compiler API.

Verification checkpoints now persist per deployment/provider in IndexedDB:
source-input identity, state, provider GUID, queued/rate-limit details and timestamp.
Submission intent must save before POST. Reload restores confirmed/failed/delayed
rows; pending and interrupted submissions resume status checks only, never source
POSTs. An ambiguous Sourcify upload without a GUID checks published source and
requires an explicit Retry if delivery cannot be recovered. Etherscan resumes its
existing server job by source identity. Checkpoints merge atomically without
changing confirmed receipt details; verified status cannot be downgraded by a late
poll. Concurrent explorer saves and storage-failure retries retain both GUIDs.
No API keys or source payloads are duplicated in checkpoint metadata.
Validation: 170 compiler tests, 22 mock-token UI tests and TypeScript passed.
Production build passed for verification checkpoint persistence and recovery.


Verified-contract import lives beside the workspace’s three-dot menu. Address or recognized
explorer links plus a network fetch complete source through the existing
Etherscan/Sourcify/Blockscout/Routescan verification adapters. Review shows the
provider, exact compiler and entry path, with a collapsed source list and editable
workspace name. Creation uses the existing atomic new-workspace flow and switches
to it; no existing source is replaced. Verified compiler/settings are retained,
not inferred from pragma. Proxies import their own source with an explicit notice;
implementation imports are separate. Unsupported compiler versions and source
paths/settings fail before writes. Cancellation and field edits invalidate late
responses. Public source reads use server-configured provider keys; no keys are
returned. Imported sources remain local and editable, with no package installs.

Validation: all 179 compiler tests, TypeScript and the production build passed.
Live browser checks imported Dai on Ethereum, retained solc 0.5.12, compiled and
restored it after reload. Aave pool proxy lookup returned six files and solc
0.8.10 with the explicit proxy notice. Lookup/review controls fit a 320px viewport.
No wallet request, deployment or verification publication was made.


Verified-contract imports now save an Imported deployment entry in the new
workspace before it is adopted. The entry keeps its original network/address,
provider source link and immutable Standard JSON/settings snapshot. It works
before local compilation and after reload, without a wallet, receipt polling or
invented transaction/deployer/value fields. Imported snapshots retain contract identity and the verified constructor ABI,
without fabricating local compiler output. The existing Interact and download actions apply. Imported entries have no
Delete action; deletion and Undo remain available for compiler deployments. History save failure prevents workspace creation;
failed workspace creation rolls back its staged import entry. The previous
workspace stays unchanged. Validation: 184 compiler tests, TypeScript and the
production build passed; a live Dai import displayed its deployment immediately
and retained it after reload.


Compiler URL imports use `?address=0x…&chainId=1`. An address without chainId
opens the existing import modal for network selection. Both parameters fetch and
create the workspace/deployment without a review confirmation; failures remain
visible and no partial workspace is adopted. Imported workspace provenance is
saved with its metadata. Manual imports update the URL too, workspace switches
remove or restore only these parameters, and unrelated queries/hash are retained.
Reloading a matching imported workspace reuses it; matching stored workspaces
can be reopened without fetching or duplicating sources. Lookups cancel across
URL changes and effect replay; a stale completion cannot consume a newer link.
Validation: 192 compiler tests, TypeScript and production build passed. Browser
checks covered the address-only modal, automatic six-file Aave import, switching
to an ordinary workspace and back, and reload with the same workspace count.


Imported constructor arguments now decode against the verified constructor ABI,
with parameter names/types and values inside the existing collapsed disclosure.
New imports retain constructor metadata and decoded values in IndexedDB; uints
are serialized as decimal strings without precision loss. Etherscan, Sourcify
metadata and Blockscout share the constructor ABI extraction. Older entries read
their saved ABI, or fetch verified metadata only on expansion; edited workspace
sources are never used to guess an original constructor. If metadata is unavailable
or decoding fails, encoded data remains available. Validation: 198 compiler tests,
26 verification/provider tests and TypeScript passed. The existing Aave import
successfully displayed its decoded admin address in the browser.


Constructor parameters expose a two-line Reuse from prev deployment action only
when this workspace has deployment records. The modal lists decoded saved and
imported constructor arguments with right-arrow selection. Changed types, array
sizes, parameter order/names or nested tuple names disable reuse; names and types
are checked again when applying. Reuse fills positional form values with precise
integer strings and existing boolean/array/tuple shapes, resets validation, and
closes the modal without switching chains or submitting a wallet request. The
shared constructor loader handles saved ABIs and older imported records. Live
browser validation reused Aave's imported admin address into its constructor
input. All 204 compiler tests and the production build passed.

### Workspace-wide find and replace

- Reuses the shared Explorer search view; replacement controls are opt-in for
  editable compiler workspaces. Libraries remain searchable and read-only.
- Case-sensitive/literal/regex search, per-file or all editable files, reviewed
  before/after previews, and guarded Undo. Preview and Undo reject stale files.
- Search uses bounded results; replacement scans all matches, independent of
  display limits. Drafts survive switching Explorer/Search and opening the drawer.
- Cmd/Ctrl+Shift+F opens search; Cmd/Ctrl+Shift+H opens replace. Existing single-file
  Monaco search shortcuts remain available.
