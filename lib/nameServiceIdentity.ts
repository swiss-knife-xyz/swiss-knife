import { isAddress, namehash, parseAbi, type Address } from "viem";
import { normalize, parseAvatarRecord } from "viem/ens";
import { mainnet } from "viem/chains";
import { getPublicClient } from "./publicClient";
import {
  GNS_NAME_NFT_ADDRESS,
  GNS_UNIVERSAL_RESOLVER_ADDRESS,
  WNS_NAME_NFT_ADDRESS,
} from "./nameServiceContracts";

const client = getPublicClient(mainnet.id);
const identityAbi = parseAbi([
  "function reverseResolve(address addr) view returns (string)",
  "function text(bytes32 node, string key) view returns (string)",
]);

export type GnsIdentity = { name: string; avatar: string | null };

export function getGnsIdentityQueryKey(address: Address | string) {
  return ["gns", "identity", address.toLowerCase()] as const;
}

// Both registries forward-check primary names in reverseResolve, including
// expiry and subdomain validity. Reuse this path for wallets and parameters.
async function readPrimaryName(
  address: string,
  registry: Address,
  suffix: string
) {
  if (!isAddress(address)) return null;
  try {
    const name = await client.readContract({
      address: registry,
      abi: identityAbi,
      functionName: "reverseResolve",
      args: [address],
    });
    if (!name || !name.toLowerCase().endsWith(suffix)) return null;
    return normalize(name);
  } catch {
    return null;
  }
}

export const readGnsPrimaryName = (address: string) =>
  readPrimaryName(address, GNS_NAME_NFT_ADDRESS, ".gwei");
export const readWnsPrimaryName = (address: string) =>
  readPrimaryName(address, WNS_NAME_NFT_ADDRESS, ".wei");

export async function readGnsAvatar(name: string): Promise<string | null> {
  try {
    return await client.getEnsAvatar({
      name: normalize(name),
      universalResolverAddress: GNS_UNIVERSAL_RESOLVER_ADDRESS,
    });
  } catch {
    return null;
  }
}

export async function readWnsAvatar(name: string): Promise<string | null> {
  try {
    const record = await client.readContract({
      address: WNS_NAME_NFT_ADDRESS,
      abi: identityAbi,
      functionName: "text",
      args: [namehash(normalize(name)), "avatar"],
    });
    return record ? await parseAvatarRecord(client, { record }) : null;
  } catch {
    return null;
  }
}

/** The existing wallet identity reader, shared without importing the GNS UI helpers. */
export async function readGnsIdentity(
  address: Address
): Promise<GnsIdentity | null> {
  const name = await readGnsPrimaryName(address);
  return name ? { name, avatar: await readGnsAvatar(name) } : null;
}
