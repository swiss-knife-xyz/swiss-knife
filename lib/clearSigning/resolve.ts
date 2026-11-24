import { erc20Abi, isAddress, zeroAddress, type Address, type Hex } from "viem";
import { getDelegatedImplementation } from "@/lib/eip7702";
import { getPublicClient } from "@/lib/publicClient";
import { chainIdToChain } from "@/data/networks";
import {
  applyFormat,
  resolveIntentText,
  runtimeTokenMetadataKey,
  type RenderedField,
  type TokenMetadataHint,
} from "./applyFormat";
import { getBuiltinCalldataDescriptor } from "./builtinDescriptors";
import { decodeCalldataForDescriptor } from "./decodeForDescriptor";
import {
  matchCalldataFormat,
  verifyDescriptorContext,
} from "./matchDescriptor";
import type { Erc7730Descriptor } from "./types";

export interface ClearSigningRequest {
  calldata: string;
  chainId?: number;
  to?: string;
  from?: string;
  value?: string;
  /** Form preview only: disclose an unknown sender without guessing an address. */
  allowMissingSender?: boolean;
}
export interface ClearSigningResult {
  intent: string;
  fields: RenderedField[];
  owner?: string;
  source: "registry" | "builtin";
  sourcePath?: string;
}

// Selector-bound, same-origin registry lookup. Cache public descriptors only;
// implementation reads and token metadata still use the selected chain's RPC.
const descriptors = new Map<
  string,
  {
    expires: number;
    promise: Promise<{
      descriptor: Erc7730Descriptor;
      sourcePath?: string;
    } | null>;
  }
>();
export async function fetchDescriptor(
  chainId: number,
  address: string,
  selector: string
) {
  const query = new URLSearchParams({
    chainId: String(chainId),
    address: address.toLowerCase(),
    selector,
    kind: "calldata",
  });
  const key = query.toString();
  const cached = descriptors.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = (async () => {
    try {
      const response = await fetch(`/api/clearsigning/descriptor?${query}`, {
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        if (response.status !== 404) descriptors.delete(key);
        return null;
      }
      return (await response.json()) as {
        descriptor: Erc7730Descriptor;
        sourcePath?: string;
      };
    } catch {
      descriptors.delete(key);
      return null;
    }
  })();
  if (descriptors.size >= 256)
    descriptors.delete(descriptors.keys().next().value!);
  descriptors.set(key, { expires: Date.now() + 3600_000, promise });
  return promise;
}

const implementationSlot =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const beaconSlot =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
const safeSlot = `0x${"0".repeat(64)}` as Hex;
function slotAddress(value?: Hex): Address | null {
  if (!value || !/^0x[\da-f]{64}$/i.test(value) || !/^0x0{24}/i.test(value))
    return null;
  const address = `0x${value.slice(-40)}` as Address;
  return address === zeroAddress ? null : address;
}

// Ported from WalletChan's proxy fallback; use this repo's client factory.
// Safe singleton() is checked rather than guessing from an arbitrary slot 0.
export async function resolveImplementation(
  chainId: number,
  address: Address
): Promise<Address | null> {
  try {
    const client = getPublicClient(chainId, { timeout: 4000 });
    const [logic, beacon, safe, code] = await Promise.all([
      client
        .getStorageAt({ address, slot: implementationSlot })
        .catch(() => undefined),
      client.getStorageAt({ address, slot: beaconSlot }).catch(() => undefined),
      client.getStorageAt({ address, slot: safeSlot }).catch(() => undefined),
      client.getCode({ address }).catch(() => undefined),
    ]);
    const delegated = getDelegatedImplementation(code);
    if (delegated) return delegated;
    const direct = slotAddress(logic);
    if (direct) return direct;
    const beaconAddress = slotAddress(beacon);
    if (beaconAddress) {
      return await client.readContract({
        address: beaconAddress,
        abi: [
          {
            type: "function",
            name: "implementation",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "address" }],
          },
        ],
        functionName: "implementation",
      });
    }
    const singleton = slotAddress(safe);
    if (singleton) {
      const result = await client.call({ to: address, data: "0xa619486e" });
      if (slotAddress(result.data) === singleton) return singleton;
    }
  } catch {
    /* Metadata is optional; retain the normal decoder. */
  }
  return null;
}

