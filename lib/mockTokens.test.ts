import assert from "node:assert/strict";
import test from "node:test";
import { Interface } from "ethers";
import {
  buildMockDeployment,
  MOCK_CHAINS,
  sendMockDeployment,
} from "./mockTokens";
import { MOCK_ARTIFACTS } from "./mockTokens.generated";
import { walletChains } from "../data/chains";
import { chainIdToChain } from "../data/common";
test("deployment choices cover the shared catalog and have RPC and explorer URLs", () => {
  assert.deepEqual(
    MOCK_CHAINS.map((chain) => chain.id).sort((a, b) => a - b),
    Object.values(chainIdToChain)
      .filter(
        (chain) =>
          chain.blockExplorers?.default.url && chain.rpcUrls.default.http.length
      )
      .map((chain) => chain.id)
      .sort((a, b) => a - b)
  );
  assert.equal(
    new Set(walletChains.map((chain) => chain.id)).size,
    walletChains.length
  );
});
test("every supported mock deployment network is available in the site's wallet selector", () => {
  for (const chain of MOCK_CHAINS)
    assert.ok(
      walletChains.some((c) => c.id === chain.id),
      String(chain.id)
    );
});

const account = "0x1111111111111111111111111111111111111111";
export const draft = {
  standard: "ERC20",
  chainId: "11155111",
  name: "Token",
  symbol: "TKN",
  initialSupply: "1.5",
  recipient: account,
  uri: "",
} as const;
test("ERC20 deployment is a zero-value creation using exact base units and the entered token identity", () => {
  const request = buildMockDeployment(draft);
  assert.equal(request.chain.id, 11155111);
  assert.equal(request.name, "Token");
  assert.equal(request.symbol, "TKN");
  assert.equal(request.value, 0n);
  const artifact = MOCK_ARTIFACTS.ERC20;
  const oracle = new Interface(artifact.abi);
  assert.equal(
    request.data,
    artifact.bytecode +
      oracle
        .encodeDeploy(["Token", "TKN", account, 1500000000000000000n])
        .slice(2)
  );
  assert.equal(MOCK_CHAINS.find((c) => c.id === 1)?.testnet, undefined);
});

test("all three constructors match independent ethers encoding and preserve the configured names", () => {
  for (const standard of ["ERC20", "ERC721", "ERC1155"])
    for (const chain of MOCK_CHAINS) {
      const deployment = buildMockDeployment({
        ...draft,
        standard,
        chainId: String(chain.id),
        uri: "ipfs://mock/{id}",
      });
      const oracle = new Interface(deployment.artifact.abi);
      assert.equal(
        deployment.data,
        deployment.artifact.bytecode +
          oracle.encodeDeploy(deployment.args).slice(2)
      );
      assert.equal(deployment.name, draft.name);
      assert.equal(deployment.symbol, draft.symbol);
      assert.equal(deployment.value, 0n);
    }
});
test("input validation preserves exact uint256 supply and rejects ambiguous or unsafe drafts", () => {
  for (const [field, values] of Object.entries({
    chainId: ["", "01", "9007199254740991", "1e0"],
    standard: ["ERC777", ""],
    name: ["", "a".repeat(65), "Misleading\u202e", "line\nbreak"],
    symbol: ["", "white space", "a".repeat(17), "token$"],
    recipient: [
      "0x0000000000000000000000000000000000000000",
      "not-an-address",
      "vitalik.eth",
      "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48",
    ],
    initialSupply: [
      "-1",
      "1e18",
      ".5",
      "01",
      "1.",
      "1.0000000000000000001",
      " 1",
      (2n ** 256n).toString(),
    ],
  }))
    for (const value of values)
      assert.throws(
        () => buildMockDeployment({ ...draft, [field]: value }),
        `${field}: ${value}`
      );
  const supply = "9007199254740993.000000000000000001";
  assert.equal(
    buildMockDeployment({ ...draft, initialSupply: supply }).args[3],
    9007199254740993000000000000000001n
  );
  for (const uri of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "http://insecure",
    "https://white space",
    "ipfs://",
    "ipfs://" + "x".repeat(513),
  ])
    assert.throws(() =>
      buildMockDeployment({ ...draft, standard: "ERC1155", uri })
    );
  for (const uri of [
    "",
    "ipfs://fixture/{id}.json",
    "https://example.invalid/{id}",
    "ar://fixture",
  ])
    assert.doesNotThrow(() =>
      buildMockDeployment({ ...draft, standard: "ERC1155", uri })
    );
});
test("direct deployment rechecks wallet identity and leaves fee estimation to the wallet", async () => {
  const deployment = buildMockDeployment(draft);
  const seen: unknown[] = [];
  const hash = `0x${"ab".repeat(32)}` as const;
  const client = {
    getChainId: async () => 11155111,
    getAddresses: async () => [account] as const,
    sendTransaction: async (request: unknown) => {
      seen.push(request);
      return hash;
    },
  };
  assert.equal(await sendMockDeployment(deployment, account, client), hash);
  assert.deepEqual(seen, [
    { chain: deployment.chain, account, data: deployment.data, value: 0n },
  ]);
  await assert.rejects(
    sendMockDeployment(deployment, account, {
      ...client,
      getChainId: async () => 1,
    }),
    /network changed/
  );
  await assert.rejects(
    sendMockDeployment(deployment, account, {
      ...client,
      getAddresses: async () => [],
    }),
    /network changed/
  );
  await assert.rejects(
    sendMockDeployment(deployment, account, {
      ...client,
      getAddresses: async () => ["0x2222222222222222222222222222222222222222"],
    }),
    /network changed/
  );
  assert.equal(seen.length, 1);
});
