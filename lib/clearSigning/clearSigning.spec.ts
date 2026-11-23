import { beforeEach, expect, it, vi } from "vitest";
import { encodeFunctionData, parseAbi, zeroAddress } from "viem";
import {
  resolveClearSigning,
  renderDescriptor,
  resolveImplementation,
} from "./resolve";
import { getBuiltinCalldataDescriptor } from "./builtinDescriptors";
import { decodeCalldataForDescriptor } from "./decodeForDescriptor";
import { resolvePath } from "./resolvePath";
import { applyFormat } from "./applyFormat";
import type { Erc7730Descriptor } from "./types";
const rpc = vi.hoisted(() => ({
  getStorageAt: vi.fn(),
  readContract: vi.fn(),
  call: vi.fn(),
  getCode: vi.fn(),
}));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => rpc }));
const token = "0x1111111111111111111111111111111111111111";
const recipient = "0x2222222222222222222222222222222222222222";
const impl = "0x3333333333333333333333333333333333333333";
const calldata = encodeFunctionData({
  abi: parseAbi(["function transfer(address to, uint256 amount)"]),
  functionName: "transfer",
  args: [recipient, 1234567n],
});
const request = { calldata, chainId: 1, to: token };
const word = (address: string) => `0x${"0".repeat(24)}${address.slice(2)}`;
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  rpc.getStorageAt.mockReset().mockResolvedValue(undefined);
  rpc.getCode.mockReset().mockResolvedValue("0x");
  rpc.readContract
    .mockReset()
    .mockImplementation(({ functionName }) =>
      Promise.resolve(functionName === "decimals" ? 6 : "USDC")
    );
  rpc.call.mockReset().mockResolvedValue({ data: "0x" });
});
it("formats ERC-20 transfer with exact metadata and recipient", async () => {
  const result = await resolveClearSigning(request);
  expect(result?.intent).toBe("Send tokens");
  expect(result?.source).toBe("builtin");
  expect(result?.fields[0].values[0]).toMatchObject({
    kind: "tokenAmount",
    amountRaw: "1234567",
    tokenMetadata: { symbol: "USDC", decimals: 6 },
  });
  expect(result?.fields[1].values[0]).toEqual({
    kind: "address",
    address: recipient,
  });
});
it("keeps bare calldata amounts in base units without network requests", async () => {
  const result = await resolveClearSigning({ calldata });
  expect(result?.fields[0]).toMatchObject({
    label: "Amount (base units)",
    values: [{ kind: "raw", text: "1234567" }],
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(rpc.readContract).not.toHaveBeenCalled();
});
it("prefers a matched registry descriptor and avoids proxy reads", async () => {
  const desc = getBuiltinCalldataDescriptor(1, recipient, calldata)!;
  desc.display!.formats!["transfer(address to,uint256 amount)"].intent =
    "Registry transfer";
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      descriptor: desc,
      sourcePath: "registry/example/calldata.json",
    }),
  } as Response);
  const result = await resolveClearSigning({ ...request, to: recipient });
  expect(result?.intent).toBe("Registry transfer");
  expect(result?.source).toBe("registry");
  expect(rpc.getStorageAt).not.toHaveBeenCalled();
});
it("rejects a descriptor bound to another contract or network", () => {
  const desc = getBuiltinCalldataDescriptor(1, token, calldata)!;
  expect(
    renderDescriptor({ ...request, to: recipient }, desc, "registry")
  ).toBeNull();
  expect(
    renderDescriptor({ ...request, chainId: 8453 }, desc, "registry")
  ).toBeNull();
});
it.each(["0x", "garbage", "0xa9059cbb", "0xa9059cbbzz", "0xdeadbeef"])(
  "fails quietly for malformed/unmatched calldata %s",
  async (input) => {
    expect(await resolveClearSigning({ calldata: input })).toBeNull();
  }
);
it("rejects missing required paths and failing hidden assertions", () => {
  const descriptor = getBuiltinCalldataDescriptor(1, token, calldata)!;
  const format =
    descriptor.display!.formats!["transfer(address to,uint256 amount)"];
  format.required = ["missing"];
  expect(renderDescriptor(request, descriptor, "registry")).toBeNull();
  delete format.required;
  format.fields!.push({ path: "amount", visible: { mustMatch: ["0"] } });
  expect(renderDescriptor(request, descriptor, "registry")).toBeNull();
});
it("decodes named nested tuples and array fields using descriptor ABI", () => {
  const sig = "batch((address to,uint256 amount)[] calls)";
  const bytes = encodeFunctionData({
    abi: parseAbi([`function ${sig}`]),
    functionName: "batch",
    args: [[{ to: recipient, amount: 9n }]],
  });
  expect(decodeCalldataForDescriptor(sig, bytes)).toEqual({
    calls: [{ to: recipient, amount: "9" }],
  });
  expect(
    decodeCalldataForDescriptor(
      sig,
      encodeFunctionData({
        abi: parseAbi([`function ${sig}`]),
        functionName: "batch",
        args: [[]],
      })
    )
  ).toEqual({ calls: [] });
});
it("zips inner calls with their recipient and value", () => {
  const packed = `0x00${token.slice(2)}${"0".repeat(64)}${(calldata.slice(2).length / 2).toString(16).padStart(64, "0")}${calldata.slice(2)}`;
  const bytes = encodeFunctionData({
    abi: parseAbi(["function multiSend(bytes transactions)"]),
    functionName: "multiSend",
    args: [packed as `0x${string}`],
  });
  const desc = getBuiltinCalldataDescriptor(1, token, bytes)!;
  const result = renderDescriptor(
    { calldata: bytes, chainId: 1, to: token },
    desc,
    "builtin"
  );
  expect(result?.fields[0].values[0]).toMatchObject({
    kind: "calldata",
    callee: token,
    data: calldata,
    amount: "0",
  });
});
it("prefers EIP-1967 over slot zero and validates Safe singleton", async () => {
  rpc.getStorageAt.mockImplementation(({ slot }) =>
    Promise.resolve(slot.startsWith("0x3608") ? word(impl) : word(token))
  );
  expect(await resolveImplementation(1, token)).toBe(impl);
  rpc.getStorageAt.mockImplementation(({ slot }) =>
    Promise.resolve(/^0x0+$/.test(slot) ? word(impl) : undefined)
  );
  expect(await resolveImplementation(1, token)).toBeNull();
  rpc.call.mockResolvedValue({ data: word(impl) });
  expect(await resolveImplementation(1, token)).toBe(impl);
});
it("resolves a delegation designator", async () => {
  rpc.getCode.mockResolvedValue(`0xef0100${impl.slice(2)}`);
  expect(await resolveImplementation(1, token)).toBe(impl);
});
it("keeps token amounts raw when token metadata is unavailable", async () => {
  rpc.readContract.mockRejectedValue(new Error("offline"));
  const result = await resolveClearSigning(request);
  expect(result?.fields[0].values[0]).toMatchObject({ amountRaw: "1234567" });
});
it("supports descriptor definitions, constants and literal enum values", () => {
  const descriptor: Erc7730Descriptor = {
    display: {
      definitions: { recipient: { label: "Recipient", format: "addressName" } },
    },
  };
  expect(
    applyFormat(
      { fields: [{ $ref: "$.display.definitions.recipient", path: "to" }] },
      { data: { to: recipient }, chainId: 1 },
      descriptor
    )[0]
  ).toMatchObject({
    label: "Recipient",
    values: [{ kind: "address", address: recipient }],
  });
});
it("retains array iteration and byte slicing", () => {
  expect(resolvePath({ path: `0x${token.slice(2)}abcd` }, "path.[0:20]")).toBe(
    token
  );
  expect(
    resolvePath(
      { calls: [{ amount: "1" }, { amount: "2" }] },
      "calls.[].amount"
    )
  ).toEqual(["1", "2"]);
});
it("preserves approve values including unlimited allowance", async () => {
  const amount = (1n << 256n) - 1n;
  const data = encodeFunctionData({
    abi: parseAbi(["function approve(address spender,uint256 amount)"]),
    functionName: "approve",
    args: [recipient, amount],
  });
  const result = await resolveClearSigning({ ...request, calldata: data });
  expect(result?.intent).toBe("Approve token");
  expect(result?.fields[0].values[0]).toMatchObject({
    amountRaw: amount.toString(),
  });
  expect(result?.fields[1].label).toBe("Spender");
});
it("binds @.from and @.value to the actual transaction envelope", () => {
  const desc = getBuiltinCalldataDescriptor(1, token, calldata)!;
  desc.display!.formats!["transfer(address to,uint256 amount)"].fields = [
    { path: "@.from", label: "Sender", format: "addressName" },
    { path: "@.value", label: "Payment", format: "amount" },
  ];
  expect(renderDescriptor(request, desc, "registry")).toBeNull();
  const result = renderDescriptor(
    { ...request, from: recipient, value: "1000000000000000000" },
    desc,
    "registry"
  );
  expect(result?.fields[0].values[0]).toEqual({
    kind: "address",
    address: recipient,
  });
  expect(result?.fields[1].values[0]).toMatchObject({
    kind: "amount",
    amountRaw: "1000000000000000000",
  });
});
it("formats dates, units and enums while preserving unknown formats as raw", () => {
  const fields = applyFormat(
    {
      fields: [
        { path: "expiry", label: "Expiry", format: "date" },
        {
          path: "fee",
          label: "Fee",
          format: "unit",
          params: { decimals: 2, base: "%" },
        },
        { path: "mode", label: "Mode", format: "raw" },
        { value: "hello", label: "Unknown", format: "future-format" },
      ],
    },
    { chainId: 1, data: { expiry: "1800000000", fee: "123", mode: "0" } }
  );
  expect(fields[0].values[0]).toEqual({ kind: "date", timestamp: 1800000000 });
  expect(fields[1].values[0]).toMatchObject({ kind: "unit", text: "1.23%" });
  expect(fields[3].values[0]).toEqual({ kind: "raw", text: "hello" });
});

