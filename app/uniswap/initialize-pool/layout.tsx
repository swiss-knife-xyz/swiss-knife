import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Uniswap V4 Initialize Pool | ETH.sh",
  description: "Configure tokens, fees, tick spacing, and initial prices for Uniswap v4 pools.",
  canonical: "https://uniswap.eth.sh/initialize-pool",
  images: "https://eth.sh/api/og/uniswap-initialize-pool",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
