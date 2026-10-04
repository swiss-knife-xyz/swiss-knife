import type { MetadataRoute } from "next";
import { getFaucetChainSeoEntries } from "@/app/faucet/chains";
import { getPublicPageUrls } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...getPublicPageUrls(),
    ...getFaucetChainSeoEntries().map(({ slug }) => `https://faucet.eth.sh/${slug}`),
  ].map((url) => ({ url }));
}
