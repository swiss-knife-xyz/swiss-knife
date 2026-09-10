import { MetadataRoute } from "next";
import subdomains from "@/subdomains";
import { getFaucetChainSeoEntries } from "@/app/faucet/chains";

export default function sitemap(): MetadataRoute.Sitemap {
  const allPaths: string[] = [];

  Object.keys(subdomains).map((key) => {
    const subdomain = subdomains[key];

    allPaths.push(`https://${subdomain.base}.eth.sh/`);

    if (subdomain.paths) {
      subdomain.paths.map((path: string) => {
        allPaths.push(`https://${subdomain.base}.eth.sh/${path}`);
      });
    }

    if (subdomain.base === "faucet") {
      getFaucetChainSeoEntries().map(({ slug }) => {
        allPaths.push(`https://faucet.eth.sh/${slug}`);
      });
    }
  });

  return allPaths.map((path) => ({
    url: path,
    lastModified: new Date(),
  }));
}
