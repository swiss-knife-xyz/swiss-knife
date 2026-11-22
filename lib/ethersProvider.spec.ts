// @vitest-environment node
import { createServer } from "node:http";
import { expect, it } from "vitest";
import { getEthersProvider } from "./ethersProvider";
import { chainIdToCustomRpcUrl } from "@/data/networks";

it("reads storage through the configured selected-chain endpoint with the ethers adapter", async () => {
  const requests: { method: string; params?: unknown[] }[] = [];
  const value = `0x${"0".repeat(63)}1`;
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body);
    const reply = (rpc: { id: number; method: string; params?: unknown[] }) => {
      requests.push(rpc);
      return {
        jsonrpc: "2.0",
        id: rpc.id,
        result:
          rpc.method === "eth_chainId"
            ? "0x2105"
            : rpc.method === "eth_blockNumber"
              ? "0x100"
              : value,
      };
    };
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify(Array.isArray(input) ? input.map(reply) : reply(input))
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const previous = chainIdToCustomRpcUrl[8453];
  chainIdToCustomRpcUrl[8453] = `http://127.0.0.1:${port}`;
  const provider = getEthersProvider(8453);
  try {
    expect(await provider.getStorage(`0x${"11".repeat(20)}`, "0x0")).toBe(
      value
    );
    expect(
      requests.some((request) => request.method === "eth_getStorageAt")
    ).toBe(true);
    expect((await provider.getNetwork()).chainId).toBe(8453n);
  } finally {
    provider.destroy();
    chainIdToCustomRpcUrl[8453] = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
it("does not construct a provider for an unsupported network", () => {
  expect(() => getEthersProvider(999999123)).toThrow("Unsupported RPC chain");
});
