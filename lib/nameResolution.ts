import {
  Hex,
  Address,
  encodePacked,
  keccak256,
  namehash,
  parseAbi,
  zeroAddress,
} from "viem";
import { mainnet, base } from "viem/chains";
import { normalize } from "viem/ens";
import { L2ResolverAbi } from "./abis/L2ResolverAbi";
import { getPublicClient } from "./publicClient";
import {
  GNS_UNIVERSAL_RESOLVER_ADDRESS,
  WNS_NAME_NFT_ADDRESS,
} from "./nameServiceContracts";

import {
  readGnsPrimaryName,
  readWnsPrimaryName,
  readGnsAvatar,
  readWnsAvatar,
} from "./nameServiceIdentity";

const wnsAddressAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
]);

// ============================================================================
// Constants
// ============================================================================

export const BASENAME_L2_RESOLVER_ADDRESS =
  "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as const;

export const BASE_CHAIN_ID = 8453;

// ============================================================================
// Public Clients
// ============================================================================

export const mainnetClient = getPublicClient(mainnet.id);

export const baseClient = getPublicClient(base.id);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string looks like a resolvable name (ENS, Basename, etc.)
 * Returns true for strings containing a dot that aren't addresses
 */
export const isResolvableName = (value: string): boolean => {
  if (!value || value.length === 0) return false;
  // Must contain a dot and not start with 0x (address)
  if (!value.includes(".") || value.toLowerCase().startsWith("0x"))
    return false;
  // Ensure no empty labels (leading/trailing dots, consecutive dots)
  const labels = value.split(".");
  return labels.every((label) => label.length > 0);
};

/**
 * Check if a name is specifically a Basename (.base.eth)
 */
export const isBasename = (name: string): boolean => {
  return name.toLowerCase().endsWith(".base.eth");
};

/**
 * Convert a chainId to a coinType hex for reverse chain resolution
 */
export const convertChainIdToCoinType = (chainId: number): string => {
  // L1 resolvers to addr
  if (chainId === mainnet.id) {
    return "addr";
  }

  const cointype = (0x80000000 | chainId) >>> 0;
  return cointype.toString(16).toLocaleUpperCase();
};

/**
 * Convert an address to a reverse node for ENS resolution on L2
 */
export const convertReverseNodeToBytes = (
  address: Address,
  chainId: number
): Hex => {
  const addressFormatted = address.toLocaleLowerCase() as Address;
  const addressNode = keccak256(addressFormatted.substring(2) as Address);
  const chainCoinType = convertChainIdToCoinType(chainId);
  const baseReverseNode = namehash(
    `${chainCoinType.toLocaleUpperCase()}.reverse`
  );
  const addressReverseNode = keccak256(
    encodePacked(["bytes32", "bytes32"], [baseReverseNode, addressNode])
  );
  return addressReverseNode;
};

// ============================================================================
// Forward Resolution (Name -> Address)
// ============================================================================

/**
 * Resolve ENS (including CCIP-read subdomains), GNS and WNS on mainnet.
 */
export const resolveNameToAddress = async (
  name: string
): Promise<Address | null> => {
  try {
    const normalizedName = normalize(name.trim());
    const address = normalizedName.endsWith(".wei")
      ? await mainnetClient.readContract({
          address: WNS_NAME_NFT_ADDRESS,
          abi: wnsAddressAbi,
          functionName: "addr",
          args: [namehash(normalizedName)],
        })
      : await mainnetClient.getEnsAddress({
          name: normalizedName,
          ...(normalizedName.endsWith(".gwei")
            ? { universalResolverAddress: GNS_UNIVERSAL_RESOLVER_ADDRESS }
            : {}),
        });
    return address && address !== zeroAddress ? address : null;
  } catch {
    return null;
  }
};

/**
 * Legacy function name for backward compatibility
 */
export const getEnsAddress = resolveNameToAddress;

// ============================================================================
// Reverse Resolution (Address -> Name)
// ============================================================================

