# Legacy redirect announcement

Append `migration=swiss-knife` to public-page redirects from Swiss-Knife.xyz to
ETH.sh. This reserved query field enables a shared, dismissible announcement:

> Swiss-Knife.xyz is now ETH.sh
>
> Your Ethereum toolkit has a new home. Bookmark this address for next time.

Examples:

```text
https://eth.sh/?migration=swiss-knife
https://calldata.eth.sh/decoder?calldata=0x1234&chainId=1&migration=swiss-knife
https://explorer.eth.sh/1/0x1234?migration=swiss-knife
https://wallet.eth.sh/signatures?migration=swiss-knife#sign?messageToSign=hello
```

The marker is checked on every app page through the root providers, including
the homepage and tool subdomains. Normal visits and other marker values do not
show the banner. The hidden `/_storage` hub bypasses the app providers entirely.

Dismissal removes only `migration` with a shallow history replacement, preserving
the route, other query values, and hash. It does not add a browser history entry,
reload the tool, or scroll the page. No persistent dismissal or cross-domain
storage is needed; another explicitly marked arrival shows the banner again.

## Redirect implementation contract

- Preserve existing tool parameters and append or set `migration=swiss-knife`.
  Use a URL builder rather than string concatenation so existing queries work.
- Keep the marker in the query, before any fragment. Do not overwrite fragments
  used by signatures or other tools.
- This field is reserved for migration messaging, not a tool input.
- Do not add the field to APIs, image assets, storage frames, canonical metadata,
  sitemap URLs, or permanent internal links.
- Legacy redirect activation is separate; this change only prepares the new site.

Local preview: `http://localhost:3000/?migration=swiss-knife`.

Verification: `pnpm exec vitest run --config vitest/vitest.navigation.config.ts`
and `pnpm exec tsc --noEmit`.
