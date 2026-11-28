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
  alchemyTraceNetworks,
  preferAlchemyTrace,
  publicTraceRpcOverrides,
} from "./networks";
import * as legacy from "./common";
import { walletChains } from "./chains";
import { RPC_ENDPOINTS } from "@/lib/rawRpc/chains";
import { RETIRED_CHAINS } from "./retiredChains";
import { VERIFICATION_CHAINS, providersFor } from "@/lib/verification/source";

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
    image: "/chainIcons/network.svg",
  });
  expect(getNetworkOptions([999999123])).toEqual([]);
  expect(getRpcUrlsForChain(999999123)).toEqual([]);
  expect(getNetworkName(999999123, "Provider-only chain")).toBe(
    "Provider-only chain"
  );
  expect(getNetworkIcon(999999123, "/provider.svg")).toBe("/provider.svg");
});
it("keeps provider-only names and logos without enabling their RPCs", () => {
  expect(getNetworkName(153)).toBe("Redbelly Testnet");
  expect(getNetworkName(13322)).toBe("FIFA Blockchain");
  expect(getNetworkName(6911)).toBe("Nibiru Testnet-2");
  expect(getNetworkIcon(1301)).toBe(getNetworkIcon(130));
  expect(getNetworkIcon(88882)).toBe("/chainIcons/chiliz.svg");
  expect(getNetworkIcon(2741)).toBe("/chainIcons/abstract.svg");
  expect(getRpcUrlsForChain(153)).toEqual([]);
  expect(getNetworkOptions([{ id: 153, name: "Chain 153", testnet: true }])[0].label).toBe("Redbelly Testnet");
});
it("preserves covered importer networks with named options and a logo or neutral fallback", () => {
  for (const id of [25, 40, 122, 204, 250, 314, 1088, 42170, 1313161554])
    expect(providersFor(String(id))).toContain("sourcify");
  const options = getNetworkOptions(Object.entries(VERIFICATION_CHAINS).map(
    ([id, chain]) => ({ id: Number(id), name: chain.name, testnet: chain.testnet })
  ));
  expect(options.length).toBe(Object.keys(VERIFICATION_CHAINS).length);
  for (const option of options) {
    expect(option.label).not.toMatch(/^Chain \d+$/);
    expect(option.image).toBeTruthy();
  }
  expect(VERIFICATION_CHAINS[153].testnet).toBe(true);
  expect(VERIFICATION_CHAINS[6911].testnet).toBe(true);
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

it("keeps hosted trace routing explicit and limited to registered networks", () => {
  for (const [id, slug] of Object.entries(alchemyTraceNetworks)) {
    expect(networkRegistry[Number(id)]).toBeTruthy();
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  }
  for (const id of preferAlchemyTrace) expect(alchemyTraceNetworks[id]).toBeTruthy();
  expect(alchemyTraceNetworks[8453]).toBe("base-mainnet");
  expect(alchemyTraceNetworks[369]).toBeUndefined();
});
it("uses the catalog public mainnet endpoint when no public env override is configured", () => {
  const previous = chainIdToCustomRpcUrl[1];
  chainIdToCustomRpcUrl[1] = undefined;
  try { expect(getRpcUrlsForChain(1)[0]).toBe("https://eth.drpc.org"); }
  finally { chainIdToCustomRpcUrl[1] = previous; }
});

it("uses verified public endpoints only for the trace policy", () => {
  for (const [id, urls] of Object.entries(publicTraceRpcOverrides)) {
    const chainId = Number(id);
    expect(networkRegistry[chainId]).toBeTruthy();
    expect(getRpcUrlsForChain(chainId, "trace")[0]).toBe(urls![0]);
    expect(new Set(getRpcUrlsForChain(chainId, "trace")).size).toBe(getRpcUrlsForChain(chainId, "trace").length);
  }
  expect(getRpcUrlsForChain(369, "configured")).not.toContain("https://rpc.degenprotocol.io");
  expect(getRpcUrlsForChain(369, "public")).not.toContain("https://rpc.degenprotocol.io");
  expect(getRpcUrlsForChain(999999123, "trace")).toEqual([]);
});
