"use client";

import SmartWalletConnect from "../_smart-wallet-connect/SmartWalletConnect";
import { dsProxyConfig } from "./config";

export default function DSProxyPage() {
  return <SmartWalletConnect config={dsProxyConfig} />;
}
