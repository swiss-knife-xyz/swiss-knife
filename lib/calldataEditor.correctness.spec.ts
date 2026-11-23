import { describe, expect, it } from "vitest";
import { Interface, ParamType } from "ethers";
import type { DecodeRecursiveResult } from "@/types";
import { decodeRecursive } from "./decoder";
import {
  CalldataEditError,
  createCalldataDraft,
  draftTree,
  emptyParameter,
  encodeDraft,
  updateDraft,
  type ParameterDraft,
} from "./calldataEditor";

const address = "0x0000000000000000000000000000000000001234";
const otherAddress = "0x0000000000000000000000000000000000005678";
function fixture(signature: string, args: unknown[]) {
  const iface = new Interface([`function ${signature}`]);
  const original = iface.encodeFunctionData(signature, args);
  const result: NonNullable<DecodeRecursiveResult> = {
    functionName: signature.split("(")[0],
    signature,
    rawArgs: args,
    args: [],
  };
  const draft = createCalldataDraft(result, original);
  expect(draft, signature).toBeDefined();
  return { iface, original, draft: draft! };
}
const editValue = (param: ParameterDraft, value: string): ParameterDraft => ({
  ...param,
  value,
  dirty: true,
});
const widths = Array.from({ length: 32 }, (_, i) => (i + 1) * 8);

