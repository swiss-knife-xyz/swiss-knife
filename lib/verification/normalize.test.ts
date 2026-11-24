import { test } from "node:test";
import assert from "node:assert/strict";
import { importEtherscanSource, importSourcifySource } from "./normalize";
import {
  parseExplorerInput,
  providersFor,
  VERIFICATION_CHAINS,
} from "./source";
import { etherscanFixture, sourcifyFixture, normalized } from "./testHelpers";
import { address, fixture } from "./fixtures";
for (const wrapper of ["standard", "double", "multifile", "single"]) {
  test(`normalizes ${wrapper} Etherscan source with exact settings`, () => {
    const raw = structuredClone(etherscanFixture);
    const row = raw.result[0];
    if (wrapper === "double") row.SourceCode = "{" + row.SourceCode + "}";
    if (wrapper === "multifile")
      Object.assign(row, {
        SourceCode: JSON.stringify(JSON.parse(normalized.sourceCode).sources),
        OptimizationUsed: "1",
        Runs: "123",
        EVMVersion: "paris",
      });
    if (wrapper === "single")
      Object.assign(row, {
        SourceCode: fixture.source_code,
        OptimizationUsed: "0",
        Runs: "200",
        EVMVersion: "Default",
      });
    const source = importEtherscanSource(raw);
    assert.equal(source.contractName, normalized.contractName);
    assert.equal(source.compilerVersion, normalized.compilerVersion);
    assert.equal(source.constructorArguments, "1234");
    if (["standard", "double"].includes(wrapper))
      assert.deepEqual(
        JSON.parse(source.sourceCode),
        JSON.parse(normalized.sourceCode)
      );
  });
}
test("Sourcify v2 import preserves source, match quality, constructor arguments and linked libraries", () => {
  const raw = structuredClone(sourcifyFixture);
  const source = importSourcifySource(raw);
  assert.equal(source.contractName, normalized.contractName);
  assert.equal(source.constructorArguments, "1234");
  assert.equal(source.partial, false);
  assert.equal(source.licenseType, "3");
  const linked = importSourcifySource({
    ...raw,
    runtimeBytecode: {
      transformationValues: { libraries: { "lib/L.sol:L": address } },
    },
    match: "match",
  });
  assert.equal(linked.partial, true);
  assert.equal(
    JSON.parse(linked.sourceCode).settings.libraries["lib/L.sol"].L,
    address
  );
});
test("malformed, unverified, unsupported compilers and ambiguous targets fail without flattening or guessing", () => {
  for (const change of [
    { SourceCode: "" },
    { CompilerVersion: "latest" },
    { ContractName: "A:B:C" },
    {
      SourceCode:
        '{"language":"Vyper","sources":{"Example.vy":{"content":"x"}},"settings":{}}',
    },
    {
      SourceCode:
        '{"language":"Solidity","sources":{"Example.sol":{"urls":["https://evil.test"]}},"settings":{}}',
    },
  ]) {
    const raw = structuredClone(etherscanFixture);
    Object.assign(raw.result[0], change);
    assert.throws(() => importEtherscanSource(raw));
  }
  assert.throws(() =>
    importSourcifySource({ ...sourcifyFixture, match: null })
  );
  assert.throws(() =>
    importSourcifySource({
      ...sourcifyFixture,
      compilation: { ...sourcifyFixture.compilation, compiler: "solar" },
    })
  );
  const raw = structuredClone(etherscanFixture);
  raw.result[0].SourceCode = JSON.stringify({
    language: "Solidity",
    sources: {
      "A.sol": { content: "contract Example {}" },
      "B.sol": { content: "contract Example {}" },
    },
    settings: {},
  });
  raw.result[0].ContractFileName = "";
  assert.throws(() => importEtherscanSource(raw));
});
test("recognized explorer URLs resolve to allowed providers, chains and addresses", () => {
  for (const [url, provider, chainId] of [
    [`https://etherscan.io/address/${address}#code`, "etherscan", "1"],
    [
      `https://base-sepolia.blockscout.com/address/${address}?tab=contract`,
      "blockscout",
      "84532",
    ],
    [`https://repo.sourcify.dev/11155111/${address}`, "sourcify", "11155111"],
    [
      `https://routescan.io/address/${address}?chainid=43114`,
      "routescan",
      "43114",
    ],
    [
      `https://testnet.routescan.io/address/${address}?chainid=43113`,
      "routescan",
      "43113",
    ],
  ])
    assert.deepEqual(parseExplorerInput(url), { address, provider, chainId });
  for (const url of [
    `https://etherscan.io.evil.test/address/${address}`,
    `http://etherscan.io/address/${address}`,
    `https://x:password@etherscan.io/address/${address}`,
    `https://etherscan.io:444/address/${address}`,
    `https://127.0.0.1/address/${address}`,
    `https://routescan.io/address/${address}?chainid=43113`,
  ])
    assert.equal(parseExplorerInput(url), undefined);
});
test("network capabilities include mainnets, testnets and family-specific absences", () => {
  for (const id of [
    "1",
    "11155111",
    "560048",
    "8453",
    "84532",
    "10",
    "11155420",
    "42161",
    "421614",
    "137",
    "80002",
    "56",
    "97",
    "43113",
    "100",
    "10200",
  ]) {
    assert.ok(VERIFICATION_CHAINS[id]);
    assert.ok(providersFor(id).length);
  }
  assert.ok(VERIFICATION_CHAINS["84532"].testnet);
  assert.ok(!VERIFICATION_CHAINS["8453"].testnet);
  assert.ok(providersFor("43113").includes("routescan"));
  assert.ok(!providersFor("43113").includes("etherscan"));
  for (const chain of Object.values(VERIFICATION_CHAINS))
    for (const field of ["etherscan", "blockscout"] as const)
      if (chain[field]) {
        const url = new URL(chain[field]);
        assert.equal(url.protocol, "https:");
        assert.equal(url.search, "");
        assert.equal(url.username, "");
      }
});

test("proxy implementation hints are carried separately from the proxy's source", () => {
  const impl = "0x" + "33".repeat(20);
  const eth = structuredClone(etherscanFixture);
  Object.assign(eth.result[0], { Proxy: "1", Implementation: impl });
  assert.equal(importEtherscanSource(eth).implementationAddress, impl);
  assert.equal(
    importSourcifySource({
      ...sourcifyFixture,
      proxyResolution: { implementations: [{ address: impl }] },
    }).implementationAddress,
    impl
  );
  const multi = importSourcifySource({
    ...sourcifyFixture,
    proxyResolution: { implementations: [{ address: impl }, { address }] },
  });
  assert.equal(multi.implementationAddress, undefined);
});
