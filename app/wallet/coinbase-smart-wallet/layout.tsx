import { getMetadata } from "@/utils";
import { Metadata } from "next";

const _metadataInfo = {
  title: "Coinbase Smart Wallet | ETH.sh",
  description:
    "Connect your Coinbase Smart Wallet contract to any dapp via WalletConnect and execute transactions with your recovery address.",
  canonical: "https://wallet.eth.sh/coinbase-smart-wallet",
  images: "https://eth.sh/og/base.png", // TODO: generate image
};

export const metadata: Metadata = {
  ...getMetadata(_metadataInfo),
};

const CoinbaseSmartWalletLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default CoinbaseSmartWalletLayout;
