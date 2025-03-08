import { getMetadata } from "@/utils";

const _metadataInfo = {
  title: "Wallet Bridge | Swiss-Knife.xyz",
  description: "Connect your mobile wallet to any desktop dapp.",
  images: "https://swiss-knife.xyz/og/wallet-bridge.png",
};

// source: https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/app/frames/hello/page.tsx
const frame = {
  version: "next",
  imageUrl: _metadataInfo.images,
  button: {
    title: "Wallet Bridge",
    action: {
      type: "launch_frame",
      name: "Wallet Bridge",
      url: `https://wallet.swiss-knife.xyz/bridge`,
      splashImageUrl: `https://swiss-knife.xyz/icon.png`,
      splashBackgroundColor: "#101010", // theme.ts: colors.bg[900]
    },
  },
};

export const metadata = {
  ...getMetadata(_metadataInfo),
  other: {
    "fc:frame": JSON.stringify(frame),
  },
};

const WalletBridgeLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default WalletBridgeLayout;
