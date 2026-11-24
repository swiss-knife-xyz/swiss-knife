import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  wait: vi.fn(),
  getChainId: vi.fn(),
  request: vi.fn(),
  getClient: vi.fn(),
}));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: mocks.getClient }));
vi.mock("@/lib/customChains/store", () => ({
  waitForCustomChains: mocks.wait,
}));
import { fetchTransactionTrace } from "./fetch";
const hash = `0x${"ab".repeat(32)}`;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.wait.mockResolvedValue(undefined);
  mocks.getChainId.mockResolvedValue(1);
  mocks.getClient.mockReturnValue({
    getChainId: mocks.getChainId,
    request: mocks.request,
  });
  mocks.request.mockResolvedValue({
    type: "CALL",
    from: `0x${"11".repeat(20)}`,
    input: "0x",
    output: "0x",
  });
});
it("waits for saved settings, verifies identity, then requests bounded callTracer output", async () => {
  const document = await fetchTransactionTrace(1, hash);
  expect(mocks.wait.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.getClient.mock.invocationCallOrder[0]
  );
  expect(mocks.getChainId.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.request.mock.invocationCallOrder[0]
  );
  expect(mocks.request).toHaveBeenCalledWith(
    {
      method: "debug_traceTransaction",
      params: [
        hash,
        {
          tracer: "callTracer",
          timeout: "20s",
          tracerConfig: { withLog: true },
        },
      ],
    },
    { retryCount: 0 }
  );
  expect(document.transactionHash).toBe(hash);
  expect(document.chainId).toBe(1);
});
it("does not make RPC calls for invalid hashes or unavailable saved settings", async () => {
  await expect(fetchTransactionTrace(1, "bad")).rejects.toThrow(
    "transaction hash"
  );
  expect(mocks.getClient).not.toHaveBeenCalled();
  mocks.wait.mockRejectedValue(new Error("settings unavailable"));
  await expect(fetchTransactionTrace(1, hash)).rejects.toThrow(
    "settings unavailable"
  );
  expect(mocks.getClient).not.toHaveBeenCalled();
});
it("rejects mismatched chain identity before tracing", async () => {
  mocks.getChainId.mockResolvedValue(8453);
  await expect(fetchTransactionTrace(1, hash)).rejects.toThrow(
    "chain mismatch"
  );
  expect(mocks.request).not.toHaveBeenCalled();
});
it("reports unsupported tracing with an actionable import alternative", async () => {
  mocks.request.mockRejectedValue(new Error("method not found"));
  await expect(fetchTransactionTrace(1, hash)).rejects.toThrow(
    "import callTracer JSON"
  );
});
