import type { Address, Hex } from "viem";
import { bytesToHex, isAddress, zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import { labelhash, namehash, normalize } from "viem/ens";
import * as contentHash from "content-hash";
import {
  readEnsAddressRecord,
  readEnsContenthashRecord,
  readEnsTextRecord,
} from "@/lib/ensUniversalResolver";
import { getPublicClient } from "@/lib/publicClient";

export const ENS_REGISTRY_ADDRESS =
  "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;

export const ENS_BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" as const;

export const GNS_NAME_NFT_ADDRESS =
  "0x9D51D507BC7264d4fE8Ad1cf7Fe191933A0a81d6" as const;

export const GNS_UNIVERSAL_RESOLVER_ADDRESS =
  "0xD658131FFB6D732335d37f199374289F1b31564F" as const;

export const GNS_MAINNET_CHAIN_ID = mainnet.id;
export const GNS_MIN_COMMITMENT_SECONDS = 60;
export const GNS_MAX_COMMITMENT_SECONDS = 86_400;
export const GNS_GRACE_PERIOD_SECONDS = 90 * 24 * 60 * 60;
export const GNS_MAX_SUBDOMAIN_DEPTH = 10;

export const gnsNameNftAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
  {
    type: "function",
    name: "isAvailable",
    stateMutability: "view",
    inputs: [
      { name: "label", type: "string" },
      { name: "parentId", type: "uint256" },
    ],
    outputs: [{ name: "available", type: "bool" }],
  },
  {
    type: "function",
    name: "getFee",
    stateMutability: "pure",
    inputs: [{ name: "length", type: "uint256" }],
    outputs: [{ name: "fee", type: "uint256" }],
  },
  {
    type: "function",
    name: "getPremium",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "premium", type: "uint256" }],
  },
  {
    type: "function",
    name: "makeCommitment",
    stateMutability: "pure",
    inputs: [
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "secret", type: "bytes32" },
    ],
    outputs: [{ name: "commitment", type: "bytes32" }],
  },
  {
    type: "function",
    name: "commit",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reveal",
    stateMutability: "payable",
    inputs: [
      { name: "label", type: "string" },
      { name: "secret", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "registerSubdomain",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "parentId", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "registerSubdomainFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "parentId", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "renew",
    stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "expiresAt",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "expiresAt", type: "uint256" }],
  },
  {
    type: "function",
    name: "inGracePeriod",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "inGracePeriod", type: "bool" }],
  },
  {
    type: "function",
    name: "isExpired",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "expired", type: "bool" }],
  },
  {
    type: "function",
    name: "contenthash",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "hash", type: "bytes" }],
  },
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "value", type: "string" }],
  },
  {
    type: "function",
    name: "setContenthash",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "hash", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPrimaryName",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "primaryName",
    stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "reverseResolve",
    stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "name", type: "string" }],
  },
  {
    type: "function",
    name: "records",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "label", type: "string" },
      { name: "parent", type: "uint256" },
      { name: "expiresAt", type: "uint64" },
      { name: "epoch", type: "uint64" },
      { name: "parentEpoch", type: "uint64" },
    ],
  },
] as const;

const ensRegistryAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

const ensBaseRegistrarAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

const mainnetClient = getPublicClient(mainnet.id);

export type ContenthashInfo = {
  raw: Hex;
  codec: string;
  decoded: string;
  uri: string;
  gatewayUrl?: string;
};

export type EnsNameSnapshot = {
  label: string;
  name: string;
  isSubdomain: boolean;
  owner: Address | null;
  isOwnerConnected: boolean;
  contenthash: ContenthashInfo | null;
  avatarText: string | null;
  avatarImage: string | null;
  primaryName: string | null;
  isPrimaryForConnectedAddress: boolean;
};

export type GnsNameStatus = "available" | "active" | "grace" | "blocked";

export type GnsNameSnapshot = {
  label: string;
  name: string;
  isSubdomain: boolean;
  registrationLabel: string;
  parentName: string | null;
  parentTokenId: bigint | null;
  parentOwner: Address | null;
  isParentOwnerConnected: boolean;
  parentIsActive: boolean | null;
  blockedReason: string | null;
  tokenId: bigint;
  status: GnsNameStatus;
  owner: Address | null;
  isOwnerConnected: boolean;
  expiresAt: bigint | null;
  graceEndsAt: bigint | null;
  wasFullyExpired: boolean;
  labelByteLength: number;
  fee: bigint;
  premium: bigint;
  totalRegistrationCost: bigint;
  contenthash: ContenthashInfo | null;
  avatarText: string | null;
  avatarImage: string | null;
  primaryName: string | null;
  isPrimaryForConnectedAddress: boolean;
};

