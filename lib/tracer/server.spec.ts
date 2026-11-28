// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createHostedTraceHandler } from "./server";
const hash = `0x${"ab".repeat(32)}`;
const call = {
  type: "CALL",
  from: `0x${"11".repeat(20)}`,
  input: "0x",
  output: "0x",
};
function request(
  body: unknown = { chainId: 8453, hash },
  origin = "https://trace.eth.sh"
) {
  return new Request("https://trace.eth.sh/api/trace", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
function setup() {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (_url, init) => {
      const rpc = JSON.parse(init!.body as string);
      return Response.json({
        result: rpc.method === "eth_chainId" ? "0x2105" : call,
      });
    });
  return {
    fetcher,
    handler: createHostedTraceHandler({
      key: () => "PRIVATE_KEY",
      fetch: fetcher,
    }),
  };
}
describe("hosted tracing", () => {
  it("restricts the upstream host, method, identity and options; returns a normalized trace without credentials", async () => {
    const { handler, fetcher } = setup();
    const response = await handler(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      version: 1,
      chainId: 8453,
      transactionHash: hash,
      call: { ...call, id: "0", calls: [], logs: [] },
    });
    expect(JSON.stringify(body)).not.toContain("PRIVATE_KEY");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(
      Array(2).fill("https://base-mainnet.g.alchemy.com/v2/PRIVATE_KEY")
    );
    const init = fetcher.mock.calls[1][1]!;
    expect(init).toMatchObject({
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
    });
    expect(JSON.parse(init.body as string)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "debug_traceTransaction",
      params: [
        hash,
        {
          tracer: "callTracer",
          timeout: "20s",
          tracerConfig: { withLog: true },
        },
      ],
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([
    { chainId: 8453, hash, rpcUrl: "http://127.0.0.1:8545" },
    { chainId: 8453, hash, method: "eth_sendRawTransaction" },
    { chainId: "8453", hash },
    { chainId: -1, hash },
    { chainId: 8453, hash: "0x00" },
  ])(
    "rejects arbitrary URLs, methods and invalid inputs (%j)",
    async (body) => {
      const { handler, fetcher } = setup();
      expect((await handler(request(body))).status).toBe(400);
      expect(fetcher).not.toHaveBeenCalled();
    }
  );
  it("rejects cross-origin calls and oversized request bodies before accessing the provider", async () => {
    const { handler, fetcher } = setup();
    expect(
      (await handler(request(undefined, "https://evil.example"))).status
    ).toBe(403);
    expect((await handler(request({ data: "x".repeat(1025) }))).status).toBe(
      400
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("marks unknown and unconfigured hosting as unavailable for public fallback", async () => {
    const { handler, fetcher } = setup();
    expect(
      await (await handler(request({ chainId: 369, hash }))).json()
    ).toMatchObject({ unavailable: true });
    const absent = createHostedTraceHandler({
      key: () => undefined,
      fetch: fetcher,
    });
    expect((await absent(request())).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not trace if the upstream chain identity is wrong", async () => {
    const { handler, fetcher } = setup();
    fetcher.mockResolvedValue(Response.json({ result: "0x1" }));
    expect((await handler(request())).status).toBe(502);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["rpc", "network", "http", "invalid"])(
    "does not echo upstream secrets on %s errors",
    async (kind) => {
      const { handler, fetcher } = setup();
      if (kind === "network")
        fetcher.mockRejectedValue(new Error("https://provider/v2/PRIVATE_KEY"));
      else
        fetcher.mockResolvedValue(
          kind === "http"
            ? new Response("PRIVATE_KEY", { status: 403 })
            : kind === "invalid"
              ? Response.json({ result: { type: "PRIVATE_KEY" } })
              : Response.json({
                  error: {
                    code: -32601,
                    message: "method not found PRIVATE_KEY",
                  },
                })
        );
      const response = await handler(request());
      expect(response.ok).toBe(false);
      expect(await response.text()).not.toContain("PRIVATE_KEY");
    }
  );
  it("uses the zkSync-compatible callTracer options", async () => {
    const { handler, fetcher } = setup();
    fetcher.mockResolvedValueOnce(Response.json({ result: "0x144" }));
    fetcher.mockResolvedValueOnce(
      Response.json({
        result: { ...call, type: "call", error: null, revertReason: null },
      })
    );
    expect((await handler(request({ chainId: 324, hash }))).status).toBe(200);
    expect(
      JSON.parse(fetcher.mock.calls[1][1]!.body as string).params[1]
    ).toEqual({ tracer: "callTracer", timeout: "20s" });
  });
  it("bounds concurrent requests and releases capacity after errors", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      await blocked;
      throw Error("offline");
    });
    const handler = createHostedTraceHandler({
      key: () => "key",
      fetch: fetcher,
    });
    const pending = Array.from({ length: 3 }, () => handler(request()));
    // Let bounded request-body reads finish before checking the concurrency gate.
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    expect((await handler(request())).status).toBe(429);
    release();
    await Promise.all(pending);
    expect((await handler(request())).status).toBe(502);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("cancels a stalled upstream stream with a timeout", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new ReadableStream({ start() {} })));
    const handler = createHostedTraceHandler({
      key: () => "key",
      fetch: fetcher,
      timeoutMs: 10,
    });
    expect((await handler(request())).status).toBe(504);
  });
  it("bounds upstream responses before JSON parsing", async () => {
    const { handler, fetcher } = setup();
    fetcher.mockResolvedValue(new Response("x".repeat(1025)));
    expect((await handler(request())).status).toBe(502);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
