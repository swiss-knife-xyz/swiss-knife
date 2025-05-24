import { getMetadata } from "@/utils";
import { Metadata } from "next";
import { headers } from "next/headers";

const _metadataInfo = {
  title: "Web3 App Store | Swiss-Knife.xyz",
  description:
    "Your Web3 Operating System - Access any dapp with the power of Swiss-Knife decoder as middleware.",
  images: "https://swiss-knife.xyz/og/web3-app-store.png",
};

export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const fullUrl = headersList.get("x-url-with-params");
  const url = fullUrl ? new URL(fullUrl) : null;
  const urlParam = url?.searchParams.get("url");

  const baseMetadata = getMetadata(_metadataInfo);

  if (!urlParam) {
    return baseMetadata;
  }

  // If URL param exists, use dynamic OG image
  const ogImageUrl = `https://swiss-knife.xyz/api/og/app-store?url=${encodeURIComponent(
    urlParam
  )}`;

  // source: https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/app/frames/hello/page.tsx
  const frame = {
    version: "next",
    imageUrl: ogImageUrl,
    button: {
      title: "Wallet Bridge",
      action: {
        type: "launch_frame",
        name: "Launch Dapp",
        url: `https://swiss-knife.xyz/wallet/bridge/apps?url=${encodeURIComponent(
          urlParam
        )}`,
        splashImageUrl: `https://swiss-knife.xyz/splashImage.png`,
        splashBackgroundColor: "#101010", // theme.ts: colors.bg[900]
      },
    },
  };

  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      images: [ogImageUrl],
    },
    twitter: {
      ...baseMetadata.twitter,
      images: [ogImageUrl],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

const AppsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default AppsLayout;