export type GnsIdentity = {
  name: string;
  avatar: string | null;
};

export type StoredGnsCommitment = {
  label: string;
  owner: Address;
  secret: Hex;
  commitment: Hex;
  commitTxHash: Hex;
  committedAt: number;
  minRevealAt: number;
  expiresAt: number;
};

export function normalizeEnsLabel(input: string) {
  const value = input.trim().replace(/\.eth$/i, "");
  if (!value) throw new Error("Enter a name before .eth");

  const name = normalize(`${value}.eth`);
  const label = name.slice(0, -4);
  const labels = label.split(".");
  validateNameLabels(labels, ".eth");

  return {
    label,
    labels,
    name,
    isSubdomain: labels.length > 1,
    registrarLabel: labels[labels.length - 1],
  };
}

export function normalizeGnsLabel(input: string) {
  const value = input.trim().replace(/\.gwei$/i, "");
  if (!value) throw new Error("Enter a name before .gwei");

  const name = normalize(`${value}.gwei`);
  const label = name.slice(0, -5);
  const labels = label.split(".");
  validateNameLabels(labels, ".gwei");

  if (labels.length > GNS_MAX_SUBDOMAIN_DEPTH + 1) {
    throw new Error(".gwei names can have at most 10 subdomain levels");
  }

  for (const part of labels) {
    const labelBytes = new TextEncoder().encode(part);

    if (labelBytes.length > 255) {
      throw new Error(".gwei labels must be 255 bytes or shorter");
    }
    if (/[\u0000-\u0020\u007f.]/u.test(part)) {
      throw new Error(
        ".gwei labels cannot contain spaces, dots, or control characters"
      );
    }
    if (part.startsWith("-") || part.endsWith("-")) {
      throw new Error(".gwei labels cannot start or end with a hyphen");
    }
  }

  const parentLabel = labels.length > 1 ? labels.slice(1).join(".") : null;

  return {
    label,
    labels,
    name,
    isSubdomain: labels.length > 1,
    registrationLabel: labels[0],
    parentLabel,
    parentName: parentLabel ? `${parentLabel}.gwei` : null,
    parentTokenId: parentLabel ? getGnsTokenId(parentLabel) : null,
  };
}

export function getGnsTokenId(label: string) {
  const value = label.trim().replace(/\.gwei$/i, "");
  return BigInt(namehash(`${value}.gwei`));
}

export function getGnsGatewayUrl(label: string) {
  return `https://${label}.gwei.domains`;
}

export function getGnsIdentityQueryKey(address: Address | string) {
  return ["gns", "identity", address.toLowerCase()] as const;
}

export async function readGnsIdentity(
  address: Address
): Promise<GnsIdentity | null> {
  if (!isAddress(address)) return null;

  const name = await mainnetClient.readContract({
    address: GNS_NAME_NFT_ADDRESS,
    abi: gnsNameNftAbi,
    functionName: "reverseResolve",
    args: [address],
  });

  if (!name || !name.toLowerCase().endsWith(".gwei")) return null;

  const avatar = await nullable(
    mainnetClient.getEnsAvatar({
      name,
      universalResolverAddress: GNS_UNIVERSAL_RESOLVER_ADDRESS,
    }),
    null
  );

  return { name, avatar };
}

export function getEnsGatewayUrl(name: string) {
  return `https://${name}.link`;
}

export function createGnsCommitmentStorageKey(
  label: string,
  owner: Address | undefined
) {
  return owner ? `gns-commitment:${owner.toLowerCase()}:${label}` : null;
}

