import type { Metadata } from "next";
const title = "Read-only Raw RPC Console | ETH.sh";
const description =
  "Inspect raw Ethereum, Base, Arbitrum, OP and Sepolia JSON-RPC read results. Positive method allowlist, safe batches, fixed public providers and no wallet.";
const image = "https://eth.sh/api/og/rpc";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://eth.sh/rpc" },
  openGraph: {
    title,
    description,
    url: "https://eth.sh/rpc",
    type: "website",
    images: [{ url: image, width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description, images: [image] },
  robots: { index: true, follow: true },
};
export default function RpcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