export function renderDescriptor(
  request: ClearSigningRequest,
  descriptor: Erc7730Descriptor,
  source: ClearSigningResult["source"],
  sourcePath?: string,
  tokenMetadata?: Record<string, TokenMetadataHint>
): ClearSigningResult | null {
  try {
    const chainId = request.chainId ?? 1;
    if (
      request.to &&
      !verifyDescriptorContext(descriptor, "calldata", chainId, request.to)
    )
      return null;
    const matched = matchCalldataFormat(descriptor, request.calldata);
    if (!matched) return null;
    const data = decodeCalldataForDescriptor(
      matched.formatKey,
      request.calldata
    );
    if (!data) return null;
    // A disconnected transaction form knows the call but not its sender. Allow
    // only ordinary sender display rows to be omitted, then disclose that gap.
    // Explicit required paths and hidden assertions still run unchanged.
    const unknownSenderFields =
      request.allowMissingSender && !request.from
        ? (matched.format.fields ?? []).filter(
            (field) =>
              field.path === "@.from" &&
              field.format === "addressName" &&
              (field.visible === undefined || field.visible === "always")
          )
        : [];
    const format = unknownSenderFields.length
      ? {
          ...matched.format,
          fields: matched.format.fields?.map((field) =>
            unknownSenderFields.includes(field)
              ? { ...field, visible: "optional" as const }
              : field
          ),
        }
      : matched.format;
    const input = {
      data,
      chainId,
      nativeCurrency: request.chainId
        ? chainIdToChain[chainId]?.nativeCurrency
        : undefined,
      tokenMetadata,
      envelope: {
        to: request.to,
        from: request.from,
        value: request.value,
        chainId: request.chainId,
      },
    };
    const fields = applyFormat(format, input, descriptor);
    if (!fields.length) return null;
    const validateAmounts = (items: RenderedField[]) => {
      for (const field of items) {
        for (const value of field.values) {
          if (value.kind === "amount" || value.kind === "tokenAmount") {
            BigInt(value.amountRaw);
            if (
              value.kind === "tokenAmount" &&
              value.thresholdRaw !== undefined
            )
              BigInt(value.thresholdRaw);
          }
        }
        field.groups?.forEach(validateAmounts);
      }
    };
    validateAmounts(fields);
    for (const field of unknownSenderFields) {
      fields.splice(
        Math.min(matched.format.fields!.indexOf(field), fields.length),
        0,
        {
          label: field.label || "Sender",
          visible: true,
          values: [{ kind: "raw", text: "Connect wallet to set sender" }],
        }
      );
    }
    // The formatter needs a numeric fallback internally; bare calldata must
    // not turn that into an assumed mainnet context for nested calls.
    if (!request.chainId) {
      const clearChain = (items: RenderedField[]) => {
        for (const field of items) {
          field.values = field.values.map((value) => {
            if ("chainId" in value && value.kind !== "chainId")
              delete value.chainId;
            if (value.kind === "amount")
              return { kind: "raw", text: `${value.amountRaw} base units` };
            return value;
          });
          field.groups?.forEach(clearChain);
        }
      };
      clearChain(fields);
    }
    return {
      fields,
      intent: resolveIntentText(format, input, descriptor) || "Contract call",
      owner: descriptor.metadata?.owner,
      source,
      sourcePath,
    };
  } catch {
    return null;
  }
}

