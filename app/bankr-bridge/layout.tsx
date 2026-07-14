import type { Metadata } from "next";
import { getMetadata } from "@/utils";

export const metadata: Metadata = getMetadata({
  title: "BANKR Bridge | Base ↔ Robinhood",
  description:
    "Bridge BANKR between Base and Robinhood Chain through the official LayerZero OFT route.",
  images: "https://eth.sh/api/og/bankr-bridge",
});

export default function BankrBridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
