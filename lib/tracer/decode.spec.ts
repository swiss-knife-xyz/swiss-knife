import { expect, it, vi } from "vitest";
import { Interface } from "ethers";
import { createTraceDecoder, traceCodeAddress } from "./decode";
import { normalizeTrace } from "./model";

const abi = [
  "function balanceOf(address owner) view returns (uint256 balance)",
  "function transfer(address to, uint256 amount) returns (bool success)",
  "function echo(bytes payload) returns (bytes payload)",
  "function positions() view returns (tuple(address owner,uint256[] amounts)[] positions)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Note(string indexed key, uint256 value)",
  "error InsufficientBalance(uint256 available, uint256 requested)",
];
const iface = new Interface(abi);
const from = `0x${"11".repeat(20)}`;
const to = `0x${"22".repeat(20)}`;
const code = `0x${"33".repeat(20)}`;
const call = (extra = {}) =>
  normalizeTrace({
    type: "CALL",
    from,
    to,
    input: iface.encodeFunctionData("balanceOf", [from]),
    output: iface.encodeFunctionResult("balanceOf", [2n ** 100n]),
    ...extra,
  }).call;
function setup() {
  const fetchAbi = vi.fn().mockResolvedValue({ abi, name: "Token" });
  const fetchSignatures = vi.fn().mockResolvedValue(["balanceOf(address)"]);
  return {
    fetchAbi,
    fetchSignatures,
    decoder: createTraceDecoder(1, {}, { fetchAbi, fetchSignatures }),
  };
}
it("decodes typed input and exact large return values through the shared decoder", async () => {
  const { decoder } = setup();
  const result = await decoder.decode(call());
  expect(result.input?.functionName).toBe("balanceOf");
  expect(result.input?.args[0].value).toBe(from);
  expect(result.outputs?.[0]).toMatchObject({
    name: "balance",
    type: "uint256",
    value: (2n ** 100n).toString(),
  });
  expect(result.inputInferred).toBe(false);
});
it("shares ABI and equivalent-frame work within a trace", async () => {
  const { decoder, fetchAbi } = setup();
  const frame = call();
  const [first, repeated] = await Promise.all([
    decoder.decode(frame),
    decoder.decode({ ...frame, id: "another-frame" }),
    decoder.decode(
      call({ output: iface.encodeFunctionResult("balanceOf", [7n]) })
    ),
  ]);
  expect(first).toBe(repeated);
  expect(fetchAbi).toHaveBeenCalledTimes(1);
});
it("uses the historical delegate-call target for both proxy and implementation frames", async () => {
  const frame = call({
    calls: [
      {
        type: "DELEGATECALL",
        from: to,
        to: code,
        input: call().input,
        output: call().output,
      },
    ],
  });
  const { decoder, fetchAbi } = setup();
  expect(traceCodeAddress(frame)).toBe(code);
  const decoded = await decoder.decode(frame);
  expect(decoded.codeAddress).toBe(code);
  expect(fetchAbi).toHaveBeenCalledWith({ address: code, chainId: 1 });
  expect(fetchAbi).not.toHaveBeenCalledWith({ address: to, chainId: 1 });
});
it("decodes custom errors, never treating revert bytes as successful returns", async () => {
  const { decoder } = setup();
  const result = await decoder.decode(
    call({
      error: "execution reverted",
      output: iface.encodeErrorResult("InsufficientBalance", [1n, 2n]),
    })
  );
  expect(result.outputs).toBeUndefined();
  expect(result.revert?.functionName).toBe("InsufficientBalance");
  expect(result.revert?.args.map((arg) => arg.value)).toEqual(["1", "2"]);
});
it("retains malformed returns as raw and distinguishes empty returns from unknown data", async () => {
  const { decoder } = setup();
  expect(
    (await decoder.decode(call({ output: "0x01" }))).outputs
  ).toBeUndefined();
  expect(
    (await decoder.decode(call({ output: "0x" }))).outputs
  ).toBeUndefined();
});
it("preserves tuples, arrays and recursively decoded bytes in return values", async () => {
  const { decoder } = setup();
  const nested = iface.encodeFunctionData("transfer", [from, 7n]);
  const echoed = await decoder.decode(
    call({
      input: iface.encodeFunctionData("echo", [nested]),
      output: iface.encodeFunctionResult("echo", [nested]),
    })
  );
  expect(
    (echoed.outputs![0].value as { decoded: { functionName: string } }).decoded
      .functionName
  ).toBe("transfer");
  const tuples = await decoder.decode(
    call({
      input: iface.encodeFunctionData("positions"),
      output: iface.encodeFunctionResult("positions", [
        [[from, [7n, 2n ** 100n]]],
      ]),
    })
  );
  const items = tuples.outputs![0].value as import("@/types").Arg[];
  const fields = items[0].value as import("@/types").Arg[];
  expect(fields[0].value).toBe(from);
  expect(
    (fields[1].value as import("@/types").Arg[]).map((arg) => arg.value)
  ).toEqual(["7", (2n ** 100n).toString()]);
});
it("decodes events at their original indexes and retains indexed dynamic hashes", async () => {
  const { decoder } = setup();
  const transfer = iface.encodeEventLog(iface.getEvent("Transfer")!, [
    from,
    to,
    7n,
  ]);
  const note = iface.encodeEventLog(iface.getEvent("Note")!, ["key", 8n]);
  const result = await decoder.decode(
    call({
      logs: [
        { address: to, topics: [], data: "0x", position: 0 },
        { address: to, ...transfer, position: 0 },
        { address: to, ...note, position: 0 },
      ],
    })
  );
  expect(result.logs[0]).toBeUndefined();
  expect(result.logs[1].eventName).toBe("Transfer");
  expect(result.logs[1].args[2].value).toBe("7");
  expect(result.logs[2].args[0]).toMatchObject({
    type: "bytes32",
    decodeNote: "Indexed string hash",
    rawValue: note.topics[1],
  });
});
it("uses provided ABIs without a chain or network lookup and re-decodes after override", async () => {
  const decoder = createTraceDecoder(undefined, { [to]: abi });
  expect((await decoder.decode(call())).abiSource).toBe("provided");
  const replacement = [
    "function balanceOf(address wallet) view returns (uint256 quantity)",
  ];
  decoder.setAbi(to, replacement);
  expect((await decoder.decode(call())).outputs?.[0].name).toBe("quantity");
});
it("marks signature-only inputs inferred and leaves unknown return types raw", async () => {
  const { decoder, fetchAbi, fetchSignatures } = setup();
  fetchAbi.mockRejectedValue(new Error("unverified"));
  const result = await decoder.decode(call());
  expect(result.input?.functionName).toBe("balanceOf");
  expect(result.inputInferred).toBe(true);
  expect(result.outputs).toBeUndefined();
  expect(fetchSignatures).toHaveBeenCalledTimes(1);
});
it("rejects ambiguous selector collisions instead of choosing a plausible signature", async () => {
  const { decoder, fetchAbi, fetchSignatures } = setup();
  fetchAbi.mockRejectedValue(new Error("unverified"));
  fetchSignatures.mockResolvedValue([
    "burn(uint256)",
    "collate_propagate_storage(bytes16)",
  ]);
  const result = await decoder.decode(
    call({
      input: `0x42966c68${"ff".repeat(16)}${"00".repeat(16)}`,
      output: "0x",
    })
  );
  expect(result.input).toBeNull();
  expect(result.note).toContain("Multiple signatures");
});
it("does not interpret CREATE initcode as calldata", async () => {
  const { decoder, fetchAbi } = setup();
  const result = await decoder.decode(call({ type: "CREATE" }));
  expect(result.input).toBeNull();
  expect(fetchAbi).not.toHaveBeenCalled();
});
it("does not mistake a function named Error for reverted input data", async () => {
  const custom = ["function Error(string reason) returns (bool ok)"];
  const functions = new Interface(custom);
  const decoder = createTraceDecoder(undefined, { [to]: custom });
  const result = await decoder.decode(
    call({
      input: functions.encodeFunctionData("Error", ["a normal argument"]),
      output: functions.encodeFunctionResult("Error", [true]),
    })
  );
  expect(result.input?.kind).toBeUndefined();
  expect(result.input?.functionName).toBe("Error");
  expect(result.input?.args[0].value).toBe("a normal argument");
  expect(result.outputs?.[0].rawValue).toBe(true);
});
it("keeps noncanonical event payloads raw rather than ignoring trailing words", async () => {
  const { decoder } = setup();
  const log = iface.encodeEventLog(iface.getEvent("Transfer")!, [from, to, 7n]);
  const result = await decoder.decode(
    call({
      logs: [
        {
          address: to,
          ...log,
          data: `${log.data}${"00".repeat(32)}`,
          position: 0,
        },
      ],
    })
  );
  expect(result.logs[0]).toBeUndefined();
});
it("retains fully verified fallback provenance in decoded calls", async () => {
  const { decoder, fetchAbi } = setup();
  fetchAbi.mockResolvedValue({ abi, name: "Token", source: "blockscout" });
  const result = await decoder.decode(call());
  expect(result.abiSource).toBe("blockscout");
  expect(result.note).toContain("fully verified Blockscout ABI");
  expect(result.inputInferred).toBe(false);
  expect(result.outputs?.[0].type).toBe("uint256");
});