export async function readTokenMetadata(
  chainId: number,
  address: string
): Promise<TokenMetadataHint | null> {
  try {
    const client = getPublicClient(chainId, { timeout: 4000 });
    const [symbol, decimals] = await Promise.all([
      client.readContract({
        address: address as Address,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      client.readContract({
        address: address as Address,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);
    return symbol &&
      Number.isInteger(decimals) &&
      decimals >= 0 &&
      decimals <= 255
      ? { symbol, decimals }
      : null;
  } catch {
    return null;
  }
}

export async function resolveClearSigning(
  request: ClearSigningRequest
): Promise<ClearSigningResult | null> {
  if (!/^0x[\da-f]{8}(?:[\da-f]{2})*$/i.test(request.calldata)) return null;
  const target = request.to && isAddress(request.to) ? request.to : undefined;
  const selector = request.calldata.slice(0, 10).toLowerCase();
  let remote =
    request.chainId && target
      ? await fetchDescriptor(request.chainId, target, selector)
      : null;
  if (!remote && request.chainId && target) {
    const implementation = await resolveImplementation(request.chainId, target);
    if (
      implementation &&
      implementation.toLowerCase() !== target.toLowerCase()
    ) {
      const resolved = await fetchDescriptor(
        request.chainId,
        implementation,
        selector
      );
      // Verify the implementation binding before adding the proxy deployment.
      if (
        resolved &&
        verifyDescriptorContext(
          resolved.descriptor,
          "calldata",
          request.chainId,
          implementation
        )
      ) {
        const descriptor = structuredClone(resolved.descriptor);
        descriptor.context!.contract!.deployments!.push({
          chainId: request.chainId,
          address: target,
        });
        remote = { ...resolved, descriptor };
      }
    }
  }
  let descriptor = remote?.descriptor;
  let result = descriptor
    ? renderDescriptor(request, descriptor, "registry", remote?.sourcePath)
    : null;
  if (!result) {
    descriptor =
      getBuiltinCalldataDescriptor(
        request.chainId ?? 1,
        target ?? zeroAddress,
        request.calldata
      ) ?? undefined;
    if (!descriptor) return null;
    // Bare bytes have no token contract/network context: display base units,
    // never invent a token or fetch metadata for a synthetic zero address.
    if (!target || !request.chainId) {
      if (!["0xa9059cbb", "0x095ea7b3", "0x8d80ff0a"].includes(selector))
        return null;
      descriptor = structuredClone(descriptor);
      for (const format of Object.values(descriptor.display?.formats ?? {})) {
        for (const field of format.fields ?? []) {
          if (field.format === "tokenAmount") {
            field.format = "raw";
            field.label = "Amount (base units)";
            delete field.params;
          }
        }
      }
    }
    result = renderDescriptor(request, descriptor, "builtin");
  }
  if (!result || !descriptor) return null;
  const references = new Map<string, { chainId: number; address: string }>();
  const collect = (fields: RenderedField[]) => {
    for (const field of fields) {
      for (const value of field.values) {
        if (
          (value.kind === "tokenAmount" || value.kind === "tokenTicker") &&
          !(value.kind === "tokenAmount" && value.native) &&
          value.tokenAddress &&
          isAddress(value.tokenAddress)
        ) {
          const chainId = value.chainId ?? request.chainId;
          if (chainId)
            references.set(
              runtimeTokenMetadataKey(chainId, value.tokenAddress),
              { chainId, address: value.tokenAddress }
            );
        }
      }
      field.groups?.forEach(collect);
    }
  };
  collect(result.fields);
  const metadata = Object.fromEntries(
    (
      await Promise.all(
        [...references]
          .slice(0, 32)
          .map(
            async ([key, ref]) =>
              [key, await readTokenMetadata(ref.chainId, ref.address)] as const
          )
      )
    ).filter(
      (entry): entry is readonly [string, TokenMetadataHint] => !!entry[1]
    )
  );
  return renderDescriptor(
    request,
    descriptor,
    result.source,
    result.sourcePath,
    metadata
  );
}
