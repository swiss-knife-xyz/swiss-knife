---
name: add-rip-project
description: Research, add, update, or audit Web3 shutdown records in swiss-knife's R.I.P. directory at rip.eth.sh. Use for project shutdown announcements, X threads or roundup images, closure dates and reasons, retired products, and missing project logos in app/rip/data.ts.
---

# Add R.I.P. Project

Maintain a concise, source-backed archive of Web3 projects and products that shut down. Treat viral lists as leads: a listing is not proof of closure.

## Read first

- `app/rip/data.ts` for the current schema, categories, existing records and review date.
- `app/rip/data.test.ts` for validation and known false positives.
- `docs/rip/README.md` for archive conventions.
- [references/data-and-evidence.md](references/data-and-evidence.md) for field semantics, logo provenance and the file checklist.
- Relevant notes under `docs/rip/` when the candidate was researched before. Read `final-audit.md` for a broad audit; do not treat its historical conclusions as current verification.
- Read `app/rip/page.tsx` and `DESIGN.md` when a change affects rendering. Read `app/api/og/rip/route.tsx` only when the user requests social-preview changes or an existing featured record is renamed/removed.

## Research and edit

1. Check duplicates using names, previous names, handles, URLs and product/company relationships. Prefer updating an existing record; preserve stable IDs when correcting display names.
2. Browse current evidence before changing external facts. Start with the supplied URLs, then find the official project/founder announcement, closure notice, docs or governance decision. Use reputable reporting to corroborate or fill explicitly labeled gaps.
3. For X status links, use the available `read-twitter-posts` skill. Read expanded posts, thread continuations, quoted announcements, linked articles and attached images when they contain evidence. If unavailable, use accessible official pages or attributed copies and record the retrieval limit. Never infer a service-end date from the post timestamp.
4. Search for later notices before deciding status: cancellations, operator transfers, restarts, acquisitions and successor products can supersede the initial shutdown plan. Identify exactly what ended: company, DAO, chain, frontend, wallet, game or individual product.
5. Resolve announcement date, service-end date, status and stated reason separately. Preserve unknown dates; distinguish a withdrawal/migration deadline from an actual halt. A scheduled date passing is not confirmation of completed closure.
6. Add or update the record with concise, neutral copy and direct evidence URLs. Attribute the reason to the announcement; do not invent insolvency, failure or causal conclusions. Keep scope and date caveats in `dateNote`.
7. Download an authentic logo and record its provenance. Inspect it visually; ensure it belongs to the named project and renders legibly on the dark page. Follow the reference for local paths and framing.
8. Keep routine research in the record's `sources`, `dateNote` and concise copy, plus the existing logo ledger. Do not create per-project or per-batch research Markdown files for ordinary additions. For roundups, report each candidate as added, already covered, excluded or unresolved; update an existing exclusion ledger only when useful for future decisions. Create a separate document only when explicitly requested or when a substantial audit needs durable findings that do not fit the records or existing ledgers.

For research-only requests, deliver findings without modifying directory records. Routine additions should preserve Timeline/Grid, filters, modal design, subdomain routing and the curated OG order. Do not commit or push unless requested.

## Eligibility

- Include a named Web3 project or product when credible evidence establishes an actual shutdown or an announced wind-down.
- Bankruptcy proceedings, token delistings, inactivity, pivots, rebrands and bearish commentary alone are insufficient.
- Use product scope when the parent or successor continues; avoid counting a company and the same discontinued product twice without a distinct reason.
- Report excluded/unresolved candidates with reasons and sources; use an existing exclusion ledger when retaining them serves future research. Revisit them when new evidence arrives; exclusion is not permanent proof that a project cannot later close.

## Verify and report

- Format touched TS/TSX/MD/JSON files with `pnpm exec prettier --write`.
- Run `node --import tsx --test app/rip/data.test.ts` and `pnpm exec tsc --noEmit`.
- Run `git diff --check`. Run `pnpm build` for larger changes or before a requested commit.
- Inspect affected Timeline/Grid entries and the modal when logos, names or copy change; check narrow screens when layout is affected. If visual verification is unavailable, say so.
- Inspect `/api/og/rip` only when its curated content or rendering changes.
- Report added/updated IDs, exclusions, material uncertainty, source links and completed checks concisely. Do not duplicate evidence already captured in the records into extra documentation.
