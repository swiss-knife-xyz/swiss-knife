import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Wallet Bridge | Swiss-Knife.xyz",
  description: "Connect your mobile wallet to any desktop dapp.",
  images: "https://swiss-knife.xyz/og/wallet-bridge.png",
});

const WalletBridgeLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default WalletBridgeLayout;
