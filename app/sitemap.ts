import { MetadataRoute } from "next";
import subdomains from "@/subdomains";

export default function sitemap(): MetadataRoute.Sitemap {
  const allPaths: string[] = ["https://swiss-knife.xyz/"];

  // These category roots only redirect to a tool; advertise the destination instead.
  const redirectRoots = new Set([
    "calldata",
    "converter",
    "transact",
    "uniswap",
    "foundry",
    "wallet",
    "ens",
    "safe",
    "solidity",
  ]);

  Object.values(subdomains).forEach((subdomain) => {
    if (!redirectRoots.has(subdomain.base)) {
      allPaths.push(`https://${subdomain.base}.swiss-knife.xyz/`);
    }

    subdomain.paths.forEach((path: string) => {
      allPaths.push(`https://${subdomain.base}.swiss-knife.xyz/${path}`);
    });
  });

  return allPaths.map((path) => ({
    url: path,
    lastModified: new Date(),
  }));
}
