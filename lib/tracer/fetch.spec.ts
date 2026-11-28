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
it.each([
  [
    {
      message: "Request failed",
      cause: { code: -32601, message: "Unavailable" },
    },
    "Tracing is unavailable",
  ],
  [{ code: -32004, message: "Disabled" }, "Tracing is unavailable"],
  [
    new Error('Method "debug_traceTransaction" is not supported.'),
    "Tracing is unavailable",
  ],
  [
    new Error("debug_traceTransaction is not enabled"),
    "Tracing is unavailable",
  ],
  [new Error("unknown tracer: callTracer"), "does not support callTracer"],
  [{ cause: { status: 403, message: "Forbidden" } }, "RPC access denied"],
  [new Error("Tracing is not available on your plan"), "RPC access denied"],
  [{ cause: { status: 429 } }, "RPC rate limit reached"],
  [new Error("missing trie node"), "Historical state is unavailable"],
  [
    new Error(
      "method debug_traceTransaction returned error: transaction not found"
    ),
    "Transaction not found on this RPC",
  ],
  [new Error("Request timed out"), "public RPC doesn't support debug traces"],
])(
  "distinguishes tracing support from provider and transaction failures (%j)",
  async (error, message) => {
    mocks.request.mockRejectedValue(error);
    await expect(fetchTransactionTrace(1, hash)).rejects.toThrow(message);
    expect(mocks.request).toHaveBeenCalledTimes(1);
  }
);
it("does not expose RPC credentials in displayed errors or loop on circular causes", async () => {
  const error: { message: string; cause?: unknown } = {
    message: "Request failed: https://rpc.example/PRIVATE_API_KEY",
  };
  error.cause = error;
  mocks.request.mockRejectedValue(error);
  await expect(fetchTransactionTrace(1, hash)).rejects.toThrow(
    "Could not fetch trace."
  );
});
it("names the network and tracing method on timeout without claiming tracing is unsupported", async () => {
  mocks.getChainId.mockResolvedValue(8453);
  mocks.request.mockRejectedValue(new Error("Request timed out"));
  await expect(fetchTransactionTrace(8453, hash)).rejects.toThrow(
    "Base public RPC doesn't support debug traces"
  );
});
