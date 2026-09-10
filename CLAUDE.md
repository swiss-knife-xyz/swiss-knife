# Claude guidance for this repo

## Styling

**Always read [`STYLING.md`](./STYLING.md) before making any UI changes.** It defines the design system, color tokens, typography, and component patterns. Key rules:

- **No gradients** in headings, backgrounds, or icon tiles. Use solid colors from the token system.
- Tool pages use the professional blue theme (`primary.500` / `blue.400` accents on solid backgrounds).
- Use existing components (`InputField`, `DarkButton`, `DarkSelect`, `Card`, `TabsSelector`) instead of rolling new ones.
- Inside nested containers, use `whiteAlpha.*` for backgrounds/borders — never `bg.base` / `bg.subtle`.

## Page structure

- Tool pages live under `app/<subdomain>/<tool>/` with `page.tsx`, `layout.tsx` (metadata via `getMetadata`), and a `*Page.tsx` client component.
- Register new tool paths in `subdomains.js` and add them to the relevant sidebar in `app/<subdomain>/<Subdomain>Layout.tsx`.
- OG image convention: `public/og/<subdomain>-<tool>.png`, referenced as `https://eth.sh/og/<subdomain>-<tool>.png` in the layout metadata.
