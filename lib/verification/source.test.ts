import { test } from "node:test";
import assert from "node:assert/strict";
import { importBlockscoutSource, verificationInput } from "./source";

import { address, fixture } from "./fixtures";

test("input only accepts paired allowlisted chains and exact valid addresses", () => {
  assert.deepEqual(verificationInput("1", address), { chainId: "1", address });
  for (const [chain, candidate] of [
    ["999999", address],
    ["__proto__", address],
    ["1", "https://evil.test"],
    ["1", address + "?x=1"],
    [1, address],
    ["1", "0x1234"],
  ]) {
    assert.throws(() => verificationInput(chain, candidate), /supported chain/);
  }
});

test("rejects incomplete, different-address twin, changed, malformed or unsupported source", () => {
  const variants = [
    { is_verified: false },
    { is_verified: undefined },
    { language: "vyper" },
    { verified_twin_address_hash: address },
    { is_changed_bytecode: true },
    { is_blueprint: true },
    { compiler_settings: null },
    { compiler_version: "latest" },
    { name: "Evil:Contract" },
    { source_code: "" },
    { file_path: "bad:Path" },
    { constructor_args: "0xabc" },
    { compiler_settings: { optimizer: { enabled: false }, libraries: {} } },
    {
      compiler_settings: {
        ...fixture.compiler_settings,
        compilationTarget: { "Wrong.sol": "Example" },
      },
    },
    {
      additional_sources: [
        { file_path: fixture.file_path, source_code: "duplicate" },
      ],
    },
    { additional_sources: {} },
    {
      additional_sources: Array.from({ length: 201 }, (_, i) => ({
        file_path: `${i}.sol`,
        source_code: "x",
      })),
    },
    { source_code: "a".repeat(1_000_001) },
    { license_type: "new-unknown-license" },
  ];
  for (const variant of variants)
    assert.throws(
      () => importBlockscoutSource({ ...fixture, ...variant }),
      /complete supported Solidity/
    );
});

test("imports every file and exact compiler settings without compilationTarget", () => {
  const source = importBlockscoutSource(fixture);
  assert.equal(source.contractName, "contracts/Example.sol:Example");
  assert.equal(source.compilerVersion, fixture.compiler_version);
  assert.equal(source.constructorArguments, "1234");
  const input = JSON.parse(source.sourceCode);
  const { compilationTarget: _ignored, ...settings } =
    fixture.compiler_settings;
  assert.deepEqual(input.settings, settings);
  assert.deepEqual(input.sources, {
    "contracts/Example.sol": { content: fixture.source_code },
    "lib/L.sol": { content: "library L {}" },
  });
  assert.equal(input.language, "Solidity");
  assert.equal(source.licenseType, "3");
});
