import { expect, it, afterEach, vi } from "vitest";
import {
  networks,
  networkRegistry,
  networkOptions,
  c,
  getNetworkOptions,
  getGroupedNetworkOptions,
  getNetworkName,
  getNetworkIcon,
  getRpcUrlsForChain,
  chainIdToCustomRpcUrl,
} from "./networks";
import * as legacy from "./common";
import { walletChains } from "./chains";
import { RPC_ENDPOINTS } from "@/lib/rawRpc/chains";
import { RETIRED_CHAINS } from "./retiredChains";

afterEach(() => vi.restoreAllMocks());
it("resolves every wallet, catalog and selector entry through one registry without duplicate IDs", () => {
  expect(new Set(networks.map((chain) => chain.id)).size).toBe(networks.length);
  for (const chain of [...walletChains, ...Object.values(c)]) {
    expect(networkRegistry[chain.id]).toBeTruthy();
    expect(getNetworkName(chain.id)).toBe(networkRegistry[chain.id].name);
  }
  for (const chain of walletChains)
    expect(chain).toBe(networkRegistry[chain.id]);
  expect(legacy.chainIdToChain).toBe(networkRegistry);
  expect(legacy.networkOptions).toBe(networkOptions);
});
it("excludes retired networks even when a provider still lists them", () => {
  for (const id of Object.keys(RETIRED_CHAINS).map(Number)) {
    expect(networkRegistry[id]).toBeUndefined();
    expect(getNetworkOptions([{ id, name: "Retired provider entry" }])).toEqual(
      []
    );
  }
});
it("retains tool-specific restrictions, normalizes known identities and supports provider-only networks", () => {
  expect(
    getNetworkOptions([8453, 1, 8453]).map((option) => option.value)
  ).toEqual([1, 8453]);
  const options = getNetworkOptions([
    { id: 1, name: "Stale provider name" },
    { id: 999999123, name: "Provider-only chain" },
  ]);
  expect(options[0].label).toBe(networkRegistry[1].name);
  expect(options[1]).toEqual({
    value: 999999123,
    label: "Provider-only chain",
    image: undefined,
  });
  expect(getNetworkOptions([999999123])).toEqual([]);
  expect(getRpcUrlsForChain(999999123)).toEqual([]);
  expect(getNetworkName(999999123, "Provider-only chain")).toBe(
    "Provider-only chain"
  );
  expect(getNetworkIcon(999999123, "/provider.svg")).toBe("/provider.svg");
});
it("groups mainnets and testnets without changing what the tool supports", () => {
  const groups = getGroupedNetworkOptions([
    networkRegistry[1],
    networkRegistry[11155111],
    { id: 999999123, name: "Provider testnet", testnet: true },
  ]);
  expect(groups[0].options.map((option) => option.value)).toEqual([1]);
  expect(groups[1].options.map((option) => option.value)).toContain(11155111);
  expect(groups[1].options.map((option) => option.value)).toContain(999999123);
  expect(getGroupedNetworkOptions([networkRegistry[1]], true)[0].label).toBe(
    "Testnets"
  );
});
it("prioritizes configured RPCs while retaining public fallbacks and never exposing configured URLs in the console", () => {
  const previous = chainIdToCustomRpcUrl[1];
  chainIdToCustomRpcUrl[1] = "https://configured.example/private-key";
  try {
    const urls = getRpcUrlsForChain(1);
    expect(urls[0]).toBe("https://configured.example/private-key");
    expect(urls.length).toBeGreaterThan(1);
    expect(getRpcUrlsForChain(1, "public")).not.toContain(urls[0]);
    expect(Object.values(RPC_ENDPOINTS)).not.toContain(urls[0]);
    expect(new Set(urls).size).toBe(urls.length);
  } finally {
    chainIdToCustomRpcUrl[1] = previous;
  }
});
it("keeps a public endpoint and artwork for every selectable RPC network", () => {
  for (const chain of networks) {
    expect(getRpcUrlsForChain(chain.id, "public")[0]).toMatch(/^https?:\/\//);
    expect(getNetworkIcon(chain.id)).toBeTruthy();
  }
});
