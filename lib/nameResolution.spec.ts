import { beforeEach, expect, it, vi } from "vitest";
import { namehash, zeroAddress } from "viem";
import { resolveNameToAddress } from "./nameResolution";
import { GNS_UNIVERSAL_RESOLVER_ADDRESS, WNS_NAME_NFT_ADDRESS } from "./nameServiceContracts";

const rpc = vi.hoisted(() => ({ getEnsAddress: vi.fn(), readContract: vi.fn() }));
vi.mock("./publicClient", () => ({ getPublicClient: () => rpc }));
const address = "0x0000000000000000000000000000000000000001";
beforeEach(() => {
  rpc.getEnsAddress.mockReset().mockResolvedValue(address);
  rpc.readContract.mockReset().mockResolvedValue(address);
});

it.each(["vitalik.eth", "sub.vitalik.eth", "alice.base.eth", "foo.gwei.eth"])("preserves ENS and CCIP resolution for %s", async name => {
  expect(await resolveNameToAddress(name)).toBe(address);
  expect(rpc.getEnsAddress).toHaveBeenCalledExactlyOnceWith({ name });
  expect(rpc.readContract).not.toHaveBeenCalled();
});

it.each(["alice.gwei", "sub.alice.gwei"])("uses the existing GNS universal resolver for %s", async name => {
  expect(await resolveNameToAddress(name)).toBe(address);
  expect(rpc.getEnsAddress).toHaveBeenCalledExactlyOnceWith({ name, universalResolverAddress: GNS_UNIVERSAL_RESOLVER_ADDRESS });
  expect(rpc.readContract).not.toHaveBeenCalled();
});

it.each(["alice.wei", "sub.alice.wei"])("reads the WNS address record for %s", async name => {
  expect(await resolveNameToAddress(` ${name.toUpperCase()} `)).toBe(address);
  expect(rpc.getEnsAddress).not.toHaveBeenCalled();
  expect(rpc.readContract).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ address: WNS_NAME_NFT_ADDRESS, functionName: "addr", args: [namehash(name)] }));
});

it.each(["missing.eth", "missing.gwei", "missing.wei"])("returns null for zero records and RPC failures for %s", async name => {
  rpc.getEnsAddress.mockResolvedValue(zeroAddress);
  rpc.readContract.mockResolvedValue(zeroAddress);
  expect(await resolveNameToAddress(name)).toBeNull();
  rpc.getEnsAddress.mockRejectedValue(new Error("RPC failed"));
  rpc.readContract.mockRejectedValue(new Error("RPC failed"));
  expect(await resolveNameToAddress(name)).toBeNull();
});

it("does not query a resolver for invalid names", async () => {
  expect(await resolveNameToAddress("bad..eth")).toBeNull();
  expect(rpc.getEnsAddress).not.toHaveBeenCalled();
  expect(rpc.readContract).not.toHaveBeenCalled();
});
