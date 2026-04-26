import { MetadataRoute } from "next";
import subdomains from "@/subdomains";

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
  });

  return allPaths.map((path) => ({
    url: path,
    lastModified: new Date(),
  }));
}
