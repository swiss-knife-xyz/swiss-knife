import type { Metadata } from "next";
import { getMetadata } from "@/utils";
import { buildFaucetSeo } from "./seo";

export const getFaucetMetadata = (chain?: string): Metadata => {
  const seo = buildFaucetSeo(chain);
  const metadata = getMetadata({
    title: seo.title,
    description: seo.description,
    images: seo.image,
  });

  return {
    ...metadata,
    alternates: {
      canonical: seo.canonicalUrl,
    },
    keywords: seo.keywords,
    openGraph: {
      ...metadata.openGraph,
      title: seo.title,
      description: seo.description,
      url: seo.canonicalUrl,
      images: seo.image,
    },
    twitter: {
      ...metadata.twitter,
      title: seo.title,
      description: seo.description,
      images: seo.image,
    },
  };
};
