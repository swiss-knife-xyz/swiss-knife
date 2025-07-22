import { getMetadata } from "@/utils";
import { Metadata } from "next";

const _metadataInfo = {
  title: "DSProxy Connect | Swiss-Knife.xyz",
  description:
    "Connect your DSProxy contract to any dapp via WalletConnect and execute transactions.",
  images: "https://swiss-knife.xyz/og/wallet-ds-proxy.png",
};

export const metadata: Metadata = {
  ...getMetadata(_metadataInfo),
};

const DSProxyLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default DSProxyLayout;
