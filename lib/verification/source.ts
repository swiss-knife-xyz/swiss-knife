import { getAddress } from "viem";

import networks from "./networks.json";
import { isRetiredChain } from "../../data/retiredChains";
export type VerificationProvider =
  | "etherscan"
  | "blockscout"
  | "routescan"
  | "sourcify";
export type VerificationChain = string;
export type VerificationNetwork = {
  name: string;
  testnet: boolean;
  etherscan?: string;
  blockscout?: string;
  sourcify?: boolean;
  routescan?: boolean;
};
export const VERIFICATION_CHAINS: Record<string, VerificationNetwork> =
  Object.fromEntries(
    Object.entries(networks).filter(([id]) => !isRetiredChain(id))
  );
export const PROVIDERS: Record<VerificationProvider, string> = {
  etherscan: "Etherscan",
  blockscout: "Blockscout",
  routescan: "Routescan",
  sourcify: "Sourcify",
};
export function providersFor(chainId: string): VerificationProvider[] {
  const chain = VERIFICATION_CHAINS[chainId];
  return chain
    ? (Object.keys(PROVIDERS) as VerificationProvider[]).filter(
        (p) => !!chain[p]
      )
    : [];
}
export function explorerUrl(
  provider: VerificationProvider,
  chainId: string,
  address: string
) {
  const chain = VERIFICATION_CHAINS[chainId];
  if (!chain?.[provider]) throw new VerificationError("UNSUPPORTED_ROUTE");
  if (provider === "sourcify")
    return `https://repo.sourcify.dev/${chainId}/${address}`;
  if (provider === "routescan")
    return `https://${chain.testnet ? "testnet." : ""}routescan.io/address/${address}?chainid=${chainId}`;
  return `${chain[provider]}/address/${address}${provider === "blockscout" ? "?tab=contract" : "#code"}`;
}
/** Parse recognized explorer links locally; URLs never become server fetch targets. */
export function parseExplorerInput(
  value: string
):
  | { address: string; chainId: string; provider: VerificationProvider }
  | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return;
    for (const [chainId, chain] of Object.entries(VERIFICATION_CHAINS)) {
      for (const provider of ["etherscan", "blockscout"] as const) {
        if (
          !chain[provider] ||
          url.hostname !== new URL(chain[provider]!).hostname
        )
          continue;
        const match = url.pathname.match(/^\/address\/(0x[a-fA-F0-9]{40})\/?$/);
        if (match) return { ...verificationInput(chainId, match[1]), provider };
      }
    }
    if (url.hostname === "repo.sourcify.dev") {
      const match = url.pathname.match(/^\/(\d+)\/(0x[a-fA-F0-9]{40})\/?$/);
      if (match && providersFor(match[1]).includes("sourcify"))
        return {
          ...verificationInput(match[1], match[2]),
          provider: "sourcify",
        };
    }
    if (["routescan.io", "testnet.routescan.io"].includes(url.hostname)) {
      const match = url.pathname.match(/^\/address\/(0x[a-fA-F0-9]{40})\/?$/);
      const chainId =
        url.searchParams.get("chainid") ?? url.searchParams.get("chainId");
      if (
        match &&
        chainId &&
        providersFor(chainId).includes("routescan") &&
        VERIFICATION_CHAINS[chainId].testnet ===
          (url.hostname === "testnet.routescan.io")
      )
        return {
          ...verificationInput(chainId, match[1]),
          provider: "routescan",
        };
    }
  } catch {
    /* Plain addresses are validated separately. */
  }
}
export type VerificationState =
  | "ready"
  | "submitting"
  | "pending"
  | "verified"
  | "already_verified"
  | "failed"
  | "unknown";
