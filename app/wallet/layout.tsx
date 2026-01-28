import { WalletLayout as WalletLayoutC } from "./WalletLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Wallet | ETH.sh",
  description: "Wallet Bridge: connect your mobile wallet to any desktop dapp.",
  images: "https://eth.sh/og/wallet-bridge.png",
});

const WalletLayout = ({ children }: { children: React.ReactNode }) => {
  return <WalletLayoutC>{children}</WalletLayoutC>;
};

export default WalletLayout;
