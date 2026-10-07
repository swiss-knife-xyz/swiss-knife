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

The supplied-source ledger and candidate exclusions preserve coverage and uncertainty. The archive now contains 83 records with recovered brand logos, including the subsequent POAP and Balancer additions. The October 7 final audit covered the preceding 81-record set. The initial 82-record pass included GENSO Online, subsequently excluded after official operator-transfer and resumption notices superseded its termination plan. Assets are stored locally with their sources in the logo ledger. Gifts.Fun uses a framed wordmark from its original official graphic; the source image is preserved unaltered. Images are served through Next.js optimization at their displayed size. See `supplied-sources.md`, `logo-provenance.json`, and the research/exclusion notes in this folder. Review scheduled closures after their deadlines before marking them closed; passage of time alone does not confirm that a shutdown occurred.

## Views

Timeline is the first and default view. It groups filtered records by month and shows each project's summary and explicitly labeled date. Dates use service end where known, otherwise announcement; undated records appear in a separate section. Expanded details expose reasons, date caveats, primary sources and original sites. Grid shows a compact stack of each project's logo, name and date. Both views share search and category/status filters and show newest dates first. Category dropdown counts describe only this curated archive.

Useful future views include a year histogram that filters the directory, and lifespans for projects with reliable launch dates. Funding comparisons should wait for verified amounts and consistent definitions; a zero or missing value must never imply a project had no funding.
