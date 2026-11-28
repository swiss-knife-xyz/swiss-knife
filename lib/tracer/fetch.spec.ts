import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  wait: vi.fn(),
  hosted: vi.fn(),
  getChainId: vi.fn(),
  request: vi.fn(),
  getClient: vi.fn(),
}));
vi.mock("./hosted", () => ({ fetchHostedTrace: mocks.hosted }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: mocks.getClient }));
vi.mock("@/lib/customChains/store", () => ({
  waitForCustomChains: mocks.wait,
}));
import { fetchTransactionTrace } from "./fetch";
const hash = `0x${"ab".repeat(32)}`;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.wait.mockResolvedValue(undefined);
  mocks.hosted.mockResolvedValue(null);
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
  expect(mocks.getClient).toHaveBeenCalledWith(1, {
    timeout: 30000,
    rpcPolicy: "trace",
  });
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

it("uses hosted tracing first on audited unsupported public networks", async () => {
  const document = { version: 1, chainId: 1, transactionHash: hash, call: {} };
  mocks.hosted.mockResolvedValue(document);
  expect(await fetchTransactionTrace(1, hash)).toBe(document);
  expect(mocks.getClient).not.toHaveBeenCalled();
  expect(mocks.wait.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.hosted.mock.invocationCallOrder[0]
  );
});
it("tries the hosted fallback only after a public failure on other supported chains", async () => {
  mocks.getChainId.mockResolvedValue(137);
  await fetchTransactionTrace(137, hash);
  expect(mocks.hosted).not.toHaveBeenCalled();
  mocks.request.mockRejectedValue(new Error("method not found"));
  mocks.hosted.mockResolvedValue({ chainId: 137 });
  expect(await fetchTransactionTrace(137, hash)).toEqual({ chainId: 137 });
});
it("never calls hosted tracing for a saved RPC, even when that RPC fails", async () => {
  const { applyCustomNetworks } = await import("@/data/networks");
  // Registry API keeps saved endpoints isolated from provider routing.
  applyCustomNetworks([
    {
      id: 1,
      name: "Local fork",
      rpcUrl: "http://localhost:8545",
      symbol: "ETH",
      decimals: 18,
      testnet: false,
    },
  ]);
  try {
    mocks.request.mockRejectedValue(new Error("method not found"));
    await expect(fetchTransactionTrace(1, hash)).rejects.toThrow(
      "Tracing is unavailable"
    );
    expect(mocks.hosted).not.toHaveBeenCalled();
  } finally {
    applyCustomNetworks([]);
  }
});

it.each([369, 25, 8217, 250, 40, 1313161554])(
  "traces chain %i with the direct public trace policy without hosted credentials",
  async (chainId) => {
    mocks.getChainId.mockResolvedValue(chainId);
    const document = await fetchTransactionTrace(chainId, hash);
    expect(document.chainId).toBe(chainId);
    expect(mocks.getClient).toHaveBeenCalledWith(chainId, {
      timeout: 30000,
      rpcPolicy: "trace",
    });
    expect(mocks.hosted).not.toHaveBeenCalled();
  }
);
