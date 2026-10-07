# Final project audit — October 7, 2026

Reviewed every record's identity, product/company scope, status, announcement date, service-end date, summary, reason, source labels and local logo provenance against the linked evidence and existing research notes. Re-fetched all 59 linked X posts: 58 were readable and the UX post remained unavailable. Recovered all 16 linked article bodies after normalizing legacy HTTP article links for retrieval. Visually inspected the ZeroLend and Pudgy Party announcement images. Reopened non-X evidence, using search-indexed versions where original pages redirected or failed.

## Corrections

- **Angle Protocol:** corrected the display name and added its official website and current redemption notice. Stablecoin wind-down is scheduled for March 2027; Merkl continues separately.
- **GENSO Online:** excluded the game-wide closure record. The original February termination plan was superseded by an April operator-transfer MOU and a June 4 signed agreement to transfer operations to Hanabitei and resume service. The current site describes the new operator. A temporary suspension/transfer is not a permanent game shutdown. Its earlier logo asset remains as historical research provenance.
  - [Signed operator transfer agreement](https://prd-mng-home.genso.game/en/news/detail/?seq=5135335a77616849634c7950315332796f75645574413d3d)
  - [April transfer MOU](https://genso.game/en/news/detail/?seq=51734a474b4a75697673627175596a6d566c424d49773d3d)
- **Moonbeam (Polkadot chain):** removed July 31 as an exact closure date. It was the published migration/transition deadline. August 11 infrastructure reporting describes an apparent halt around August 10 but explicitly could not verify the final block. Retained product-retirement scope; Moonbeam/GLMR continues on Base.
  - [Infrastructure halt report](https://github.com/nightswatchhq/graph-support/issues/14)
- **Radiant Capital DAO:** clarified that DAO operations wind down while the protocol remains in maintenance mode. Its official notice describes two 2024 exploits, not only the October incident.

The remaining entries had no additional established contradiction in the retrieved evidence. This is an evidence review, not independent onchain confirmation of every planned shutdown. Future closures remain scheduled, unknown dates remain absent, and product retirements do not imply closure of the parent organization.

## Retrieval and evidence limits

- UX Chain: original post still unavailable; retained reporting date and later governance caveat.
- Step App, Colony and Entropy: the opening post text is recoverable, but full continuation remains unavailable; complementary reporting and existing caveats remain necessary.
- Slingshot: its Help Center failed fresh retrieval through both web and direct read (timeout/TLS error). Dates remain based on the prior research pass, not freshly re-confirmed.
- Coinflare: the current manual-withdrawal page yielded only its title; its fuller historical notice could not be freshly re-confirmed. Retained unspecified announcement and final closure dates.
- DL News: original page returns 404; the indexed DLNews-authored Yahoo copy remains recoverable.
- GENSO and Moonbeam: some original pages redirect or fail while indexed/legacy official content remains readable; later notices take precedence over original plans.
- Catalog: March 9 has no year on the official page; the year remains explicitly attributed to the secondary registry.
- Buck and Voodoo: current official closure notices confirm shutdown but provide no exact date.

The directory contains **81 records** following this audit. All remaining local logo files and provenance references pass the data checks. See `data.test.ts` for identity, date, evidence and logo validations.
