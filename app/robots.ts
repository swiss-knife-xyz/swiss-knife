import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og/"],
      disallow: [
        "/api/", "/7702beat/test", "/test", "/wallet/signatures/view",
        "/signatures/view", "/skills/new", "/new",
      ],
    },
    sitemap: "https://eth.sh/sitemap.xml",
  };
}
