import { test } from "node:test";
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
