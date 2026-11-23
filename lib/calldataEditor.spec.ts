import { describe, expect, it } from "vitest";
import { FunctionFragment, Interface } from "ethers";
import { decodeFunctionData, parseAbi } from "viem";
import type { Arg, DecodeRecursiveResult } from "@/types";
import {
  encodeSafeMultiSend,
  encodeSafeMultiSendTransactions,
} from "./encoder";
import { decodeRecursive } from "./decoder";
import {
  CalldataEditError,
  createCalldataDraft,
  draftTree,
  emptyParameter,
  encodeDraft,
  updateDraft,
} from "./calldataEditor";
import snapshots from "@/app/calldata/decoder/examples.v1.json";

const to = "0x0000000000000000000000000000000000001234";
function result(
  signature: string,
  args: unknown[],
  displayed: Arg[] = []
): NonNullable<DecodeRecursiveResult> {
  return {
    functionName: signature.split("(")[0],
    signature,
    rawArgs: args,
    args: displayed,
  };
}
function call(signature: string, args: unknown[], displayed: Arg[] = []) {
  const iface = new Interface([`function ${signature}`]);
  const original = iface.encodeFunctionData(signature, args);
  return { original, result: result(signature, args, displayed), iface };
}
const bytesArg = (value: string, decoded: DecodeRecursiveResult): Arg => ({
  name: "data",
  type: "bytes",
  baseType: "bytes",
  rawValue: value,
  value: { decoded },
});

