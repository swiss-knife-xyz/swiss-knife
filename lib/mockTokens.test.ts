import assert from "node:assert/strict";
import test from "node:test";
import { Interface } from "ethers";
import {
  assertReviewReady,
  buildMockDeployment,
  estimateMockDeployment,
  MOCK_CHAINS,
  maximumCost,
  sendReviewedMock,
} from "./mockTokens";
import { MOCK_ARTIFACTS } from "./mockTokens.generated";
import { walletChains } from "../data/chains";
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
test("ERC20 deployment is a zero-value creation using exact base units and forced mock labels", () => {
  const request = buildMockDeployment(draft);
  assert.equal(request.chain.id, 11155111);
  assert.equal(request.name, "MOCK Token");
  assert.equal(request.symbol, "MOCK_TKN");
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

test("read-only estimation verifies RPC chain, adds a gas buffer and binds estimate to account and exact initcode", async () => {
  const deployment = buildMockDeployment(draft);
  const seen: unknown[] = [];
  const client = {
    getChainId: async () => 11155111,
    estimateGas: async (request: unknown) => {
      seen.push(request);
      return 100001n;
    },
    estimateFeesPerGas: async () => ({
      maxFeePerGas: 100n,
      maxPriorityFeePerGas: 2n,
    }),
    getBalance: async (request: unknown) => {
      seen.push(request);
      return 1000000000n;
    },
  };
  const estimate = await estimateMockDeployment(deployment, account, client);
  assert.equal(estimate.gas, 120002n);
  assert.equal(maximumCost(estimate), 12000200n);
  assert.deepEqual(seen, [
    { account, data: deployment.data, value: 0n },
    { address: account },
  ]);
  assert.doesNotThrow(() =>
    assertReviewReady(
      deployment,
      estimate,
      account,
      account,
      11155111,
      true,
      false
    )
  );
  assert.throws(
    () =>
      assertReviewReady(deployment, estimate, account, account, 1, true, true),
    /network changed/
  );
  assert.throws(
    () =>
      assertReviewReady(
        deployment,
        estimate,
        account,
        account,
        11155111,
        false,
        false
      ),
    /Confirm/
  );
  assert.throws(
    () =>
      assertReviewReady(
        deployment,
        estimate,
        account,
        account,
        11155111,
        true,
        false,
        estimate.createdAt + 60001
      ),
    /expired/
  );
  await assert.rejects(
    estimateMockDeployment(deployment, account, {
      ...client,
      getChainId: async () => 1,
    }),
    /RPC network/
  );
});

test("wallet submission rechecks live account/network and sends only the exact reviewed creation with bounded fees", async () => {
  const deployment = buildMockDeployment({ ...draft, chainId: "1" });
  const estimate = {
    gas: 1000000n,
    maxFeePerGas: 2n,
    maxPriorityFeePerGas: 1n,
    balance: 100000000n,
    createdAt: Date.now(),
  };
  const seen: unknown[] = [];
  const hash = `0x${"ab".repeat(32)}` as const;
  const client = {
    getChainId: async () => 1,
    getAddresses: async () => [account] as const,
    sendTransaction: async (request: unknown) => {
      seen.push(request);
      return hash;
    },
  };
  assert.equal(
    await sendReviewedMock(deployment, estimate, account, client),
    hash
  );
  assert.deepEqual(seen, [
    {
      chain: deployment.chain,
      account,
      data: deployment.data,
      value: 0n,
      gas: estimate.gas,
      maxFeePerGas: 2n,
      maxPriorityFeePerGas: 1n,
    },
  ]);
  await assert.rejects(
    sendReviewedMock(deployment, estimate, account, {
      ...client,
      getChainId: async () => 11155111,
    }),
    /network changed/
  );
  await assert.rejects(
    sendReviewedMock(deployment, estimate, account, {
      ...client,
      getAddresses: async () => ["0x2222222222222222222222222222222222222222"],
    }),
    /network changed/
  );
  await assert.rejects(
    sendReviewedMock(
      deployment,
      { ...estimate, createdAt: Date.now() - 60001 },
      account,
      client
    ),
    /expired/
  );
  assert.equal(seen.length, 1);
});

test("all three constructors match independent ethers encoding and names always carry MOCK", () => {
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
      assert.match(deployment.name, /^MOCK /);
      assert.match(deployment.symbol, /^MOCK_/);
      assert.equal(deployment.value, 0n);
    }
});
test("input validation preserves exact uint256 supply and rejects ambiguous or unsafe drafts", () => {
  for (const [field, values] of Object.entries({
    chainId: ["", "01", "999", "1e0"],
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
test("mainnet dual consent, disconnect, changed account, future/stale quote and insufficient funds all fail closed", () => {
  const deployment = buildMockDeployment({ ...draft, chainId: "1" });
  const estimate = {
    gas: 100n,
    maxFeePerGas: 2n,
    maxPriorityFeePerGas: 1n,
    balance: 200n,
    createdAt: Date.now(),
  };
  assert.throws(
    () =>
      assertReviewReady(deployment, estimate, account, account, 1, true, false),
    /Confirm/
  );
  assert.throws(
    () =>
      assertReviewReady(
        deployment,
        estimate,
        account,
        undefined,
        1,
        true,
        true
      ),
    /network changed/
  );
  assert.throws(
    () =>
      assertReviewReady(
        deployment,
        estimate,
        account,
        "0x2222222222222222222222222222222222222222",
        1,
        true,
        true
      ),
    /network changed/
  );
  assert.throws(
    () =>
      assertReviewReady(
        deployment,
        { ...estimate, balance: 199n },
        account,
        account,
        1,
        true,
        true
      ),
    /Insufficient/
  );
  assert.throws(
    () =>
      assertReviewReady(
        deployment,
        estimate,
        account,
        account,
        1,
        true,
        true,
        estimate.createdAt - 1
      ),
    /expired/
  );
  assert.doesNotThrow(() =>
    assertReviewReady(deployment, estimate, account, account, 1, true, true)
  );
});
