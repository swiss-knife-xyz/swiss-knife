import { expect, it } from "vitest";
import { Interface } from "ethers";
import { traceExamples } from "./examples";
import { getTraceExampleSnapshot } from "./exampleSnapshots";
import { flattenCalls } from "@/lib/tracer/model";
import { traceCodeAddress } from "@/lib/tracer/codeAddress";
import encoded from "./examples.v1.json";
import type { DecodeBytesParamResult } from "@/types";

it.each(traceExamples)("keeps the complete $title trace and decoded values bound to its transaction", (example) => {
  const snapshot = getTraceExampleSnapshot(example.hash, example.chainId)!;
  expect(snapshot.document.transactionHash).toBe(example.hash);
  expect(snapshot.document.chainId).toBe(1);
  const calls = flattenCalls(snapshot.document.call);
  expect(Object.keys(snapshot.entries)).toHaveLength(calls.length);
  for (const call of calls) {
    expect(snapshot.entries[call.id].status).toBe("ready");
    expect(snapshot.entries[call.id].data).toBeDefined();
    expect(snapshot.entries[call.id].data!.contractName).toBeTruthy();
    expect(Object.keys(snapshot.entries[call.id].data!.logs)).toHaveLength(call.logs.length);
  }
  const capture = encoded.find((item) => item.hash === example.hash)!.capture;
  expect(calls.reduce((count, call) => count + call.logs.length, 0)).toBe(capture.receiptLogCount);
  expect(!!snapshot.document.call.error).toBe(capture.receiptStatus === "0x0");
  // Exact bigint revival and nested args must reproduce the captured transaction input.
  const root = snapshot.entries["0"].data!;
  expect(root.contractName).toBeTruthy();
  const abi = snapshot.abis[traceCodeAddress(snapshot.document.call)!.toLowerCase()];
  expect(new Interface(abi).encodeFunctionData(root.input!.signature, root.input!.rawArgs)).toBe(snapshot.document.call.input);
  expect(getTraceExampleSnapshot(example.hash, 8453)).toBeUndefined();
});

it("preserves nested calldata, bigint precision and immutable snapshots", () => {
  const safe = getTraceExampleSnapshot(traceExamples[0].hash, 1)!;
  expect(Object.isFrozen(safe)).toBe(true);
  expect(Object.values(safe.entries).some(({ data }) => data?.input?.rawArgs.some((value: unknown) => typeof value === "bigint"))).toBe(true);
  const data = safe.entries["0"].data!.input!.args.find((arg) => arg.name === "data")!;
  expect((data.value as DecodeBytesParamResult).decoded?.functionName).toBe("multiSend");
});
