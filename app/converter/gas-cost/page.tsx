"use client";

import { networks } from "@/data/networks";
import { getPublicClient } from "@/lib/publicClient";
import {
  loadGasCostEstimate,
  type GasCostInput,
} from "@/lib/gasCostEstimateRead";
import { readNativeUsdPrice } from "@/lib/gasCostPrice";
import { GasCostEstimator } from "./GasCostEstimator";

const chains = networks;

function loadEstimate(input: GasCostInput) {
  return loadGasCostEstimate(input, {
    getClient: (chainId) => getPublicClient(chainId, { timeout: 8000 }),
    getUsdPrice: readNativeUsdPrice,
    now: Date.now,
  });
}

export default function GasCostPage() {
  return <GasCostEstimator chains={chains} loadEstimate={loadEstimate} />;
}
