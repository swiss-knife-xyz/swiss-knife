import type { Metadata } from "next";
const title = "Cross-explorer Verification | ETH.sh";
const description =
  "Transfer verified Solidity source between Etherscan, Blockscout, Routescan and Sourcify across mainnets and testnets. Select explorers and track verification results.";
const image = "https://eth.sh/api/og/verify";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://explorer.eth.sh/verify" },
  openGraph: {
    title,
    description,
    url: "https://explorer.eth.sh/verify",
    type: "website",
    images: [{ url: image, width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};
export default function VerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