describe("recursive calldata editing", () => {
  it("roundtrips exact overloads and preserves large signed/unsigned values", () => {
    const input = call("f(uint256,int256,bool,string)", [
      (2n ** 255n).toString(),
      "-123",
      true,
      "",
    ]);
    const draft = createCalldataDraft(input.result, input.original)!;
    expect(draft).toBeDefined();
    expect(encodeDraft(draft, true)).toBe(input.original);
    const edited = updateDraft(draft, draft.params[1].id, (p) => ({
      ...p,
      value: "-456",
      dirty: true,
    }));
    expect(input.iface.decodeFunctionData("f", encodeDraft(edited))[1]).toBe(
      -456n
    );
    expect(draft.params[1].value).toBe("-123");
  });

  it("edits nested tuple arrays, multidimensional arrays, empty arrays and booleans positionally", () => {
    const input = call("f((uint256,bool,string)[][2],uint256[][])", [
      [[["7", true, ""]], []],
      [["1"], []],
    ]);
    let draft = createCalldataDraft(input.result, input.original)!;
    expect(draft).toBeDefined();
    const flag = draft.params[0].children![0].children![0].children![1];
    draft = updateDraft(draft, flag.id, (p) => ({
      ...p,
      value: "false",
      dirty: true,
    }));
    const numbers = draft.params[1].children![1];
    const number = {
      ...emptyParameter(numbers.input.arrayChildren!),
      value: "42",
    };
    draft = updateDraft(draft, numbers.id, (p) => ({
      ...p,
      children: [number],
      dirty: true,
    }));
    const decoded = input.iface.decodeFunctionData("f", encodeDraft(draft));
    expect(decoded[0][0][0][1]).toBe(false);
    expect(decoded[1][1][0]).toBe(42n);
  });

  it("rebuilds a changed bytes call through tuples/arrays and its outer call", () => {
    const inner = call("transfer(address,uint256)", [to, "7"]);
    const outer = call("batch((bytes,bool)[])", [[[inner.original, true]]]);
    outer.result.args = [
      {
        name: "calls",
        type: "tuple[]",
        baseType: "array",
        rawValue: [],
        value: [
          {
            name: "",
            type: "tuple",
            baseType: "tuple",
            rawValue: [],
            value: [bytesArg(inner.original, inner.result)],
          },
        ],
      },
    ];
    let draft = createCalldataDraft(outer.result, outer.original)!;
    const amount = draft.params[0].children![0].children![0].call!.params[1];
    draft = updateDraft(draft, amount.id, (p) => ({
      ...p,
      value: "999",
      dirty: true,
    }));
    const data = outer.iface.decodeFunctionData(
      "batch",
      encodeDraft(draft)
    )[0][0][0];
    expect(inner.iface.decodeFunctionData("transfer", data)[1]).toBe(999n);
  });

  it("leaves unsupported nested bytes exact when a sibling changes", () => {
    const opaque = "0xdeadbeef001122";
    const input = call(
      "f(bytes,uint256)",
      [opaque, "1"],
      [bytesArg(opaque, { ...result("abi.encode", []), decoding: "heuristic" })]
    );
    let draft = createCalldataDraft(input.result, input.original)!;
    expect(draft.params[0].call).toBeUndefined();
    draft = updateDraft(draft, draft.params[1].id, (p) => ({
      ...p,
      value: "2",
      dirty: true,
    }));
    expect(input.iface.decodeFunctionData("f", encodeDraft(draft))[0]).toBe(
      opaque
    );
  });

  it("rejects heuristic roots, selector mismatches, reverts, and trailing bytes", () => {
    const input = call("f(uint256)", ["1"]);
    expect(
      createCalldataDraft(
        { ...input.result, decoding: "heuristic" },
        input.original
      )
    ).toBeUndefined();
    expect(
      createCalldataDraft({ ...input.result, kind: "revert" }, input.original)
    ).toBeUndefined();
    expect(
      createCalldataDraft(result("g(uint256)", ["1"]), input.original)
    ).toBeUndefined();
    expect(
      createCalldataDraft(input.result, input.original + "00")
    ).toBeUndefined();
  });

  it.each(["", "1.2", "-1", (2n ** 256n).toString()])(
    "rejects invalid uint256 %j at its parameter",
    (value) => {
      const input = call("f(uint256)", ["1"]);
      const draft = createCalldataDraft(input.result, input.original)!;
      const edited = updateDraft(draft, draft.params[0].id, (p) => ({
        ...p,
        value,
        dirty: true,
      }));
      expect(() => encodeDraft(edited)).toThrow(CalldataEditError);
      try {
        encodeDraft(edited);
      } catch (e) {
        expect((e as CalldataEditError).parameterId).toBe(draft.params[0].id);
      }
    }
  );

  it("rejects odd hex, wrong fixed byte lengths and invalid addresses", () => {
    for (const [signature, original, invalid] of [
      ["f(bytes)", "0x12", "0x1"],
      ["f(bytes2)", "0x1234", "0x12"],
      ["f(address)", to, "0x123"],
    ]) {
      const input = call(signature, [original]);
      const draft = createCalldataDraft(input.result, input.original)!;
      expect(() =>
        encodeDraft(
          updateDraft(draft, draft.params[0].id, (p) => ({
            ...p,
            value: invalid,
            dirty: true,
          }))
        )
      ).toThrow();
    }
  });

  it("roundtrips every supported saved example and recursively edits Safe MultiSend", () => {
    const revived = JSON.parse(JSON.stringify(snapshots), (_key, value) =>
      value && typeof value === "object" && "$bigint" in value
        ? BigInt(value.$bigint)
        : value
    );
    let safeEdits = 0;
    for (const sample of revived) {
      const draft = createCalldataDraft(
        sample.result,
        sample.clearSigningRequest.calldata
      );
      if (!draft) continue;
      expect(encodeDraft(draft, true)).toBe(
        sample.clearSigningRequest.calldata
      );
      const tree = draftTree(draft);
      for (const param of tree.fields.values()) {
        if (param.call?.kind !== "safe-multisend") continue;
        const data = param.call.params[0].children![0].children![3];
        const edited = updateDraft(draft, data.id, (p) => ({
          ...p,
          call: undefined,
          value: "0x123456",
          dirty: true,
        }));
        const encoded = encodeDraft(edited);
        expect(encoded).not.toBe(draft.original);
        expect(encoded).toContain("123456");
        expect(encoded).toContain(
          "0000000000000000000000000000000000000000000000000000000000000003"
        );
        safeEdits++;
      }
    }
    expect(safeEdits).toBeGreaterThan(0);
  });

  it("decodes edited nested Safe calls again with the retained ABI definitions", async () => {
    const child = call("set(uint256)", ["7"]);
    const multi = encodeSafeMultiSend([
      { operation: 0, to, value: "0", data: child.original },
    ]);
    const outer = call("run(bytes)", [multi]);
    const abi = [
      "function run(bytes data)",
      "function multiSend(bytes transactions)",
      "function set(uint256 amount)",
    ];
    const decoded = await decodeRecursive({ calldata: outer.original, abi });
    expect(decoded).not.toBeNull();
    let draft = createCalldataDraft(decoded!, outer.original)!;
    const amount = [...draftTree(draft).fields.values()].find(
      (p) => p.input.name === "amount"
    )!;
    expect(amount).toBeDefined();
    draft = updateDraft(draft, amount.id, (p) => ({
      ...p,
      value: "123",
      dirty: true,
    }));
    const encoded = encodeDraft(draft);
    const next = await decodeRecursive({ calldata: encoded, abi });
    const restored = createCalldataDraft(next!, encoded)!;
    expect(
      [...draftTree(restored).fields.values()].find(
        (p) => p.input.name === "amount"
      )?.value
    ).toBe("123");
  });

  it("uses the existing MultiSend packer for the outer wrapper", () => {
    const txs = [{ operation: 0 as const, to, value: "0", data: "0x1234" }];
    const encoded = encodeSafeMultiSend(txs);
    const decoded = decodeFunctionData({
      abi: parseAbi(["function multiSend(bytes transactions)"]),
      data: encoded,
    });
    expect(decoded.args[0]).toBe(encodeSafeMultiSendTransactions(txs));
    expect(FunctionFragment.from("function multiSend(bytes)").selector).toBe(
      encoded.slice(0, 10)
    );
  });
});
