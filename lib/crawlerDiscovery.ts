import { getFaucetChainSeoEntries } from "@/app/faucet/chains";
import { getPublicPageUrls } from "@/lib/seo";

/** Only checked-in public routes are eligible; never reflect untrusted URLs. */
export function getSitemapUrls(host: string | null): string[] {
  const hostname = host?.toLowerCase().replace(/:\d+$/, "");
  return [
    ...getPublicPageUrls(),
    ...getFaucetChainSeoEntries().map(
      ({ slug }) => `https://faucet.eth.sh/${slug}`
    ),
  ].filter((url) => new URL(url).hostname === hostname);
}

export function getRobotsText(host: string | null): string {
  const urls = getSitemapUrls(host);
  const origin = urls[0] ? new URL(urls[0]).origin : null;
  return [
    "User-Agent: *",
    "Allow: /",
    "Allow: /api/og/",
    ...[
      "/api/",
      "/7702beat/test",
      "/test",
      "/wallet/signatures/view",
      "/signatures/view",
      "/skills/new",
      "/new",
    ].map((path) => `Disallow: ${path}`),
    ...(origin ? [`Sitemap: ${origin}/sitemap.xml`] : []),
    "",
  ].join("\n");
}
