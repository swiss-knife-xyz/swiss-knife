# Integration branch retirement

Audited on 2026-11-22 against `v2` at
`8db316ac1fd26700215c03c5d96a109ad08eb20e` (PR #232).

The historical `review/eth-sh/integration-base` branch ended at
`e43a78d5c0f8c78fc87a35ab8fd1cf9b2a0b327b`. Its 19 commits absent by identity
from `v2` include older implementations, superseded changes, and work still
tracked separately. Merging the branch wholesale would restore unreviewed work.

## Disposition

| Integration work | Current disposition |
| --- | --- |
| Address side drawer (#215) | Closed; replaced by reviewed persistent contract tabs in #230. |
| Bytes builder | Reviewed and merged in #216, including subsequent UX refinements. |
| Explorer route migration | Reviewed and merged in #217. |
| Cross-explorer verification | Reviewed and merged in #218 with expanded support. |
| Decoder example cards, snapshots, stale parameter state, mobile JSON | Restored to `v2` in #232 from reviewed #228. |
| Sourcify signature submission | Covered by reviewed #214 with newer modal styling. |
| Optional chain-aware decoder metadata (#223) | Superseded by #232. All 15 explicitly named original regression cases remain in the current metadata spec. |
| Chain explorer link beside loaded contract address | Distinct pending work in open #221. |
| Standalone tuple disclosure | Distinct pending work in open #222. |
| web3ctx listing | Pending in open #224. |
| Manual Safe transaction hash | Pending in open #225. |
| Cross-chain gas cost comparison | Pending in open #226. |
| Mock token deployment (#219), read-only RPC console (#220) | Closed, unmerged; source retained through their GitHub pull request refs. |
| Native tracer prerequisite | Retained in `review/eth-sh/dependency-tracer-base` at `15d7964c15c29c27408053258ffc8d5355bb5605`. |

The combined checkpoint and final merge introduce no separately missing feature.
No open pull request targets integration-base. Pending PRs remain separate;
retirement does not approve or merge them.

## Preservation and recovery

The final integration tree is byte-for-byte identical to GitHub's retained
`refs/pull/228/head` at `f42a345453bd0c07dcaf564d9919a5a479d2210b`.
All integration-only commits except its final merge are ancestors of that head.
Both the remote pull ref and tree equality were checked before retirement.

To recover the complete historical tree after branch deletion:

```sh
git fetch origin refs/pull/228/head
git switch -c codex/recover-integration-base FETCH_HEAD
```

## Verification

On the audited `v2` commit:

- 176 Vitest tests passed across contract forms (43), loading (15), bytes builder
  (18), tabs (18), route migration (5), cross-explorer verification (11),
  signature submission (9), decoder metadata/state (31), and sample UI (26).
- 127 Node tests passed for verification providers, signature registry, saved
  decoder snapshots, and SEO metadata.
- TypeScript passed with `tsc --noEmit`.
- PR #232 also verified desktop and mobile decoder examples in Chrome, including
  cached output without metadata/RPC enrichment and no horizontal overflow.

These checks verify local behavior and preservation. They do not represent a
deployment or re-approval of the pending features above.
