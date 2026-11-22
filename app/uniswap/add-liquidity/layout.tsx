import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Uniswap V4 Add Liquidity | ETH.sh",
  description: "Configure price ranges and add liquidity to Uniswap v4 pools.",
  canonical: "https://uniswap.eth.sh/add-liquidity",
  images: "https://eth.sh/api/og/uniswap-add-liquidity",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
