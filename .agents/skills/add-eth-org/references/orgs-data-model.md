# /orgs Data Model

Use this reference when adding or updating organizations in the Ethereum Orgs directory.

## Main Files

- `app/orgs/data.ts`: canonical organization data, focus areas, and sources.
- `app/orgs/layout.tsx`: metadata, keywords, Open Graph, Twitter tags.
- `app/api/og/orgs/route.tsx`: dynamic OG image and logo/category overrides.
- `app/orgs/page.tsx`: logo overrides only when local assets are needed.
- `public/external/`: official logo assets that cannot reliably come from favicons.
- `DESIGN.md`: update only if behavior, layout, design policy, or page interaction changes.

## `EthereumOrg` Fields

Add one object to `ethereumOrgs`:

- `id`: kebab-case stable identifier, usually derived from the official name.
- `name`: official display name from the site.
- `shortName`: common acronym or compact display name used in focus-area badges.
- `handle`: X/Twitter handle with `@`.
- `website`: canonical official URL with trailing slash if the site uses one.
- `twitter`: canonical `https://x.com/{handle}` URL.
- `logoDomain`: bare domain for Google favicon lookup.
- `accent`: existing field; choose a reasonable brand/status color, but the UI should not rely on it.
- `category`: short focus tag in the table. Keep it scannable.
- `stage`: sourced lifecycle text, for example `Announced Jun 2026`, `Launched 2025`, `Formed 2024, incorporated 2025`.
- `role`: one sentence describing the org's ecosystem role.
- `summary`: one concise paragraph, neutral and source-grounded.
- `evidence`: exactly three bullets under "Research notes".
- `workstreams`: exactly three bullets.
- `watch`: exactly three bullets with meaningful open questions or things to monitor.
- `sources`: 3-5 official or high-signal source links for the expanded row.

## Focus Areas

Update `roleMap` after adding the org.

- Reuse an existing lane when the new org clearly fits.
- Add a new lane when the org represents a distinct ecosystem job.
- Keep lane labels short and descriptions compact.
- Include the new org id in `orgIds`.

## Source Trail

Update `sourceTrail` with 2-3 high-signal links for the new org.

Prefer:

- Official site/about page.
- A launch, FAQ, roadmap, funding, team, or docs page.
- Independent coverage only when it materially corroborates public facts.

Avoid adding every source from the row. The source trail is a compact audit trail.

## Metadata

Update `app/orgs/layout.tsx` when the org is important enough to affect search/social copy:

- Add name and acronym to `keywords`.
- Add the acronym/name to `description` only if the list still reads naturally.
- Keep the OG/Twitter image URL as `/api/og/orgs`.

## Logos

Default behavior:

- Set `logoDomain` and let the page/OG use `https://www.google.com/s2/favicons?...`.

Use a local asset when:

- The favicon is missing.
- The favicon is distorted or illegible.
- The official site provides a better favicon/logo SVG/PNG.

Local asset checklist:

- Save as `public/external/{id}.svg` or `.png`.
- Add the same override to both `logoSrcOverrides` maps in `app/orgs/page.tsx` and `app/api/og/orgs/route.tsx`.
- Use official source assets only. Do not use X avatars unless the official site clearly uses the same mark and no better source exists.

## OG Image

After adding an org:

- Add an `ogCategoryLabels` entry if `category` is long.
- Regenerate `/api/og/orgs` to a PNG and visually inspect it.
- If rows clip, reduce row height/font size carefully or use a shorter OG-only category label.

## Verification Commands

Run from the repo root:

```bash
pnpm exec prettier --write app/orgs/data.ts app/orgs/page.tsx app/orgs/layout.tsx app/api/og/orgs/route.tsx DESIGN.md
pnpm exec tsc --noEmit
curl -L http://localhost:3000/api/og/orgs -o /tmp/orgs-og.png && file /tmp/orgs-og.png
pnpm exec playwright screenshot --viewport-size=1440,1000 http://localhost:3000/orgs /tmp/orgs-desktop.png
```

Run `pnpm build` before committing or when metadata, OG routes, or shared layout behavior changed.
