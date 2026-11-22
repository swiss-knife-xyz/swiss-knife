import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Uniswap V4 Positions | ETH.sh",
  description: "View and manage your Uniswap v4 liquidity positions.",
  canonical: "https://uniswap.eth.sh/positions",
  images: "https://eth.sh/api/og/uniswap-positions",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