export function createRandomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function shortenMiddle(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function describeContenthash(raw: Hex | null | undefined) {
  if (!raw || raw === "0x") return null;

  try {
    const codec = contentHash.getCodec(raw);
    const decoded = contentHash.decode(raw);
    const protocol =
      codec === "ipfs-ns" ? "ipfs" : codec === "ipns-ns" ? "ipns" : codec;
    const uri = `${protocol}://${decoded}`;
    const gatewayUrl =
      codec === "ipfs-ns"
        ? `https://${decoded}.ipfs.inbrowser.link`
        : codec === "ipns-ns"
          ? `https://${decoded}.ipns.dweb.link`
          : undefined;

    return {
      raw,
      codec,
      decoded,
      uri,
      gatewayUrl,
    } satisfies ContenthashInfo;
  } catch {
    return {
      raw,
      codec: "unknown",
      decoded: raw,
      uri: raw,
    } satisfies ContenthashInfo;
  }
}

export async function readEnsSnapshot(
  input: string,
  connectedAddress?: Address
): Promise<EnsNameSnapshot> {
  const { label, name, isSubdomain, registrarLabel } = normalizeEnsLabel(input);
  const tokenId = BigInt(labelhash(registrarLabel));

  const baseOwnerPromise = isSubdomain
    ? Promise.resolve(null)
    : nullable(
        mainnetClient.readContract({
          address: ENS_BASE_REGISTRAR_ADDRESS,
          abi: ensBaseRegistrarAbi,
          functionName: "ownerOf",
          args: [tokenId],
        }),
        null
      );
  const registryOwnerPromise = nullable(
    mainnetClient.readContract({
      address: ENS_REGISTRY_ADDRESS,
      abi: ensRegistryAbi,
      functionName: "owner",
      args: [namehash(name)],
    }),
    null
  );
  const resolvedAddressPromise = nullable(readEnsAddressRecord(name), null);
  const contenthashPromise = nullable(readEnsContenthashRecord(name), null);
  const avatarTextPromise = nullable(readEnsTextRecord(name, "avatar"), null);
  const avatarImagePromise = isSubdomain
    ? Promise.resolve(null)
    : nullable(mainnetClient.getEnsAvatar({ name }), null);
  const primaryNamePromise =
    connectedAddress && isAddress(connectedAddress)
      ? nullable(mainnetClient.getEnsName({ address: connectedAddress }), null)
      : Promise.resolve(null);

  const [
    baseOwner,
    registryOwner,
    resolvedAddress,
    rawContenthash,
    avatarText,
    avatarImage,
    primaryName,
  ] = await Promise.all([
    baseOwnerPromise,
    registryOwnerPromise,
    resolvedAddressPromise,
    contenthashPromise,
    avatarTextPromise,
    avatarImagePromise,
    primaryNamePromise,
  ]);
  const owner =
    normalizeAddress(baseOwner) ||
    normalizeAddress(registryOwner) ||
    normalizeAddress(resolvedAddress);
  const normalizedAvatarText = avatarText || null;
  const normalizedAvatarImage = avatarImage || avatarText || null;

  return {
    label,
    name,
    isSubdomain,
    owner,
    isOwnerConnected:
      !!connectedAddress &&
      !!owner &&
      connectedAddress.toLowerCase() === owner.toLowerCase(),
    contenthash: describeContenthash(rawContenthash),
    avatarText: normalizedAvatarText,
    avatarImage: normalizedAvatarImage,
    primaryName,
    isPrimaryForConnectedAddress: namesEqual(primaryName, name),
  };
}

export async function readGnsSnapshot(
  input: string,
  connectedAddress?: Address
): Promise<GnsNameSnapshot> {
  const {
    label,
    labels,
    name,
    isSubdomain,
    registrationLabel,
    parentName,
    parentTokenId,
  } = normalizeGnsLabel(input);
  const tokenId = getGnsTokenId(label);
  const labelByteLength = new TextEncoder().encode(registrationLabel).length;
  const ancestorTokenIds = getGnsAncestorLabels(labels).map(getGnsTokenId);
  const recordTokenIds = uniqueBigints([tokenId, ...ancestorTokenIds]);
  const recordsPromise = Promise.all(
    recordTokenIds.map(async (recordTokenId) => {
      const record = await readGnsRecord(recordTokenId);
      return [recordTokenId, record] as const;
    })
  );

  const [
    block,
    isAvailable,
    fee,
    premium,
    owner,
    expiresAt,
    inGracePeriod,
    wasFullyExpired,
    rawContenthash,
    avatarText,
    avatarImage,
    primaryName,
    parentOwner,
    recordEntries,
  ] = await Promise.all([
    mainnetClient.getBlock(),
    nullable(
      mainnetClient.readContract({
        address: GNS_NAME_NFT_ADDRESS,
        abi: gnsNameNftAbi,
        functionName: "isAvailable",
        args: [registrationLabel, parentTokenId || 0n],
      }),
      false
    ),
    isSubdomain
      ? Promise.resolve(0n)
      : nullable(
          mainnetClient.readContract({
            address: GNS_NAME_NFT_ADDRESS,
            abi: gnsNameNftAbi,
            functionName: "getFee",
            args: [BigInt(labelByteLength)],
          }),
          0n
        ),
    isSubdomain
      ? Promise.resolve(0n)
      : nullable(
          mainnetClient.readContract({
            address: GNS_NAME_NFT_ADDRESS,
            abi: gnsNameNftAbi,
            functionName: "getPremium",
            args: [tokenId],
          }),
          0n
        ),
    nullable(
      mainnetClient.readContract({
        address: GNS_NAME_NFT_ADDRESS,
        abi: gnsNameNftAbi,
        functionName: "ownerOf",
        args: [tokenId],
      }),
      null
    ),
    nullable(
      mainnetClient.readContract({
        address: GNS_NAME_NFT_ADDRESS,
        abi: gnsNameNftAbi,
        functionName: "expiresAt",
        args: [tokenId],
      }),
      0n
    ),
    nullable(
      mainnetClient.readContract({
        address: GNS_NAME_NFT_ADDRESS,
        abi: gnsNameNftAbi,
        functionName: "inGracePeriod",
        args: [tokenId],
      }),
      false
    ),
    nullable(
      mainnetClient.readContract({
        address: GNS_NAME_NFT_ADDRESS,
        abi: gnsNameNftAbi,
        functionName: "isExpired",
        args: [tokenId],
      }),
      false
    ),
    nullable(
      mainnetClient.readContract({
        address: GNS_NAME_NFT_ADDRESS,
        abi: gnsNameNftAbi,
        functionName: "contenthash",
        args: [tokenId],
      }),
      "0x" as Hex
    ),
    nullable(
      mainnetClient.readContract({
        address: GNS_NAME_NFT_ADDRESS,
        abi: gnsNameNftAbi,
        functionName: "text",
        args: [tokenId, "avatar"],
      }),
      ""
    ),
    nullable(
      mainnetClient.getEnsAvatar({
        name,
        universalResolverAddress: GNS_UNIVERSAL_RESOLVER_ADDRESS,
      }),
      null
    ),
    connectedAddress && isAddress(connectedAddress)
      ? nullable(
          mainnetClient.readContract({
            address: GNS_NAME_NFT_ADDRESS,
            abi: gnsNameNftAbi,
            functionName: "reverseResolve",
            args: [connectedAddress],
          }),
          ""
        )
      : Promise.resolve(""),
    parentTokenId
      ? nullable(
          mainnetClient.readContract({
            address: GNS_NAME_NFT_ADDRESS,
            abi: gnsNameNftAbi,
            functionName: "ownerOf",
            args: [parentTokenId],
          }),
          null
        )
      : Promise.resolve(null),
    recordsPromise,
  ]);

  const now = block.timestamp;
  const recordMap = new Map(
    recordEntries.map(([recordTokenId, record]) => [
      recordTokenId.toString(),
      record,
    ])
  );
  const currentIsActive = isGnsRecordActive(tokenId, recordMap, now);
  const parentIsActive = parentTokenId
    ? isGnsRecordActive(parentTokenId, recordMap, now)
    : null;
  const status: GnsNameStatus = isAvailable
    ? "available"
    : !isSubdomain && (inGracePeriod || (expiresAt > 0n && expiresAt <= now))
      ? "grace"
      : currentIsActive
        ? "active"
        : "blocked";

  const normalizedPrimaryName = primaryName || null;
  const normalizedOwner = normalizeAddress(owner);
  const normalizedParentOwner = normalizeAddress(parentOwner);
  const graceEndsAt =
    expiresAt > 0n ? expiresAt + BigInt(GNS_GRACE_PERIOD_SECONDS) : null;

  return {
    label,
    name,
    isSubdomain,
    registrationLabel,
    parentName,
    parentTokenId,
    parentOwner: normalizedParentOwner,
    isParentOwnerConnected:
      !!connectedAddress &&
      !!normalizedParentOwner &&
      connectedAddress.toLowerCase() === normalizedParentOwner.toLowerCase(),
    parentIsActive,
    blockedReason: getGnsBlockedReason({
      isSubdomain,
      parentName,
      parentTokenId,
      parentIsActive,
      status,
    }),
    tokenId,
    status,
    owner: normalizedOwner,
    isOwnerConnected:
      !!connectedAddress &&
      !!normalizedOwner &&
      connectedAddress.toLowerCase() === normalizedOwner.toLowerCase(),
    expiresAt: expiresAt > 0n ? expiresAt : null,
    graceEndsAt,
    wasFullyExpired,
    labelByteLength,
    fee,
    premium,
    totalRegistrationCost: fee + premium,
    contenthash:
      status === "active" ? describeContenthash(rawContenthash) : null,
    avatarText: status === "active" && avatarText ? avatarText : null,
    avatarImage: status === "active" ? avatarImage || null : null,
    primaryName: normalizedPrimaryName,
    isPrimaryForConnectedAddress: namesEqual(normalizedPrimaryName, name),
  };
}

export async function makeGnsCommitment(
  label: string,
  owner: Address,
  secret: Hex
) {
  return mainnetClient.readContract({
    address: GNS_NAME_NFT_ADDRESS,
    abi: gnsNameNftAbi,
    functionName: "makeCommitment",
    args: [label, owner, secret],
  });
}

type GnsRecord = {
  label: string;
  parent: bigint;
  expiresAt: bigint;
  epoch: bigint;
  parentEpoch: bigint;
  exists: boolean;
};

async function readGnsRecord(tokenId: bigint): Promise<GnsRecord> {
  const record = await nullable(
    mainnetClient.readContract({
      address: GNS_NAME_NFT_ADDRESS,
      abi: gnsNameNftAbi,
      functionName: "records",
      args: [tokenId],
    }),
    null
  );

  if (!record) {
    return createEmptyGnsRecord();
  }

  const [label, parent, expiresAt, epoch, parentEpoch] = record;

  return {
    label,
    parent,
    expiresAt,
    epoch,
    parentEpoch,
    exists: label.length > 0,
  };
}

function namesEqual(left: string | null | undefined, right: string) {
  if (!left) return false;
  try {
    return normalize(left) === normalize(right);
  } catch {
    return left.toLowerCase() === right.toLowerCase();
  }
}

function validateNameLabels(labels: string[], suffix: ".eth" | ".gwei") {
  if (labels.some((part) => !part)) {
    throw new Error(`Enter a valid ${suffix} name`);
  }
}

function getGnsAncestorLabels(labels: string[]) {
  const ancestors: string[] = [];

  for (let index = 1; index < labels.length; index++) {
    ancestors.push(labels.slice(index).join("."));
  }

  return ancestors;
}

function uniqueBigints(values: bigint[]) {
  return Array.from(new Set(values.map((value) => value.toString()))).map(
    BigInt
  );
}

function createEmptyGnsRecord(): GnsRecord {
  return {
    label: "",
    parent: 0n,
    expiresAt: 0n,
    epoch: 0n,
    parentEpoch: 0n,
    exists: false,
  };
}

function isGnsRecordActive(
  tokenId: bigint,
  recordMap: Map<string, GnsRecord>,
  now: bigint,
  seen = new Set<string>()
): boolean {
  const key = tokenId.toString();
  if (seen.has(key)) return false;
  seen.add(key);

  const record = recordMap.get(key);
  if (!record?.exists) return false;

  if (record.parent === 0n) {
    return record.expiresAt > now;
  }

  const parent = recordMap.get(record.parent.toString());
  if (!parent?.exists || record.parentEpoch !== parent.epoch) return false;

  return isGnsRecordActive(record.parent, recordMap, now, seen);
}

function getGnsBlockedReason({
  isSubdomain,
  parentName,
  parentTokenId,
  parentIsActive,
  status,
}: {
  isSubdomain: boolean;
  parentName: string | null;
  parentTokenId: bigint | null;
  parentIsActive: boolean | null;
  status: GnsNameStatus;
}) {
  if (status !== "blocked") return null;
  if (!isSubdomain) return "This .gwei name is not active.";
  if (!parentTokenId || !parentName) {
    return "A valid parent .gwei name is required before this subdomain can be registered.";
  }
  if (!parentIsActive) {
    return `Parent ${parentName} must be registered and active before this subdomain can be registered.`;
  }
  return "This .gwei subdomain cannot be registered right now.";
}

function normalizeAddress(value: Address | null | undefined) {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase() === zeroAddress ? null : value;
}

async function nullable<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
