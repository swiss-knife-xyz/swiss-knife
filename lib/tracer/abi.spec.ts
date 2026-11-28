import { expect, it, vi } from "vitest";
import {
  fetchTraceAbi,
  fetchVerifiedBlockscoutAbi,
  type TraceAbi,
} from "./abi";
const address = `0x${"ab".repeat(20)}`;
const abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
  },
];
const payload = {
  name: "Token",
  abi,
  is_verified: true,
  is_fully_verified: true,
  is_partially_verified: false,
  is_changed_bytecode: false,
  verified_twin_address_hash: null,
};
const fetcher = (data: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(data));
it("fetches the exact chain/address from the existing fixed provider catalog without credentials or redirects", async () => {
  const request = fetcher(payload);
  const result = await fetchVerifiedBlockscoutAbi(
    { chainId: 1, address },
    request
  );
  expect(request).toHaveBeenCalledWith(
    new URL(`https://eth.blockscout.com/api/v2/smart-contracts/${address}`),
    expect.objectContaining({
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: expect.any(AbortSignal),
    })
  );
  expect(result).toMatchObject({ name: "Token", source: "blockscout", abi });
});
it.each([
  { is_verified: false },
  { is_fully_verified: false },
  { is_partially_verified: true },
  { is_changed_bytecode: true },
  { verified_twin_address_hash: address },
  { is_blueprint: true },
  { abi: "[]" },
  { abi: [{ type: "function", inputs: [] }] },
  { name: "" },
])(
  "rejects non-full, changed, twin and malformed records %j",
  async (extra) => {
    expect(
      await fetchVerifiedBlockscoutAbi(
        { chainId: 1, address },
        fetcher({ ...payload, ...extra })
      )
    ).toBeNull();
  }
);
it("does not request unsupported networks or malformed identities", async () => {
  const request = fetcher(payload);
  for (const chainId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER])
    expect(
      await fetchVerifiedBlockscoutAbi({ chainId, address }, request)
    ).toBeNull();
  expect(
    await fetchVerifiedBlockscoutAbi(
      { chainId: 1, address: "http://localhost/private" },
      request
    )
  ).toBeNull();
  expect(request).not.toHaveBeenCalled();
});
it("bounds provider data and handles HTTP/network failures without inventing an ABI", async () => {
  const oversized = fetcher({
    ...payload,
    source_code: "x".repeat(4 * 1024 * 1024),
  });
  expect(
    await fetchVerifiedBlockscoutAbi({ chainId: 1, address }, oversized)
  ).toBeNull();
  expect(
    await fetchVerifiedBlockscoutAbi(
      { chainId: 1, address },
      vi.fn().mockResolvedValue(new Response(null, { status: 429 }))
    )
  ).toBeNull();
  expect(
    await fetchVerifiedBlockscoutAbi(
      { chainId: 1, address },
      vi.fn().mockRejectedValue(new Error("DNS failure"))
    )
  ).toBeNull();
});
it("retains primary provider priority and falls back only when the primary fails", async () => {
  const primary = vi.fn().mockResolvedValue({ abi, name: "Primary" });
  const fallback = vi
    .fn()
    .mockResolvedValue({ abi, name: "Fallback", source: "blockscout" });
  expect(
    await fetchTraceAbi({ chainId: 1, address }, { primary, fallback })
  ).toMatchObject({ name: "Primary", source: "explorer" });
  expect(fallback).not.toHaveBeenCalled();
  primary.mockRejectedValue(new Error("ENOTFOUND"));
  expect(
    await fetchTraceAbi({ chainId: 1, address }, { primary, fallback })
  ).toMatchObject({ name: "Fallback", source: "blockscout" });
  expect(fallback).toHaveBeenCalledWith({ chainId: 1, address });
});
it("keeps partial responses unavailable instead of labelling them verified", async () => {
  await expect(
    fetchTraceAbi(
      { chainId: 1, address },
      {
        primary: vi.fn().mockRejectedValue(new Error("unavailable")),
        fallback: vi.fn().mockResolvedValue(null),
      }
    )
  ).rejects.toThrow("No verified contract ABI");
});
it("uses the fallback after a primary lookup stalls instead of blocking the trace indefinitely", async () => {
  vi.useFakeTimers();
  try {
    const fallback = vi
      .fn()
      .mockResolvedValue({ abi, name: "Fallback", source: "blockscout" });
    const pending = fetchTraceAbi(
      { chainId: 1, address },
      { primary: vi.fn(() => new Promise<TraceAbi>(() => {})), fallback }
    );
    await vi.advanceTimersByTimeAsync(10000);
    expect(await pending).toMatchObject({ source: "blockscout" });
    expect(fallback).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
it("validates identities before any provider request", async () => {
  const primary = vi.fn();
  const fallback = vi.fn();
  await expect(
    fetchTraceAbi({ chainId: 1, address: "invalid" }, { primary, fallback })
  ).rejects.toThrow("Invalid contract identity");
  expect(primary).not.toHaveBeenCalled();
  expect(fallback).not.toHaveBeenCalled();
});
