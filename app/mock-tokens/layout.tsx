import type { Metadata } from "next";
const title = "Deploy Mock ERC20, ERC721 & ERC1155 Tokens | ETH.sh";
const description =
  "Deploy clearly labeled permissionless-mint mock tokens on explicitly selected testnets or mainnets. Review parameters, public nature and real gas costs before wallet confirmation.";
const image = "https://eth.sh/api/og/mock-tokens";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://eth.sh/mock-tokens" },
  openGraph: {
    title,
    description,
    url: "https://eth.sh/mock-tokens",
    type: "website",
    images: [{ url: image, width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};
export default function MockTokensLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
