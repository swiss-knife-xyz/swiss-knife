import { MetadataRoute } from "next";
import subdomains from "@/subdomains";

export default function sitemap(): MetadataRoute.Sitemap {
  const allPaths: string[] = [];

  Object.keys(subdomains).map((key) => {
    // @ts-ignore
    const subdomain = subdomains[key];

    allPaths.push(`https://${subdomain.base}.swiss-knife.xyz/`);

    if (subdomain.paths) {
      subdomain.paths.map((path: string) => {
        allPaths.push(`https://${subdomain.base}.swiss-knife.xyz/${path}`);
      });
    }
  });

  return allPaths.map((path) => ({
    url: path,
    lastModified: new Date(),
  }));
}
