import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uniswap V4 Positions | ETH.sh",
  description: "View and manage your Uniswap V4 liquidity positions",
};

export default function PositionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
