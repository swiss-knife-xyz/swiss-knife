"use client";

import SmartWalletConnect from "../_smart-wallet-connect/SmartWalletConnect";
import { coinbaseSmartWalletConfig } from "./config";

export default function CoinbaseSmartWalletPage() {
  return <SmartWalletConnect config={coinbaseSmartWalletConfig} />;
}
