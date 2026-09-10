import type { Metadata } from "next";
import { getMetadata } from "@/utils";

export const metadata: Metadata = getMetadata({
  title: "Bridge Base Tokens to Robinhood Chain | ETH.sh",
  description:
    "Set up LayerZero OFT routes, bridge Base tokens to Robinhood Chain, and add ETH liquidity to Uniswap v4 pools.",
  images: "https://eth.sh/api/og/robin-bridge",
});

export default function RobinBridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
