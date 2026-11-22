import { getMetadata } from "@/utils";
import { Metadata } from "next";

const _metadataInfo = {
  title: "USDC Pay | ETH.sh",
  description:
    "Send USDC on Base without gas fees using x402 payment protocol. Powered by PayAI facilitator for gasless transfers.",
  canonical: "https://usdc-pay.eth.sh/",
  images: "https://eth.sh/api/og/usdc-pay",
};

// source: https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/app/frames/hello/page.tsx
const frame = {
  version: "next",
  imageUrl: "https://eth.sh/api/og/usdc-pay",
  button: {
    title: "USDC Pay",
    action: {
      type: "launch_frame",
      name: "USDC Pay",
      url: `https://usdc-pay.eth.sh/`,
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

export default function USDCPayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
