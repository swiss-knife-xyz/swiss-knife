import { beforeEach, expect, it, vi } from "vitest";
import { getGnsIdentityQueryKey, readGnsIdentity } from "./nameServiceIdentity";
import { namehash, zeroAddress } from "viem";
import {
  resolveNameToAddress,
  resolveAddressToName,
  getNameAvatar,
  isResolvableName,
} from "./nameResolution";
import {
  GNS_NAME_NFT_ADDRESS,
  GNS_UNIVERSAL_RESOLVER_ADDRESS,
  WNS_NAME_NFT_ADDRESS,
  XNS_REGISTRY_ADDRESS,
} from "./nameServiceContracts";

const rpc = vi.hoisted(() => ({
  getEnsAddress: vi.fn(),
  getEnsName: vi.fn(),
  getEnsAvatar: vi.fn(),
  readContract: vi.fn(),
}));
const baseRpc = vi.hoisted(() => ({ readContract: vi.fn() }));
vi.mock("./publicClient", () => ({
  getPublicClient: (chainId: number) => (chainId === 8453 ? baseRpc : rpc),
}));
const address = "0x0000000000000000000000000000000000000001";
beforeEach(() => {
  rpc.getEnsAddress.mockReset().mockResolvedValue(address);
  rpc.readContract.mockReset().mockResolvedValue(address);
  rpc.getEnsName.mockReset().mockResolvedValue(null);
  rpc.getEnsAvatar.mockReset().mockResolvedValue(null);
  baseRpc.readContract.mockReset().mockResolvedValue("");
});

it.each(["vitalik.eth", "sub.vitalik.eth", "alice.base.eth", "foo.gwei.eth"])(
  "preserves ENS and CCIP resolution for %s",
  async (name) => {
    expect(await resolveNameToAddress(name)).toBe(address);
    expect(rpc.getEnsAddress).toHaveBeenCalledExactlyOnceWith({ name });
    expect(rpc.readContract).not.toHaveBeenCalled();
  }
);

it.each(["alice.gwei", "sub.alice.gwei"])(
  "uses the existing GNS universal resolver for %s",
  async (name) => {
    expect(await resolveNameToAddress(name)).toBe(address);
    expect(rpc.getEnsAddress).toHaveBeenCalledExactlyOnceWith({
      name,
      universalResolverAddress: GNS_UNIVERSAL_RESOLVER_ADDRESS,
    });
    expect(rpc.readContract).not.toHaveBeenCalled();
  }
);

it.each(["alice.wei", "sub.alice.wei"])(
  "reads the WNS address record for %s",
  async (name) => {
    expect(await resolveNameToAddress(` ${name.toUpperCase()} `)).toBe(address);
    expect(rpc.getEnsAddress).not.toHaveBeenCalled();
    expect(rpc.readContract).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        address: WNS_NAME_NFT_ADDRESS,
        functionName: "addr",
        args: [namehash(name)],
      })
    );
  }
);

it.each(["missing.eth", "missing.gwei", "missing.wei", "missing@xns"])(
  "returns null for zero records and RPC failures for %s",
  async (name) => {
    rpc.getEnsAddress.mockResolvedValue(zeroAddress);
    rpc.readContract.mockResolvedValue(zeroAddress);
    expect(await resolveNameToAddress(name)).toBeNull();
    rpc.getEnsAddress.mockRejectedValue(new Error("RPC failed"));
    rpc.readContract.mockRejectedValue(new Error("RPC failed"));
    expect(await resolveNameToAddress(name)).toBeNull();
  }
);

it.each(["alice@xns", "vitalik@eth", "2-rich@4-real", "0xwhale@xns", `${"a".repeat(20)}@${"b".repeat(20)}`])(
  "resolves valid XNS name %s directly on mainnet without ENS normalization",
  async (name) => {
    expect(isResolvableName(` ${name} `)).toBe(true);
    expect(await resolveNameToAddress(` ${name} `)).toBe(address);
    expect(rpc.readContract).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      address: XNS_REGISTRY_ADDRESS,
      functionName: "getAddress",
      args: [name],
    }));
    expect(rpc.getEnsAddress).not.toHaveBeenCalled();
  }
);

it.each(["alice@", "@xns", "alice@@xns", "Alice@xns", "alice@XNS", "-alice@xns", "alice-@xns", "alice@-xns", "alice@xns-", "a--b@xns", "alice@x--ns", "a.b@xns", "alice@xns.eth", "a b@xns", "аlice@xns", `${"a".repeat(21)}@xns`, `alice@${"b".repeat(21)}`])(
  "rejects malformed XNS name %s without an RPC lookup",
  async (name) => {
    expect(isResolvableName(name)).toBe(false);
    expect(await resolveNameToAddress(name)).toBeNull();
    expect(rpc.readContract).not.toHaveBeenCalled();
    expect(rpc.getEnsAddress).not.toHaveBeenCalled();
  }
);

