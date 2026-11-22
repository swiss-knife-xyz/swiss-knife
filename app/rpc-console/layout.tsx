import type { Metadata } from "next";
const title = "Read-only Raw RPC Console | ETH.sh";
const description =
  "Query JSON-RPC data across supported EVM mainnets and testnets, with request examples and formatted responses.";
const image = "https://eth.sh/api/og/rpc-console";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://eth.sh/rpc-console" },
  openGraph: {
    title,
    description,
    url: "https://eth.sh/rpc-console",
    type: "website",
    images: [{ url: image, width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description, images: [image] },
  robots: { index: true, follow: true },
};
export default function RpcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