it("rejects malformed amount descriptors instead of crashing the view", () => {
  const desc = getBuiltinCalldataDescriptor(1, token, calldata)!;
  desc.display!.formats!["transfer(address to,uint256 amount)"].fields = [
    {
      value: "not-an-amount",
      label: "Amount",
      format: "tokenAmount",
      params: { tokenAddress: token },
    },
  ];
  expect(renderDescriptor(request, desc, "registry")).toBeNull();
});
it("discloses unknown sender in a form preview without bypassing required paths or assertions", () => {
  const descriptor = getBuiltinCalldataDescriptor(1, token, calldata)!;
  const format =
    descriptor.display!.formats!["transfer(address to,uint256 amount)"];
  format.fields!.push({
    path: "@.from",
    label: "Sender",
    format: "addressName",
  });
  expect(renderDescriptor(request, descriptor, "registry")).toBeNull();
  const preview = { ...request, allowMissingSender: true };
  expect(
    renderDescriptor(preview, descriptor, "registry")?.fields.at(-1)
  ).toMatchObject({
    label: "Sender",
    values: [{ kind: "raw", text: "Connect wallet to set sender" }],
  });
  format.required = ["@.from"];
  expect(renderDescriptor(preview, descriptor, "registry")).toBeNull();
  delete format.required;
  format.fields!.push({ path: "@.from", visible: { mustMatch: [recipient] } });
  expect(renderDescriptor(preview, descriptor, "registry")).toBeNull();
});
