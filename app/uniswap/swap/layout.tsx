import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Uniswap V4 Swap | ETH.sh",
  description: "Inspect pools, quote swaps, and swap tokens using Uniswap v4.",
  canonical: "https://uniswap.eth.sh/swap",
  images: "https://eth.sh/api/og/uniswap-swap",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
