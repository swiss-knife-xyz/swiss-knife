// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/clearsigning/descriptor/route";
const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), bytes: vi.fn() }));
vi.mock("@/app/api/clearsigning/descriptor/registry", () => ({
  getRegistrySnapshot: mocks.snapshot,
}));
vi.mock("@/lib/clearSigningRegistry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/clearSigningRegistry")>()),
  fetchRegistryBytes: mocks.bytes,
}));
const address = "0x4444444444444444444444444444444444444444";
const descriptor = {
  context: { contract: { deployments: [{ chainId: 1, address }] } },
  display: {
    formats: {
      "transfer(address to,uint256 amount)": { intent: "Transfer", fields: [] },
    },
  },
};
const url = `https://eth.sh/api/clearsigning/descriptor?chainId=1&address=${address}&kind=calldata&selector=0xa9059cbb`;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.snapshot.mockResolvedValue({
    entries: {
      "1": { [address]: { calldata: ["registry/example/transfer.json"] } },
    },
  });
  mocks.bytes.mockResolvedValue(Buffer.from(JSON.stringify(descriptor)));
});
it.each([
  "chainId=nope&address=0xabc",
  `chainId=1&address=${address}&selector=0xabc`,
  `chainId=1&address=${address}&kind=nope`,
])("rejects malformed lookup %s", async (query) => {
  const response = await GET(
    new NextRequest(`https://eth.sh/api/clearsigning/descriptor?${query}`)
  );
  expect(response.status).toBe(400);
  expect(mocks.snapshot).not.toHaveBeenCalled();
});
it("selects and returns the descriptor matching the selector", async () => {
  const response = await GET(new NextRequest(url));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    descriptor,
    sourcePath: "registry/example/transfer.json",
    kind: "calldata",
  });
});
it("returns 404 for another selector rather than another function's descriptor", async () => {
  const response = await GET(
    new NextRequest(url.replace("0xa9059cbb", "0x095ea7b3"))
  );
  expect(response.status).toBe(404);
});
it("returns 404 for a missing deployment without fetching arbitrary content", async () => {
  mocks.snapshot.mockResolvedValue({ entries: {} });
  expect((await GET(new NextRequest(url))).status).toBe(404);
  expect(mocks.bytes).not.toHaveBeenCalled();
});
it("does not follow descriptor paths outside the public registry", async () => {
  mocks.snapshot.mockResolvedValue({
    entries: {
      "1": { [address]: { calldata: ["https://example.com/internal"] } },
    },
  });
  expect((await GET(new NextRequest(url))).status).toBe(502);
  expect(mocks.bytes).not.toHaveBeenCalled();
});
