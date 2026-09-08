import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Testnet Faucets | ETH.sh",
  description:
    "Find live Ethereum, Base, OP Stack, Arbitrum, Polygon, Unichain, Avalanche, BNB, ZKsync, Monad, and stablecoin testnet faucets.",
  images: "https://eth.sh/og/index.png",
});

const FaucetLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default FaucetLayout;
