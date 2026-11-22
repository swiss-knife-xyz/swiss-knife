import type { Metadata } from "next";

const title = "Cross-chain Gas Cost Estimate | ETH.sh";
const description =
  "Estimate a mined transaction’s gas-only cost at another chain’s current gas price, using the same gas used. Native token and optional USD, not an execution simulation.";
const canonical = "https://converter.eth.sh/gas-cost";
const images = ["https://eth.sh/api/og/gas-cost"];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, images, type: "website" },
  twitter: { card: "summary_large_image", title, description, images },
};

export default function GasCostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
