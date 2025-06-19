import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "ENS CCIP | ETH.sh",
  description:
    "Visualize off-chain ENS name resolution via CCIP and see the delay at each step (ERC-3668).",
  images: "https://eth.sh/og/ens-ccip.png",
});

const ENSHistoryLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ENSHistoryLayout;
