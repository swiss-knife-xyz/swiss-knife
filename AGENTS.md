# Repository Notes

- For every new page or tool created under `app/`, add page-specific metadata in the nearest `layout.tsx` using `getMetadata` or a typed Next.js `Metadata` export.
- New public pages/tools must include a page-specific Open Graph image served by a Next.js OG API route under `app/api/og/<slug>/route.tsx`. Wire that route into the layout metadata `images` field for both Open Graph and Twitter cards.
- Do not ship new pages with the generic `https://eth.sh/og/index.png` image unless the page is intentionally generic or temporary.
