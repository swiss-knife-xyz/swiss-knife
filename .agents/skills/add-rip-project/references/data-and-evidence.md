# Data and evidence conventions

Use the current `ShutdownProject` type in `app/rip/data.ts` as the schema authority.

## Fields

| Field               | Meaning                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | Stable lowercase hyphenated identity; check aliases and duplicate product scope.                                                                                                  |
| `name`              | Official recognizable name; qualify product scope when needed.                                                                                                                    |
| `category`          | Reuse the existing categories unless none fits.                                                                                                                                   |
| `status`            | `Closed` for evidenced completed closure; `Winding down` for an announced/incomplete wind-down; `Product retired` for a discontinued product whose parent or successor continues. |
| `announced`         | Exact sourced announcement date (`YYYY-MM-DD`), not an invented first-of-month value.                                                                                             |
| `dateKind`          | Set `Reporting` when `announced` is actually the available report's publication date rather than an original announcement.                                                        |
| `closed`            | Explicit service-end date, including a scheduled future date. Do not substitute token redemption, withdrawal or migration deadlines without evidence they are the service end.    |
| `dateNote`          | Explain phased closure, uncertain dates, scheduled deadlines, continuing products/contracts and date-source limitations.                                                          |
| `summary`           | One or two concise sentences describing the product and what ended.                                                                                                               |
| `reason`            | Short paraphrase of the stated reason; say it was not specified when evidence supplies none.                                                                                      |
| `website`, `social` | Authentic original site and X profile when recoverable. Do not use `#` or invent replacements for dead sites.                                                                     |
| `sources`           | Direct HTTPS evidence links labeled `Primary` or `Reporting`; use descriptive labels rather than search-result URLs.                                                              |

The timeline uses `closed`, otherwise `announced`; records without either stay undated. The page compares scheduled dates to `archiveReviewedAt`. Advance that review date only to the date of an actual review and check affected scheduled records before doing so; it is a dataset review reference, not a per-record verification timestamp. A narrow update does not imply every historical source was rechecked.

When only a month/year is known, leave exact date fields absent and explain the supported precision in `dateNote`. Never take the year from a roundup heading without verifying the original announcement. Preserve meaningful time zones and phased milestones in the note.

## Logo recovery

1. Prefer official brand assets, the official site's icon, or the official X profile image. Follow the evidence trail to establish identity before downloading.
2. Save under `public/external/rip/<id>.<extension>` and use `/external/rip/<id>.<extension>` in `logo`. Confirm the bytes are an image, not an HTML error page, and inspect the visible mark.
3. Add/update the matching asset in `docs/rip/logo-provenance.json` with `id`, `local`, original source URL(s), and retrieval date. The ledger has a historical top-level `retrievedAt`; preserve it and add a per-asset `retrievedAt` for new or refreshed assets rather than redating old downloads.
4. Use `logoBackground` when the authentic mark needs contrast. Use `logoFrame` for an official graphic with excess whitespace or a wordmark crop; preserve the original file and record source dimensions plus the in-bounds crop rectangle. Inspect framing in both page views and the modal.
5. Do not generate or substitute a lookalike brand mark. If recovery fails, record the candidate in `docs/rip/missing-logos.json`, report the gap, and avoid calling validation complete: the current tests require every published record to have a downloaded logo with provenance. Do not weaken that invariant merely to pass a new entry.

## Evidence notes and exclusions

Keep durable source URLs and short findings in `docs/rip/`; temporary retrieval files are not the only evidence record. Preserve source dates separately from retrieval dates. Record inaccessible articles, missing thread continuations and conflicting reports explicitly.

Existing exclusions illustrate decisions, not a permanent blacklist. If later primary evidence justifies adding an excluded project, update the relevant notes and the false-positive test together. Examples worth checking in the historical audit: GENSO's operator transfer superseded its termination plan; Moonbeam's migration deadline was not a verified final block; Angle's stablecoin wind-down did not close Merkl.

## File checklist

- `app/rip/data.ts`: public records and justified review-date changes.
- `public/external/rip/`: recovered authentic marks.
- `docs/rip/logo-provenance.json`: matching IDs, local paths and source URLs.
- `docs/rip/`: focused research/exclusion notes; update README totals if its catalog count changes. Do not rewrite historical audit counts as if they were current audits.
- `app/rip/data.test.ts`: adjust an exclusion only when new evidence supersedes it; keep identity/date/logo checks intact.
- `app/api/og/rip/route.tsx`: curated `featuredProjectIds` are independent of timeline order. Routine new entries should not alter the featured set; reconcile renamed/deleted featured records without silently substituting others.
- `app/rip/layout.tsx`: already contains page-specific metadata and OG/Twitter images. Routine data updates do not require new metadata or routing configuration.
