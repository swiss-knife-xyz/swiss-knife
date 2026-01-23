import {
  createPublicClient,
  http,
  Hex,
  Address,
  encodePacked,
  keccak256,
  namehash,
} from "viem";
import { mainnet, base } from "viem/chains";
import { normalize } from "viem/ens";
import { L2ResolverAbi } from "./abis/L2ResolverAbi";

// ============================================================================
// Constants
// ============================================================================

export const BASENAME_L2_RESOLVER_ADDRESS =
  "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as const;

export const BASE_CHAIN_ID = 8453;

// ============================================================================
// Public Clients
// ============================================================================

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
});

export const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
});

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
  return value.includes(".") && !value.toLowerCase().startsWith("0x");
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
 * Resolve a name (ENS or Basename) to an address
 * Uses mainnet ENS with CCIP-read which handles .base.eth automatically
 */
export const resolveNameToAddress = async (
  name: string
): Promise<Address | null> => {
  try {
    const address = await mainnetClient.getEnsAddress({
      name: normalize(name),
    });
    return address;
  } catch (error) {
    console.error("Error resolving name to address:", error);
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
 * Resolve an address to a name, checking both ENS and Basename
 * Returns the first name found (ENS takes priority, then Basename)
 */
export const resolveAddressToName = async (
  address: string
): Promise<string | null> => {
  try {
    // Try both in parallel for speed
    const [ensName, basename] = await Promise.all([
      getEnsName(address),
      getBasename(address as Address),
    ]);

    // Return ENS name if found, otherwise basename
    return ensName || basename || null;
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
