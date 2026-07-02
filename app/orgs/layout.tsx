import type { Metadata } from "next";

const title = "Ethereum Orgs Directory | ETH.sh";
const description =
  "A researched directory of Ethereum Foundation, Ethlabs, EAG, EEZ, Argot, Ethereum Institutional, ECF, EEI, and other Ethereum stewardship organizations.";
const siteUrl =
  process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
    ? "http://localhost:3000"
    : "https://eth.sh";
const pageUrl = `${siteUrl}/orgs`;
const imageUrl = `${siteUrl}/api/og/orgs`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "Ethereum organizations",
    "Ethereum Foundation",
    "Ethlabs",
    "Ethereum Applications Guild",
    "Ethereum Economic Zone",
    "Argot Collective",
    "Ethereum Institutional",
    "Ethereum Community Foundation",
    "ECF",
    "European Ethereum Institute",
    "EEI",
  ],
  alternates: {
    canonical: "/orgs",
  },
  openGraph: {
    type: "website",
    url: pageUrl,
    siteName: "ETH.sh",
    title,
    description,
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: "Ethereum Orgs Directory by ETH.sh",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@swissknifexyz",
    title,
    description,
    images: [imageUrl],
  },
  robots: "index, follow",
};

const OrgsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default OrgsLayout;
