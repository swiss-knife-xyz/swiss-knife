import { getMetadata } from "@/utils";
import { Metadata } from "next";

const _metadataInfo = {
  title: "USDC Pay | Swiss-Knife.xyz",
  description:
    "Send USDC on Base without gas fees using x402 payment protocol. Powered by PayAI facilitator for gasless transfers.",
  images: "https://swiss-knife.xyz/og/usdc-pay.png",
};

// source: https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/app/frames/hello/page.tsx
const frame = {
  version: "next",
  imageUrl: "https://swiss-knife.xyz/og/usdc-pay.png",
  button: {
    title: "USDC Pay",
    action: {
      type: "launch_frame",
      name: "USDC Pay",
      url: `https://swiss-knife.xyz/usdc-pay`,
      splashImageUrl: `https://swiss-knife.xyz/splashImage.png`,
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

export default function USDCPayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
