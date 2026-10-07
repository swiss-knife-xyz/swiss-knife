# Web3 Graveyard

The directory lives at `/rip` in development and is canonical at `https://rip.eth.sh/`. The shared subdomain registry supplies host rewrites, navigation, homepage discovery and sitemap inclusion. DNS and production deployment must be configured separately.

## Maintaining the archive

Records live in `app/rip/data.ts`. Every public record must link to evidence of the named project or product's shutdown. Prefer an original announcement from the project or founder; secondary reporting may support a record but must be labeled. Roundup graphics are discovery material, not enough by themselves to establish closure dates.

- `announced` is the date of the sourced announcement.
- `closed`, when known, is an explicit service-end date, including a scheduled future date. The timeline uses this date; otherwise it uses `announced` and visibly labels the date as an announcement.
- `dateNote` explains phased closure, approximate dates, surviving contracts, or future deadlines.
- `Closed` means the stated shutdown or service end has occurred. A wind-down without a final closure confirmation stays `Winding down`.
- `Product retired` identifies a discontinued product, chain or service when the parent organization or successor continues.
- Reasons are attributed summaries of announcements, not independent financial or legal conclusions.
- Bankruptcy, a token delisting, a pivot, a rebrand, or an inactive social account alone is insufficient evidence of a project shutdown.

Downloaded logos are stored under `public/external/rip/`. Keep their original URL, source and retrieval date in the research ledger. Logos identify historical projects; the archive does not imply endorsement. When a logo cannot be recovered, use the project's initials.

The supplied-source ledger and candidate exclusions preserve coverage and uncertainty. The archive now contains 84 records with recovered brand logos, including the subsequent POAP, Balancer and Artizen additions. The October 7 final audit covered the preceding 81-record set. The initial 82-record pass included GENSO Online, subsequently excluded after official operator-transfer and resumption notices superseded its termination plan. Assets are stored locally with their sources in the logo ledger. Gifts.Fun uses a framed wordmark from its original official graphic; the source image is preserved unaltered. Images are served through Next.js optimization at their displayed size. See `supplied-sources.md`, `logo-provenance.json`, and the research/exclusion notes in this folder. Review scheduled closures after their deadlines before marking them closed; passage of time alone does not confirm that a shutdown occurred.

## Views

Timeline is the first and default view. It groups filtered records by month and shows each project's summary and explicitly labeled date. Dates use service end where known, otherwise announcement; undated records appear in a separate section. Expanded details expose reasons, date caveats, primary sources and original sites. Grid shows a compact stack of each project's logo, name and date. Both views share search and category/status filters and show newest dates first. Category dropdown counts describe only this curated archive.

Funding adds sortable financial columns with the same search/category/status filters. On narrow screens, rows become compact financial cards. Project details show individual funding rounds, source links, revenue periods, coverage and scope notes. Timeline remains the default view.

## Financial evidence

`financial-sources.json` contains manually reviewed provider mappings and sourced announcement/reporting rounds. `financial-snapshot.json` preserves the captured DefiLlama funding records and daily revenue series. `app/rip/financial-data.json` contains only the derived figures needed by the UI; raw daily histories are not sent to the browser.

Funding sums only amounts in sourced rounds, in USD, and is **not a verified lifetime total**. DefiLlama public protocol profiles provide funding records; primary company/investor announcements supplement coverage, with reputable original reporting used where needed. Round labels are preserved without inferring financing instruments. Unknown amounts remain absent, not zero. Approximate USD equivalents are marked with ≈ on both the round and its summed funding figure; node and token sales retain their financing labels. Ctrl/XDEFI’s USDC IDO proceeds use nominal $1 per USDC, as explained in its scope note. Latest sourced raise means the latest round in these sources, not proof that no subsequent financing occurred. Dates are provider-recorded or announcement/reporting dates, not independently verified closing dates. Yupp's announcement date is explicitly distinguished from its reported 2024 closing year.

Revenue uses DefiLlama's `dailyRevenue` series, not fees, TVL, trade volume, token valuations or company income. Definitions vary by adapter: protocol revenue generally includes treasury/team and token-holder receipts, while chain metrics may represent burned fees or gas fees minus settlement costs. Per-record scope notes and methodology links explain this. [DefiLlama definitions](https://docs.llama.fi/analysts/data-definitions) and [funding methodology](https://github.com/DefiLlama/DefiLlama-Adapters/discussions/7093) describe provider limitations.

Peaks sum complete UTC calendar months/years in the captured history, retain negative daily revenue and require every day to have a finite value. Missing/null days disqualify a period; they are never filled with zero. Current days/periods are excluded. Past service-end dates cap observations; closed projects without an exact end date use the announcement as a conservative cutoff. Ongoing wind-downs use the financial review date. These are **peak observed** figures, not verified lifetime peaks; annual revenue is never extrapolated from a month. Coverage can begin late or end before shutdown. No complete year is displayed as “No complete period.” No verified evidence is displayed as “Not verified,” not “Not disclosed” unless a sourced round explicitly has no amount.

Mappings use exact provider IDs and names, not fuzzy name matching. Legend Trade is not the archived Legend app; Rodeo lending is not the archived social collecting platform. Parent financing/revenue is not assigned to retired products such as Magic Eden Wallet. Slingshot's own pre-acquisition funding is in scope. Angle revenue covers the stablecoin protocol, excluding Merkl. Funding coverage is partial even where figures exist; unverified projects stay visible with explicit gaps.

Regenerate derived figures without network access:

```sh
pnpm exec tsx scripts/refreshRipFinancials.ts --from-snapshot
```

Refresh mapped DefiLlama records locally using an explicit review date:

```sh
pnpm exec tsx scripts/refreshRipFinancials.ts --as-of=YYYY-MM-DD
pnpm exec prettier --write app/rip/financial-data.json docs/rip/financial-snapshot.json
```

The refresh validates source identities and responses before writing; failed requests preserve existing figures. Manual announcements remain curated and are not fetched/reverified by that command. Review scopes and manual evidence when refreshing. Validate with `node --import tsx --test app/rip/data.test.ts app/rip/financials.test.ts`.

Useful future views include a year histogram that filters the directory, and lifespans for projects with reliable launch dates.
