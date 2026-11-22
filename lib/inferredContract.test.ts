import { test } from "node:test";
import { FunctionFragment } from "ethers";
import assert from "node:assert/strict";
import { inferFunctionInputs } from "./inferredContract";

const mint = { name: "mint(address,uint256)", hasVerifiedContract: true };
const collision = { name: "cat642998653(address,uint256)", hasVerifiedContract: false };
test("a unique verified-contract candidate resolves a selector collision without bytecode types", () => {
  const result = inferFunctionInputs("0x40c10f19", undefined, [collision, mint]);
  assert.equal(result.name, "mint");
  assert.deepEqual(result.inputs.map(input => input.type), ["address", "uint256"]);
  assert.equal(result.inputInference.source, "signature");
});
test("multiple verified matches remain ambiguous rather than using response order", () => {
  const result = inferFunctionInputs("0x40c10f19", undefined, [mint, { ...collision, hasVerifiedContract: true }]);
  assert.equal(result.name, "selector: 0x40c10f19");
  assert.equal(result.inputInference.source, "unknown");
});
test("missing verified metadata does not silently pick the first colliding candidate", () => {
  assert.equal(inferFunctionInputs("0x40c10f19", undefined, [mint.name, collision.name]).name, "selector: 0x40c10f19");
});
test("verified metadata cannot override incompatible bytecode parameter types", () => {
  const result = inferFunctionInputs("0xa9059cbb", "bytes1", [
    { name: "transfer(address,uint256)", hasVerifiedContract: true },
    { name: "many_msg_babbage(bytes1)", hasVerifiedContract: false },
  ]);
  assert.equal(result.name, "many_msg_babbage");
  assert.deepEqual(result.inputs.map(input => input.type), ["bytes1"]);
});

const regressions = [
  ["0x3357162b", "bytes,bytes,bytes,uint8,address,address,address,address", "initialize(string,string,string,uint8,address,address,address,address)"],
  ["0x430239b4", "uint256[],bytes", "initializeV2_2(address[],string)"],
  ["0x5a049a70", "address,uint256,uint8,uint256,uint256", "cancelAuthorization(address,bytes32,uint8,bytes32,bytes32)"],
  ["0x88b7ab63", "address,address,uint256,uint256,uint256,uint256,bytes", "receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,bytes)"],
  ["0xb7b72899", "address,uint256,bytes", "cancelAuthorization(address,bytes32,bytes)"],
] as const;

for (const [selector, args, signature] of regressions) {
  test(`resolves ${selector} using signature types instead of coarse bytecode guesses`, () => {
    for (const candidate of [signature, { name: signature, hasVerifiedContract: true }]) {
      const result = inferFunctionInputs(selector, args, [candidate]);
      const expected = FunctionFragment.from(`function ${signature}`);
      assert.equal(result.name, expected.name);
      assert.deepEqual(result.inputs.map(input => input.type), expected.inputs.map(input => input.type));
      assert.equal(result.inputInference.source, "signature");
      assert.equal(FunctionFragment.from({ type: "function", name: result.name, inputs: result.inputs }).selector, selector);
    }
  });
}

test("checks nested arrays and tuples recursively without comparing parameter names", () => {
  const signature = "nested((string,address[2])[],bytes32[][])";
  const selector = FunctionFragment.from(`function ${signature}`).selector;
  const result = inferFunctionInputs(selector, "(bytes,uint256[2])[],uint256[][]", [signature]);
  assert.equal(result.name, "nested");
  assert.equal(result.inputs[0].components?.[0].type, "string");
  assert.equal(result.inputs[0].components?.[1].type, "address[2]");
  assert.equal(result.inputs[1].type, "bytes32[][]");
});

for (const [args, signature] of [
  ["uint8", "conflict(bytes32)"],
  ["bytes1", "conflict(uint8)"],
  ["address", "conflict(uint256)"],
  ["uint256", "conflict(bytes)"],
  ["uint256[]", "conflict(address[2])"],
  ["uint256[2]", "conflict(address[3])"],
  ["(uint256,bytes)", "conflict((address,uint256))"],
  ["", "conflict(uint256)"],
  ["uint256", "conflict(uint256,uint256)"],
]) {
  test(`rejects incompatible verified signature ${signature} against ${args}`, () => {
    const selector = FunctionFragment.from(`function ${signature}`).selector;
    const result = inferFunctionInputs(selector, args, [{ name: signature, hasVerifiedContract: true }]);
    assert.equal(result.name, `selector: ${selector}`);
    assert.equal(result.inputInference.source, "bytecode");
  });
}

test("compatible collisions remain unresolved regardless of response order", () => {
  for (const entries of [[mint, collision], [collision, mint]]) {
    const result = inferFunctionInputs("0x40c10f19", "uint256,uint256", entries.map(entry => ({ ...entry, hasVerifiedContract: true })));
    assert.equal(result.name, "selector: 0x40c10f19");
    assert.deepEqual(result.inputs.map(input => input.type), ["uint256", "uint256"]);
    assert.equal(result.inputInference.source, "bytecode");
  }
});

test("never accepts malformed or wrong-selector signatures", () => {
  const result = inferFunctionInputs("0xa9059cbb", undefined, ["broken(", "balanceOf(address)"]);
  assert.equal(result.name, "selector: 0xa9059cbb");
  assert.equal(result.inputInference.source, "unknown");
});

test("uses unique cross-registry agreement to break a verified-candidate tie", () => {
  const permit = "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)";
  const collision = "$____$$_$$___$$$_$$$$__$$$__$$$$$$$$$(address,address,uint256,uint256,uint8,bytes32,bytes32)";
  const args = "address,address,uint256,uint256,uint8,uint256,uint256";
  for (const reverse of [false, true]) {
    const entries = [
      { name: permit, hasVerifiedContract: true, corroborated: true },
      { name: collision, hasVerifiedContract: true },
    ];
    if (reverse) entries.reverse();
    const result = inferFunctionInputs("0xd505accf", args, entries);
    assert.equal(result.name, "permit");
    assert.deepEqual(result.inputs.slice(-2).map(input => input.type), ["bytes32", "bytes32"]);
    // Agreement is evidence, never proof: ties still stay unresolved.
    for (const corroborated of [false, true]) {
      assert.equal(inferFunctionInputs("0xd505accf", args, entries.map(entry => ({ ...entry, corroborated }))).name, "selector: 0xd505accf");
    }
  }
});

test("cross-registry agreement cannot override incompatible bytecode types or a unique verified match", () => {
  const entries = [{ ...mint }, { ...collision, corroborated: true }];
  assert.equal(inferFunctionInputs("0x40c10f19", "address,uint256", entries).name, "mint");
  assert.equal(inferFunctionInputs("0x40c10f19", "bytes", entries).name, "selector: 0x40c10f19");
});
