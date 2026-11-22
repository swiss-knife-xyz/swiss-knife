import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Uniswap V4 Tick to Price | ETH.sh",
  description: "Convert Uniswap v4 ticks into prices for any token pair.",
  canonical: "https://uniswap.eth.sh/tick-to-price",
  images: "https://eth.sh/api/og/uniswap-tick-to-price",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
