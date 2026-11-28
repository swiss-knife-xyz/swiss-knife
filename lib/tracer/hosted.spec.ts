// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { fetchHostedTrace } from "./hosted";
const hash = `0x${"ab".repeat(32)}`;
const trace = {
  version: 1,
  chainId: 8453,
  transactionHash: hash,
  call: { type: "CALL", from: `0x${"11".repeat(20)}` },
};
afterEach(() => vi.unstubAllGlobals());
it("posts only transaction identity to the same-origin endpoint", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(trace));
  vi.stubGlobal("fetch", fetcher);
  expect(await fetchHostedTrace(8453, hash)).toMatchObject(trace);
  expect(fetcher.mock.calls[0][0]).toBe("/api/trace");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    chainId: 8453,
    hash,
  });
});
it("allows public fallback when hosting isn't configured, and skips unsupported chains", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ unavailable: true }, { status: 503 }));
  vi.stubGlobal("fetch", fetcher);
  expect(await fetchHostedTrace(8453, hash)).toBeNull();
  expect(await fetchHostedTrace(369, hash)).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects successful responses for another transaction or chain", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ ...trace, chainId: 1 }))
  );
  await expect(fetchHostedTrace(8453, hash)).rejects.toThrow(
    "identity mismatch"
  );
});
it("presents the endpoint's bounded error message", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "Tracing is busy." }, { status: 429 })
      )
  );
  await expect(fetchHostedTrace(8453, hash)).rejects.toThrow(
    "Tracing is busy."
  );
});
