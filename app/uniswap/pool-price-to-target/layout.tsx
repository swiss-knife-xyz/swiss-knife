import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Uniswap V4 Pool Price to Target | ETH.sh",
  description: "Calculate swaps needed to move a Uniswap v4 pool toward a target price.",
  canonical: "https://uniswap.eth.sh/pool-price-to-target",
  images: "https://eth.sh/api/og/uniswap-pool-price-to-target",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
