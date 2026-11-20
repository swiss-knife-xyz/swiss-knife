import { getAddress } from "viem";

/** Fixed, paired source/destination chains. Never accept an explorer URL. */
export const VERIFICATION_CHAINS = {
  "1": {
    name: "Ethereum",
    blockscout: "https://eth.blockscout.com",
    etherscan: "https://etherscan.io",
  },
  "10": {
    name: "Optimism",
    blockscout: "https://optimism.blockscout.com",
    etherscan: "https://optimistic.etherscan.io",
  },
  "8453": {
    name: "Base",
    blockscout: "https://base.blockscout.com",
    etherscan: "https://basescan.org",
  },
  "42161": {
    name: "Arbitrum One",
    blockscout: "https://arbitrum.blockscout.com",
    etherscan: "https://arbiscan.io",
  },
  "137": {
    name: "Polygon",
    blockscout: "https://polygon.blockscout.com",
    etherscan: "https://polygonscan.com",
  },
} as const;
export type VerificationChain = keyof typeof VERIFICATION_CHAINS;
export type VerificationState =
  | "ready"
  | "submitting"
  | "pending"
  | "verified"
  | "already_verified"
  | "failed"
  | "unknown";
export const VERIFICATION_MESSAGES = {
  INVALID_INPUT:
    "Choose a supported chain and a valid contract address. Extra fields are not accepted.",
  UNSUPPORTED_SOURCE:
    "Blockscout did not return complete supported Solidity source and compiler settings for this address. No source was submitted.",
  UNAVAILABLE:
    "The verification provider is unavailable. No upstream details are exposed.",
  RATE_LIMITED:
    "Verification is busy or rate-limited. Wait a minute before trying again.",
  EXPIRED:
    "This review or status handle expired or belongs to another server instance. Check the destination explorer before importing again.",
  CONFIRM_REQUIRED:
    "Review the imported source and explicitly confirm publication to Etherscan.",
  NOT_CONFIGURED:
    "Verification submission is not configured on this server. No source was submitted.",
  UNKNOWN_DELIVERY:
    "Submission delivery is uncertain. Do not automatically resubmit. Check status and the destination explorer first.",
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
  contractName: string;
  compilerVersion: string;
  sourceCode: string;
  constructorArguments: string;
  licenseType: string;
  files: string[];
  partial: boolean;
};
export type VerificationReview = ImportedSource & {
  id: string;
  chainId: VerificationChain;
  address: string;
  sourceUrl: string;
  destinationUrl: string;
  expiresAt: string;
};
export type VerificationStatus = {
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
    !/^v0\.\d{1,2}\.\d{1,3}\+commit\.[a-f0-9]{8}$/.test(raw.compiler_version) ||
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
    compilerVersion: raw.compiler_version,
    constructorArguments: constructorArguments.replace(/^0x/, ""),
    sourceCode,
    licenseType: String(license + 1),
    files: Object.keys(sources),
    partial: raw.is_partially_verified === true,
  };
}
