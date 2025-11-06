import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "USDC Pay | Swiss-Knife.xyz",
  description:
    "Send USDC on Base without gas fees using x402 payment protocol. Powered by PayAI facilitator for gasless transfers.",
  openGraph: {
    title: "USDC Pay | Swiss-Knife.xyz",
    description:
      "Send USDC on Base without gas fees using x402 payment protocol",
    images: "https://swiss-knife.xyz/og/usdc-pay.png",
  },
};

export default function USDCPayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
