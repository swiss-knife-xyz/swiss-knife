import { expect, it, vi } from "vitest";
import { createTraceDecodeStore } from "./decodingStore";
import { normalizeTrace } from "./model";
import type { DecodedTraceCall } from "./decode";
const call = (id: string) => ({
  ...normalizeTrace({
    type: "CALL",
    from: `0x${"11".repeat(20)}`,
    to: `0x${"11".repeat(20)}`,
    input: "0x",
  }).call,
  id,
});
const result: DecodedTraceCall = {
  input: null,
  inputInferred: false,
  revert: null,
  logs: {},
  note: "",
};
async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
it("bounds decoding concurrency, deduplicates requests and pauses abandoned queues", async () => {
  const pending: Array<(data: DecodedTraceCall) => void> = [];
  const decode = vi.fn(
    () => new Promise<DecodedTraceCall>((resolve) => pending.push(resolve))
  );
  const setAbi = vi.fn();
  const loader = vi.fn(async () => ({
    createTraceDecoder: () => ({ decode, setAbi }),
  }));
  const store = createTraceDecodeStore(1, {}, loader);
  const unsubscribe = store.subscribe(() => {});
  store.enqueue([call("0"), call("1"), call("2"), call("3"), call("4")]);
  store.enqueue([call("0")]);
  await flush();
  expect(decode).toHaveBeenCalledTimes(3);
  pending[0](result);
  await flush();
  expect(decode).toHaveBeenCalledTimes(4);
  unsubscribe();
  for (const resolve of pending) resolve(result);
  await flush();
  expect(decode).toHaveBeenCalledTimes(4);
  expect(store.getSnapshot().entries["4"].status).toBe("queued");
  const again = store.subscribe(() => {});
  await flush();
  expect(decode).toHaveBeenCalledTimes(5);
  pending[4](result);
  await flush();
  again();
  expect(store.getSnapshot().completed).toBe(5);
});
it("rejects stale decoding results after applying an ABI override", async () => {
  const pending: Array<(data: DecodedTraceCall) => void> = [];
  const decode = vi.fn(
    () => new Promise<DecodedTraceCall>((resolve) => pending.push(resolve))
  );
  const setAbi = vi.fn();
  const store = createTraceDecodeStore(1, {}, async () => ({
    createTraceDecoder: () => ({ decode, setAbi }),
  }));
  const unsubscribe = store.subscribe(() => {});
  store.enqueue([call("0")]);
  await flush();
  await store.setAbi(`0x${"11".repeat(20)}`, ["function f()"]);
  await flush();
  expect(setAbi).toHaveBeenCalledTimes(1);
  pending[0]({ ...result, note: "old ABI" });
  await flush();
  expect(store.getSnapshot().entries["0"].data?.note).not.toBe("old ABI");
  pending[1]({ ...result, note: "provided ABI" });
  await flush();
  expect(store.getSnapshot().entries["0"].data?.note).toBe("provided ABI");
  unsubscribe();
});
it("keeps other contracts' decoded results when a single ABI is overridden", async () => {
  const decode = vi.fn(async () => result);
  const store = createTraceDecodeStore(1, {}, async () => ({
    createTraceDecoder: () => ({ decode, setAbi: vi.fn() }),
  }));
  const unsubscribe = store.subscribe(() => {});
  store.enqueue([call("0"), { ...call("1"), to: `0x${"22".repeat(20)}` }]);
  await flush();
  const unrelated = store.getSnapshot().entries["1"];
  await store.setAbi(`0x${"11".repeat(20)}`, ["function f()"]);
  await flush();
  expect(decode).toHaveBeenCalledTimes(3);
  expect(store.getSnapshot().entries["1"]).toBe(unrelated);
  unsubscribe();
});
