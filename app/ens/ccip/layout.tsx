import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "ENS CCIP | Swiss-Knife.xyz",
  description:
    "Visualize off-chain ENS name resolution via CCIP and see the delay at each step (ERC-3668).",
  images: "https://swiss-knife.xyz/og/ens-ccip.png",
});

const ENSHistoryLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ENSHistoryLayout;