it("does not request ENS avatars for XNS names", async () => {
  expect(await getNameAvatar("alice@xns")).toBeNull();
  expect(rpc.getEnsAvatar).not.toHaveBeenCalled();
  expect(rpc.readContract).not.toHaveBeenCalled();
});

it("does not query a resolver for invalid names", async () => {
  expect(await resolveNameToAddress("bad..eth")).toBeNull();
  expect(rpc.getEnsAddress).not.toHaveBeenCalled();
  expect(rpc.readContract).not.toHaveBeenCalled();
});

it("preserves ENS priority when other primary names also exist", async () => {
  rpc.getEnsName.mockResolvedValue("alice.eth");
  rpc.readContract.mockImplementation(async ({ address: registry }) =>
    registry === GNS_NAME_NFT_ADDRESS ? "alice.gwei" : "alice.wei"
  );
  expect(await resolveAddressToName(address)).toBe("alice.eth");
});

it.each(["alice.gwei", "alice.wei", "sub.alice.gwei", "sub.alice.wei"])(
  "finds primary name %s through the correct registry",
  async (name) => {
    const registry = name.endsWith(".gwei")
      ? GNS_NAME_NFT_ADDRESS
      : WNS_NAME_NFT_ADDRESS;
    rpc.readContract.mockImplementation(async ({ address: target }) =>
      target === registry ? name : ""
    );
    expect(await resolveAddressToName(address)).toBe(name);
    expect(rpc.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: registry,
        functionName: "reverseResolve",
        args: [address],
      })
    );
  }
);

it("prefers GNS then WNS before the existing Basename fallback", async () => {
  rpc.readContract.mockImplementation(async ({ address: registry }) =>
    registry === GNS_NAME_NFT_ADDRESS ? "alice.gwei" : "alice.wei"
  );
  baseRpc.readContract.mockResolvedValue("alice.base.eth");
  expect(await resolveAddressToName(address)).toBe("alice.gwei");
  rpc.readContract.mockResolvedValue("");
  expect(await resolveAddressToName(address)).toBe("alice.base.eth");
});

it("still resolves when another name service fails and ignores malformed primary names", async () => {
  rpc.getEnsName.mockRejectedValue(new Error("ENS unavailable"));
  rpc.readContract.mockImplementation(async ({ address: registry }) => {
    if (registry === GNS_NAME_NFT_ADDRESS) throw new Error("GNS unavailable");
    return "alice.wei";
  });
  expect(await resolveAddressToName(address)).toBe("alice.wei");
  rpc.readContract.mockResolvedValue("not-a-name.eth");
  expect(await resolveAddressToName(address)).toBeNull();
});

it("reuses the wallet's GNS avatar route", async () => {
  rpc.getEnsAvatar.mockResolvedValue("https://example.com/avatar.png");
  expect(await getNameAvatar("alice.gwei")).toBe(
    "https://example.com/avatar.png"
  );
  expect(rpc.getEnsAvatar).toHaveBeenCalledExactlyOnceWith({
    name: "alice.gwei",
    universalResolverAddress: GNS_UNIVERSAL_RESOLVER_ADDRESS,
  });
});

it("reads WNS avatar records and parses them with the shared ENS avatar parser", async () => {
  const avatar = "data:image/png;base64,aGVsbG8=";
  rpc.readContract.mockResolvedValue(avatar);
  expect(await getNameAvatar("alice.wei")).toBe(avatar);
  expect(rpc.readContract).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      address: WNS_NAME_NFT_ADDRESS,
      functionName: "text",
      args: [namehash("alice.wei"), "avatar"],
    })
  );
  expect(rpc.getEnsAvatar).not.toHaveBeenCalled();
});

it("keeps the wallet GNS identity reader and query keys compatible", async () => {
  rpc.readContract.mockResolvedValue("alice.gwei");
  rpc.getEnsAvatar.mockResolvedValue("https://example.com/gns.png");
  expect(await readGnsIdentity(address)).toEqual({
    name: "alice.gwei",
    avatar: "https://example.com/gns.png",
  });
  expect(getGnsIdentityQueryKey(address)).toEqual([
    "gns",
    "identity",
    address.toLowerCase(),
  ]);
  rpc.getEnsAvatar.mockRejectedValue(new Error("No avatar"));
  expect(await readGnsIdentity(address)).toEqual({
    name: "alice.gwei",
    avatar: null,
  });
});
