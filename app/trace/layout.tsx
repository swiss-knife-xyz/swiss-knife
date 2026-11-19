import type { Metadata } from "next";
const title = "Transaction Tracer | ETH.sh";
const description =
  "Inspect real nested Ethereum transaction execution with callTracer: ordered calls, delegatecalls, reverted internal frames and raw data. Experimental public RPC access.";
const image = "https://eth.sh/api/og/trace";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://explorer.eth.sh/trace" },
  openGraph: {
    title,
    description,
    url: "https://explorer.eth.sh/trace",
    type: "website",
    images: [{ url: image, width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};
export default function TraceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