/**
 * Get Basename for an address by querying the Base L2 resolver
 */
export const getBasename = async (address: Address): Promise<string | null> => {
  try {
    const addressReverseNode = convertReverseNodeToBytes(address, base.id);
    const basename = await baseClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: "name",
      args: [addressReverseNode],
    });

    if (basename && basename.length > 0) {
      return basename as string;
    }
    return null;
  } catch (error) {
    // Silently fail - address might not have a basename
    return null;
  }
};

/**
 * Get ENS name for an address from mainnet
 */
export const getEnsName = async (address: string): Promise<string | null> => {
  try {
    const name = await mainnetClient.getEnsName({
      address: address as Hex,
    });
    return name;
  } catch (error) {
    // Silently fail - address might not have an ENS name
    return null;
  }
};

/**
 * Resolve an address to a primary name across ENS, GNS, WNS and Basenames.
 * Preserve ENS priority; independent registry lookups run in parallel.
 */
export const resolveAddressToName = async (
  address: string
): Promise<string | null> => {
  try {
    // Start independent registries together, but don't wait for lower-priority
    // services after the preferred primary name has already resolved.
    const gnsName = readGnsPrimaryName(address);
    const wnsName = readWnsPrimaryName(address);
    const basename = getBasename(address as Address);
    return (
      (await getEnsName(address)) ||
      (await gnsName) ||
      (await wnsName) ||
      (await basename) ||
      null
    );
  } catch (error) {
    console.error("Error resolving address to name:", error);
    return null;
  }
};

// ============================================================================
// Avatar Resolution
// ============================================================================

/**
 * Get avatar for an ENS name
 */
export const getEnsAvatar = async (ensName: string): Promise<string | null> => {
  try {
    const avatar = await mainnetClient.getEnsAvatar({
      name: normalize(ensName),
    });
    return avatar;
  } catch (error) {
    console.error("Error fetching ENS avatar:", error);
    return null;
  }
};

/**
 * Get avatar for a Basename
 * Uses the Base L2 resolver to fetch the avatar text record
 */
export const getBasenameAvatar = async (
  basename: string
): Promise<string | null> => {
  try {
    const avatar = await baseClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: "text",
      args: [namehash(basename), "avatar"],
    });

    if (avatar && avatar.length > 0) {
      return avatar as string;
    }
    return null;
  } catch (error) {
    // Silently fail
    return null;
  }
};

/**
 * Get avatar for any name (ENS or Basename)
 * Automatically detects the name type and uses appropriate resolver
 */
export const getNameAvatar = async (name: string): Promise<string | null> => {
  if (name.toLowerCase().endsWith(".gwei")) return readGnsAvatar(name);
  if (name.toLowerCase().endsWith(".wei")) return readWnsAvatar(name);
  if (isBasename(name)) {
    // Try basename avatar first, fall back to ENS avatar
    const basenameAvatar = await getBasenameAvatar(name);
    if (basenameAvatar) return basenameAvatar;
    // Also try ENS in case they set an avatar there
    return await getEnsAvatar(name);
  }
  return await getEnsAvatar(name);
};

// ============================================================================
// Text Records
// ============================================================================

export enum BasenameTextRecordKeys {
  Description = "description",
  Keywords = "keywords",
  Url = "url",
  Email = "email",
  Phone = "phone",
  Github = "com.github",
  Twitter = "com.twitter",
  Farcaster = "xyz.farcaster",
  Lens = "xyz.lens",
  Telegram = "org.telegram",
  Discord = "com.discord",
  Avatar = "avatar",
}

/**
 * Get a text record for a Basename
 */
export const getBasenameTextRecord = async (
  basename: string,
  key: BasenameTextRecordKeys | string
): Promise<string | null> => {
  try {
    const textRecord = await baseClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: "text",
      args: [namehash(basename), key],
    });

    if (textRecord && textRecord.length > 0) {
      return textRecord as string;
    }
    return null;
  } catch (error) {
    return null;
  }
};