describe("independent calldata encoding correctness", () => {
  it("matches the canonical ERC20 transfer bytes without using another encoder", () => {
    const f = fixture("transfer(address,uint256)", [otherAddress, 0n]);
    let edited = updateDraft(f.draft, f.draft.params[0].id, (p) =>
      editValue(p, address)
    );
    edited = updateDraft(edited, f.draft.params[1].id, (p) =>
      editValue(p, "42")
    );
    expect(encodeDraft(edited)).toBe(
      "0xa9059cbb" +
        "0000000000000000000000000000000000000000000000000000000000001234" +
        "000000000000000000000000000000000000000000000000000000000000002a"
    );
  });

  it("keeps duplicate and unnamed tuple fields positional and selects the exact overload", async () => {
    const iface = new Interface([
      "function f((uint256 same,uint256 same,uint256)[] rows,uint256 tail)",
      "function f(address recipient)",
    ]);
    const signature = "f((uint256,uint256,uint256)[],uint256)";
    const original = iface.encodeFunctionData(signature, [
      [
        [11n, 22n, 33n],
        [44n, 55n, 66n],
      ],
      77n,
    ]);
    const result = await decodeRecursive({
      calldata: original,
      abi: iface.fragments.map((f) => f.format("full")),
    });
    expect(result).toBeTruthy();
    const draft = createCalldataDraft(result!, original)!;
    expect(draft).toBeDefined();
    const field = draft.params[0].children![1].children![1];
    const edited = updateDraft(draft, field.id, (p) => editValue(p, "999"));
    expect(encodeDraft(edited)).toBe(
      iface.encodeFunctionData(signature, [
        [
          [11n, 22n, 33n],
          [44n, 999n, 66n],
        ],
        77n,
      ])
    );
    expect(encodeDraft(draft)).toBe(original);
  });

  it.each(widths)(
    "matches ethers at all uint%s and signed integer boundaries",
    (bits) => {
      for (const signed of [false, true]) {
        const type = `${signed ? "int" : "uint"}${bits}`;
        const min = signed ? -(1n << BigInt(bits - 1)) : 0n;
        const max = (1n << BigInt(signed ? bits - 1 : bits)) - 1n;
        const f = fixture(`f(${type})`, [0n]);
        for (const value of [min, max, 0n, ...(signed ? [-1n] : [])]) {
          const edited = updateDraft(f.draft, f.draft.params[0].id, (p) =>
            editValue(p, String(value))
          );
          expect(encodeDraft(edited)).toBe(
            f.iface.encodeFunctionData("f", [value])
          );
          expect(f.iface.decodeFunctionData("f", encodeDraft(edited))[0]).toBe(
            value
          );
        }
        for (const value of [min - 1n, max + 1n]) {
          expect(() =>
            encodeDraft(
              updateDraft(f.draft, f.draft.params[0].id, (p) =>
                editValue(p, String(value))
              )
            )
          ).toThrow(CalldataEditError);
        }
      }
    }
  );

  it.each(Array.from({ length: 32 }, (_, i) => i + 1))(
    "encodes bytes%s exactly and rejects both shorter and longer values",
    (length) => {
      const f = fixture(`f(bytes${length},bytes,string)`, [
        `0x${"11".repeat(length)}`,
        "0x",
        "",
      ]);
      const bytes = `0x${"ab".repeat(length)}`;
      const edited = updateDraft(f.draft, f.draft.params[0].id, (p) =>
        editValue(p, bytes)
      );
      expect(encodeDraft(edited)).toBe(
        f.iface.encodeFunctionData("f", [bytes, "0x", ""])
      );
      for (const size of [length - 1, length + 1])
        expect(() =>
          encodeDraft(
            updateDraft(f.draft, f.draft.params[0].id, (p) =>
              editValue(p, `0x${"ab".repeat(size)}`)
            )
          )
        ).toThrow(CalldataEditError);
    }
  );

  // Seeded cases exercise offsets and padding independently of the draft traversal.
  it.each(Array.from({ length: 48 }, (_, i) => i + 1))(
    "matches ethers for generated nested ABI shape %s",
    (seed) => {
      let state = seed;
      const next = () =>
        (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
      const leaves = [
        "uint256",
        "int8",
        "bool",
        "address",
        "bytes",
        "bytes3",
        "string",
      ];
      const shape = (depth: number): string => {
        const choice = next() % (depth ? 4 : 1);
        if (choice === 1) return `(${shape(depth - 1)},${shape(depth - 1)})`;
        if (choice === 2) return `${shape(depth - 1)}[]`;
        if (choice === 3) return `${shape(depth - 1)}[2]`;
        return leaves[next() % leaves.length];
      };
      const types = [shape(3), shape(3), "string", "bytes"];
      const value = (type: ParamType, changed: boolean): unknown => {
        if (type.baseType === "tuple")
          return type.components!.map((t) => value(t, changed));
        if (type.baseType === "array")
          return Array.from(
            { length: type.arrayLength === -1 ? 2 : type.arrayLength! },
            () => value(type.arrayChildren!, changed)
          );
        switch (type.type) {
          case "uint256":
            return changed ? (1n << 255n) + BigInt(seed) : BigInt(seed);
          case "int8":
            return changed ? -128n : 127n;
          case "bool":
            return changed;
          case "address":
            return changed ? otherAddress : address;
          case "bytes":
            return changed ? `0x${"ab".repeat(seed + 1)}` : "0x";
          case "bytes3":
            return changed ? "0xaabbcc" : "0x000000";
          default:
            return changed ? `é🦄\u0000${"x".repeat(seed)}` : "";
        }
      };
      const inputs = types.map((t) => ParamType.from(t));
      const before = inputs.map((t) => value(t, false));
      const after = inputs.map((t) => value(t, true));
      const f = fixture(`generated(${types.join(",")})`, before);
      const change = (param: ParameterDraft): ParameterDraft =>
        param.children
          ? { ...param, children: param.children.map(change) }
          : editValue(param, String(value(param.input, true)));
      const encoded = encodeDraft({
        ...f.draft,
        params: f.draft.params.map(change),
      });
      expect(encoded).toBe(f.iface.encodeFunctionData("generated", after));
      expect(encodeDraft(f.draft, true)).toBe(f.original);
    }
  );

  it("adds, removes and reorders nested tuples without shifting their field values", () => {
    const f = fixture("f((address,uint256,bytes)[],uint256[2])", [
      [
        [address, 1n, "0x11"],
        [otherAddress, 2n, "0x2222"],
      ],
      [3n, 4n],
    ]);
    const array = f.draft.params[0];
    const fresh = emptyParameter(array.input.arrayChildren!);
    fresh.children = fresh.children!.map((p, i) =>
      editValue(p, [address, "99", "0x"][i])
    );
    let edited = updateDraft(f.draft, array.id, (p) => ({
      ...p,
      dirty: true,
      children: [p.children![1], fresh, p.children![0]],
    }));
    expect(encodeDraft(edited)).toBe(
      f.iface.encodeFunctionData("f", [
        [
          [otherAddress, 2n, "0x2222"],
          [address, 99n, "0x"],
          [address, 1n, "0x11"],
        ],
        [3n, 4n],
      ])
    );
    edited = updateDraft(edited, array.id, (p) => ({
      ...p,
      dirty: true,
      children: [],
    }));
    expect(encodeDraft(edited)).toBe(
      f.iface.encodeFunctionData("f", [[], [3n, 4n]])
    );
    expect(() =>
      encodeDraft(
        updateDraft(edited, edited.params[1].id, (p) => ({
          ...p,
          dirty: true,
          children: [],
        }))
      )
    ).toThrow();
  });

  it("rejects invalid values deeply nested inside arrays and tuples", () => {
    const f = fixture("f((uint8,int8,bool,address,bytes)[])", [
      [[1n, -1n, true, address, "0x"]],
    ]);
    for (const [i, invalid] of [
      [0, "256"],
      [1, "-129"],
      [2, "1"],
      [3, "0x1234"],
      [4, "0xabc"],
    ] as const) {
      const field = f.draft.params[0].children![0].children![i];
      expect(() =>
        encodeDraft(
          updateDraft(f.draft, field.id, (p) => editValue(p, invalid))
        )
      ).toThrow(CalldataEditError);
    }
  });
});

// Deliberately independent of the production MultiSend packer and decoder.
const word = (value: bigint) => value.toString(16).padStart(64, "0");
function pack(
  txs: { operation: number; to: string; value: bigint; data: string }[]
) {
  return `0x${txs.map((tx) => `${tx.operation.toString(16).padStart(2, "0")}${tx.to.slice(2)}${word(tx.value)}${word(BigInt((tx.data.length - 2) / 2))}${tx.data.slice(2)}`).join("")}`;
}
function unpack(bytes: string) {
  const txs = [];
  let cursor = 2;
  while (cursor < bytes.length) {
    const operation = Number.parseInt(bytes.slice(cursor, (cursor += 2)), 16);
    const to = `0x${bytes.slice(cursor, (cursor += 40))}`;
    const value = BigInt(`0x${bytes.slice(cursor, (cursor += 64))}`);
    const length = Number(BigInt(`0x${bytes.slice(cursor, (cursor += 64))}`));
    const data = `0x${bytes.slice(cursor, (cursor += length * 2))}`;
    txs.push({ operation, to, value, data });
  }
  expect(cursor).toBe(bytes.length);
  return txs;
}

describe("recursive Safe MultiSend byte correctness", () => {
  it("rebuilds every ancestor and packed length after nested edits and transaction additions/removals", async () => {
    const iface = new Interface([
      "function run((bytes,bool)[] calls)",
      "function multiSend(bytes transactions)",
      "function set(string message,uint256 amount)",
    ]);
    const child = iface.encodeFunctionData("set", ["old", 1n]);
    const txs = [
      { operation: 0, to: address, value: 7n, data: child },
      { operation: 1, to: otherAddress, value: 0n, data: "0xdeadbeef" },
    ];
    const original = iface.encodeFunctionData("run", [
      [[iface.encodeFunctionData("multiSend", [pack(txs)]), true]],
    ]);
    const decoded = await decodeRecursive({
      calldata: original,
      abi: iface.fragments.map((f) => f.format("full")),
    });
    expect(decoded).toBeTruthy();
    let draft = createCalldataDraft(decoded!, original)!;
    expect(draft).toBeDefined();
    const fields = [...draftTree(draft).fields.values()];
    const message = fields.find((p) => p.input.name === "message")!;
    const amount = fields.find((p) => p.input.name === "amount")!;
    expect(message).toBeDefined();
    const text = "🦄".repeat(33);
    draft = updateDraft(draft, message.id, (p) => editValue(p, text));
    draft = updateDraft(draft, amount.id, (p) =>
      editValue(p, String((1n << 256n) - 1n))
    );
    const changedTxs = [
      {
        ...txs[0],
        data: iface.encodeFunctionData("set", [text, (1n << 256n) - 1n]),
      },
      txs[1],
    ];
    const expected = (items: typeof txs) =>
      iface.encodeFunctionData("run", [
        [[iface.encodeFunctionData("multiSend", [pack(items)]), true]],
      ]);
    const encoded = encodeDraft(draft);
    expect(encoded).toBe(expected(changedTxs));
    const wrapper = iface.decodeFunctionData("run", encoded)[0][0][0];
    expect(unpack(iface.decodeFunctionData("multiSend", wrapper)[0])).toEqual(
      changedTxs
    );
    const transactions = fields.find((p) => p.call?.kind === "safe-multisend")!
      .call!.params[0];
    const added = emptyParameter(transactions.input.arrayChildren!);
    added.children = added.children!.map((p, i) =>
      editValue(p, ["1", address, "42", "0x123456"][i])
    );
    draft = updateDraft(draft, transactions.id, (p) => ({
      ...p,
      dirty: true,
      children: [p.children![0], added],
    }));
    expect(encodeDraft(draft)).toBe(
      expected([
        changedTxs[0],
        { operation: 1, to: address, value: 42n, data: "0x123456" },
      ])
    );
    const operation = added.children[0];
    expect(() =>
      encodeDraft(updateDraft(draft, operation.id, (p) => editValue(p, "2")))
    ).toThrow("Operation must be");
    draft = updateDraft(draft, transactions.id, (p) => ({
      ...p,
      dirty: true,
      children: [],
    }));
    expect(encodeDraft(draft)).toBe(expected([]));
  });
});
