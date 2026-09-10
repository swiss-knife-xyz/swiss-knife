import { getMetadata } from "@/utils";
import { Metadata } from "next";

const _metadataInfo = {
  title: "Wallet Bridge | ETH.sh",
  description: "Connect your mobile wallet to any desktop dapp.",
  images: "https://eth.sh/og/wallet-bridge.png",
};

// source: https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/app/frames/hello/page.tsx
// FIXME: update farcaster.json to use eth.sh
const frame = {
  version: "next",
  imageUrl: "https://eth.sh/frame/wallet-bridge.png",
  button: {
    title: "Wallet Bridge",
    action: {
      type: "launch_frame",
      name: "Wallet Bridge",
      url: `https://wallet.eth.sh/bridge`,
      splashImageUrl: `https://eth.sh/splashImage.png`,
      splashBackgroundColor: "#101010", // theme.ts: colors.bg[900]
    },
  },
};

export const metadata: Metadata = {
  ...getMetadata(_metadataInfo),
  other: {
    "fc:frame": JSON.stringify(frame),
  },
};

const WalletBridgeLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default WalletBridgeLayout;