export const VERIFICATION_MESSAGES = {
  INVALID_INPUT: "Select a network and enter a valid contract address.",
  UNSUPPORTED_SOURCE:
    "Complete Solidity source and compiler settings are unavailable from this provider.",
  UNSUPPORTED_ROUTE:
    "This provider does not support verification on this network.",
  CONTRACT_NOT_INDEXED: "The explorer has not indexed this contract yet.",
  SUBMISSION_REJECTED: "The explorer rejected the verification request.",
  SOURCE_MISMATCH: "The source does not match this deployment’s bytecode.",
  INVALID_CONSTRUCTOR: "Check the destination constructor arguments.",
  UNSUPPORTED_COMPILER: "This compiler is not supported by the destination.",
  SOURCE_CHANGED: "The source has changed. Import it again before verifying.",
  API_KEY_REQUIRED: "An API key is needed for this provider.",
  PROVIDER_REJECTED:
    "The provider rejected this request. Check the API key and its network access.",
  BROWSER_REQUEST_FAILED: "Could not reach this explorer from your browser.",
  UNAVAILABLE: "Could not reach the verification provider. Try again.",
  RATE_LIMITED: "Too many requests. Try again in a minute.",
  EXPIRED:
    "This review or status is no longer available. Check the destination explorer before importing again.",
  CONFIRM_REQUIRED: "Confirm publication before submitting.",
  NOT_CONFIGURED: "Submissions are not enabled on this server.",
  UNKNOWN_DELIVERY:
    "The submission response was lost. Check the destination explorer before submitting again.",
} as const;
export class VerificationError extends Error {
  constructor(public code: keyof typeof VERIFICATION_MESSAGES) {
    super(VERIFICATION_MESSAGES[code]);
  }
}
export function verificationInput(chain: unknown, address: unknown) {
  if (
    typeof chain !== "string" ||
    !Object.hasOwn(VERIFICATION_CHAINS, chain) ||
    typeof address !== "string" ||
    !/^0x[0-9a-fA-F]{40}$/.test(address)
  )
    throw new VerificationError("INVALID_INPUT");
  try {
    return {
      chainId: chain as VerificationChain,
      address: getAddress(address),
    };
  } catch {
    throw new VerificationError("INVALID_INPUT");
  }
}
export type ImportedSource = {
  creationTransactionHash?: string;
  implementationAddress?: string;
  contractName: string;
  compilerVersion: string;
  sourceCode: string;
  constructorArguments: string;
  licenseType: string;
  files: string[];
  partial: boolean;
};
export type VerificationTarget = {
  provider: VerificationProvider;
  state: VerificationState;
  destinationUrl: string;
  error?: keyof typeof VERIFICATION_MESSAGES;
};
export type VerificationReview = ImportedSource & {
  targetChainId?: string;
  targetAddress?: string;
  sourceProvider?: VerificationProvider;
  targets?: VerificationTarget[];
  id: string;
  chainId: VerificationChain;
  address: string;
  sourceUrl: string;
  destinationUrl: string;
  expiresAt: string;
};
export type VerificationStatus = {
  targets?: VerificationTarget[];
  id: string;
  state: VerificationState;
  destinationUrl: string;
};
const licenses = [
  "none",
  "unlicense",
  "mit",
  "gnu_gpl_v2",
  "gnu_gpl_v3",
  "gnu_lgpl_v2_1",
  "gnu_lgpl_v3",
  "bsd_2_clause",
  "bsd_3_clause",
  "mpl_2_0",
  "osl_3_0",
  "apache_2_0",
  "gnu_agpl_v3",
  "bsl_1_1",
];
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function unsupported(): never {
  throw new VerificationError("UNSUPPORTED_SOURCE");
}
/** No flattening, compiler guessing, implementation traversal or twin imports. */
export function importBlockscoutSource(raw: unknown): ImportedSource {
  if (
    !record(raw) ||
    raw.is_verified !== true ||
    raw.is_changed_bytecode === true ||
    raw.verified_twin_address_hash ||
    raw.language !== "solidity" ||
    raw.is_blueprint === true ||
    typeof raw.name !== "string" ||
    !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(raw.name) ||
    typeof raw.compiler_version !== "string" ||
    !/^v?0\.\d{1,2}\.\d{1,3}\+commit\.[a-f0-9]{8}$/.test(
      raw.compiler_version
    ) ||
    !record(raw.compiler_settings)
  )
    unsupported();
  const files = [
    { file_path: raw.file_path, source_code: raw.source_code },
    ...(Array.isArray(raw.additional_sources) ? raw.additional_sources : []),
  ];
  if (raw.additional_sources != null && !Array.isArray(raw.additional_sources))
    unsupported();
  if (files.length > 200) unsupported();
  const sources: Record<string, { content: string }> = Object.create(null);
  for (const file of files) {
    if (
      !record(file) ||
      typeof file.file_path !== "string" ||
      !file.file_path ||
      file.file_path.length > 512 ||
      /[\x00-\x1f:]/.test(file.file_path) ||
      Object.hasOwn(sources, file.file_path) ||
      typeof file.source_code !== "string" ||
      !file.source_code
    )
      unsupported();
    sources[file.file_path] = { content: file.source_code };
  }
  const settings = structuredClone(raw.compiler_settings);
  const target = settings.compilationTarget;
  if (
    target != null &&
    (!record(target) ||
      Object.keys(target).length !== 1 ||
      target[raw.file_path as string] !== raw.name)
  )
    unsupported();
  delete settings.compilationTarget; // Solidity metadata output, not a compiler-input setting.
  if (
    !record(settings.optimizer) ||
    typeof settings.optimizer.enabled !== "boolean"
  )
    unsupported();
  // Do not invent absent linked-library addresses or silently omit them.
  if (raw.external_libraries != null && !Array.isArray(raw.external_libraries))
    unsupported();
  if (Array.isArray(raw.external_libraries) && raw.external_libraries.length) {
    if (!record(settings.libraries)) unsupported();
    const libraries = Object.values(settings.libraries).flatMap((value) =>
      record(value) ? Object.entries(value) : []
    );
    for (const lib of raw.external_libraries) {
      if (
        !record(lib) ||
        typeof lib.name !== "string" ||
        typeof lib.address_hash !== "string" ||
        !libraries.some(
          ([name, address]) =>
            name === lib.name &&
            typeof address === "string" &&
            address.toLowerCase() === (lib.address_hash as string).toLowerCase()
        )
      )
        unsupported();
    }
  }
  const constructorArguments =
    raw.constructor_args == null ? "" : raw.constructor_args;
  if (
    typeof constructorArguments !== "string" ||
    !/^(?:0x)?(?:[a-fA-F0-9]{2})*$/.test(constructorArguments) ||
    constructorArguments.length > 131074
  )
    unsupported();
  const sourceCode = JSON.stringify({
    language: "Solidity",
    sources,
    settings,
  });
  if (new TextEncoder().encode(sourceCode).length > 1_000_000) unsupported();
  const license = licenses.indexOf(String(raw.license_type));
  if (license < 0) unsupported();
  return {
    contractName: `${raw.file_path}:${raw.name}`,
    compilerVersion: raw.compiler_version.startsWith("v")
      ? raw.compiler_version
      : `v${raw.compiler_version}`,
    constructorArguments: constructorArguments.replace(/^0x/, ""),
    sourceCode,
    licenseType: String(license + 1),
    files: Object.keys(sources),
    partial: raw.is_partially_verified === true,
    ...(Array.isArray(raw.implementations) &&
    raw.implementations.length === 1 &&
    typeof raw.implementations[0]?.address_hash === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(raw.implementations[0].address_hash)
      ? {
          implementationAddress: getAddress(
            raw.implementations[0].address_hash
          ),
        }
      : {}),
  };
}
