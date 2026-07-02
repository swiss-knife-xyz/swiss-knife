---
name: add-eth-org
description: Research and add or update Ethereum ecosystem organizations in the swiss-knife /orgs directory. Use when the user provides an Ethereum org website, X/Twitter handle, launch post, or asks to populate app/orgs/data.ts with a new foundation, lab, guild, collective, public-goods org, adoption group, or other Ethereum stewardship organization.
---

# Add ETH Org

## Overview

Add a new Ethereum organization to `/orgs` with the same standard used for the existing directory: researched, source-backed, concise, and easy to scan.

Use this skill when the user gives a website and X/Twitter handle, a launch post, or enough identifiers to research an Ethereum-aligned organization.

## Workflow

1. Read the current implementation:
   - `app/orgs/data.ts`
   - `app/orgs/page.tsx`
   - `app/orgs/layout.tsx`
   - `app/api/og/orgs/route.tsx` only when the user explicitly asks to change the social preview image
   - `DESIGN.md` when UI behavior or copy changes

2. Research before editing. Prefer primary sources:
   - Official website, about/FAQ/team/blog/funding/docs pages.
   - Official X/Twitter profile and launch/status posts when available.
   - GitHub/docs/project pages linked by the org.
   - Reputable independent coverage only to corroborate dates, funding, contributors, or launch context.

3. Capture evidence, not vibes:
   - Identify the official name, short name, handle, website, category, launch/incorporation stage, role, concrete workstreams, and source URLs.
   - Use exact dates when available. If only a year/month is sourced, say that; do not invent precision.
   - Keep claims neutral and source-grounded. Avoid promotional phrasing from the org unless paraphrased and supported.

4. Update the data model and related surfaces. Read `references/orgs-data-model.md` for field requirements and file checklist.

5. Verify visually and technically:
   - `pnpm exec prettier --write` on touched TS/TSX/MD files.
   - `pnpm exec tsc --noEmit`.
   - Screenshot `/orgs` when row length, logo, category, or focus-area content changes.
   - Regenerate and inspect `/api/og/orgs` only if the OG route itself was intentionally changed.
   - Run `pnpm build` for larger changes or before committing.

## Research Rules

- Browse the web every time. Org status, websites, teams, and launch context are time-sensitive.
- Preserve direct source links in `sources` and `sourceTrail`; do not cite only search snippets.
- Use the user-provided website and handle as starting points, not as proof by themselves.
- If the X profile is inaccessible, rely on official site links and web-indexed copies, and note the limitation in the final response.
- If evidence is thin, add a conservative row with fewer claims rather than padding.

## Editing Rules

- Keep the page design intact. Do not redesign `/orgs` while adding data.
- Do not add search/filter/stat sections.
- Do not commit unless the user asks.
- Prefer official favicons via `logoDomain`. Add a local `public/external/{id}.svg` or `.png` only when the official favicon is missing, distorted, or materially worse than an official mark.
- The OG image uses a curated featured set to avoid clutter. Do not add routine new orgs to `featuredOgOrgIds`, `logoSrcOverrides`, or `ogCategoryLabels` in `app/api/og/orgs/route.tsx` unless the user explicitly asks for the social image to change.
