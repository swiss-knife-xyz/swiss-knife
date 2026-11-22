import assert from "node:assert/strict";
import test from "node:test";
import {
  c,
  chainIdToChain,
  networkOptions,
  etherscanChains,
  explorerChains,
} from "./common";
import { RETIRED_CHAINS, isRetiredChain } from "./retiredChains";
import { walletChains } from "./chains";
import { addressExplorers } from "./addressExplorers";
import { txExplorers } from "./txExplorers";
import { MOCK_CHAINS } from "../lib/mockTokens";
import { RPC_CHAINS } from "../lib/rawRpc/chains";
import { VERIFICATION_CHAINS } from "../lib/verification/source";
import verificationNetworks from "../lib/verification/networks.json";
import { faucets } from "../app/faucet/faucets";
import { getFaucetChainNames } from "../app/faucet/chains";

test("retired chains cannot return through any shared selector or provider directory", () => {
  const registries = {
    catalog: Object.values(c).map((chain) => chain.id),
    publicClients: Object.keys(chainIdToChain),
    selector: networkOptions.map((option) => option.value),
    explorer: explorerChains.map((chain) => chain.id),
    etherscan: Object.values(etherscanChains).map((chain) => chain.id),
    wallets: walletChains.map((chain) => chain.id),
    deployment: MOCK_CHAINS.map((chain) => chain.id),
    rpc: RPC_CHAINS.map((chain) => chain.id),
    verification: Object.keys(VERIFICATION_CHAINS),
    verificationSnapshot: Object.keys(verificationNetworks),
    addressProviders: Object.values(addressExplorers).flatMap((data) =>
      Object.keys(data.chainIdToLabel)
    ),
    txProviders: Object.values(txExplorers).flatMap((data) =>
      Object.keys(data.chainIdToLabel)
    ),
    faucetVariants: faucets.flatMap(
      (faucet) =>
        faucet.variants?.flatMap((variant) => variant.chainId ?? []) ?? []
    ),
  };
  for (const [name, ids] of Object.entries(registries))
    for (const id of ids)
      assert.equal(
        isRetiredChain(id),
        false,
        `${name} still offers retired chain ${id}`
      );
  for (const data of [
    ...Object.values(addressExplorers),
    ...Object.values(txExplorers),
  ])
    assert.ok(
      Object.keys(data.chainIdToLabel).length,
      "No empty explorer modals"
    );
  for (const name of getFaucetChainNames())
    assert.ok(!/goerli|holesky|mumbai|scroll sepolia/i.test(name), name);
  for (const entry of Object.values(RETIRED_CHAINS))
    assert.ok(entry.reason && entry.source.startsWith("https://"));
});

test("current replacements are selectable without retiring Fantom Opera", () => {
  for (const id of [
    11155111, 560048, 11155420, 84532, 421614, 80002, 11142220, 59141, 3441006,
    167013, 2523, 1029, 999999999, 250,
  ]) {
    assert.ok(chainIdToChain[id], `Missing current chain ${id}`);
    assert.ok(
      walletChains.some((chain) => chain.id === id),
      `Wallet cannot switch to ${id}`
    );
    assert.ok(
      MOCK_CHAINS.some((chain) => chain.id === id),
      `Deployment missing ${id}`
    );
  }
  assert.equal(chainIdToChain[8217].name, "Kaia");
  assert.equal(
    chainIdToChain[2523].rpcUrls.default.http[0],
    "https://rpc.testnet.frax.com"
  );
});
