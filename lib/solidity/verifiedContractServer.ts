import {
  ProviderClient,
  type ProviderKeys,
} from "@/lib/verification/providers";
import {
  VerificationError,
  verificationInput,
  providersFor,
  type VerificationProvider,
} from "@/lib/verification/source";
import {
  verifiedContractBackup,
  type VerifiedContract,
} from "./verifiedContract";

export class VerifiedContractImportError extends Error {}

/** Read-only lookup using fixed provider endpoints, never a supplied URL or RPC. */
export async function fetchVerifiedContract(
  chainId: string,
  address: string,
  signal: AbortSignal,
  keys: ProviderKeys,
  fetcher: typeof fetch = fetch
): Promise<VerifiedContract> {
  const identity = verificationInput(chainId, address);
  const supported = providersFor(identity.chainId);
  const candidates = (
    [
      "etherscan",
      "sourcify",
      "blockscout",
      "routescan",
    ] as VerificationProvider[]
  ).filter(
    (provider) =>
      supported.includes(provider) &&
      (provider !== "etherscan" || keys.etherscan)
  );
  if (!candidates.length) throw new VerificationError("UNSUPPORTED_ROUTE");
  const client = new ProviderClient(fetcher, keys, signal);
  let failure: unknown;
  let incompatible: unknown;
  for (const provider of candidates) {
    signal.throwIfAborted();
    try {
      const source = await client.source(
        provider,
        identity.chainId,
        identity.address
      );
      try {
        verifiedContractBackup(source);
      } catch (error) {
        incompatible = error;
        continue;
      }
      return {
        source,
        provider,
        chainId: Number(identity.chainId),
        address: identity.address,
      };
    } catch (error) {
      failure = error;
    }
  }
  signal.throwIfAborted();
  if (incompatible instanceof Error)
    throw new VerifiedContractImportError(incompatible.message);
  throw failure ?? new VerificationError("UNSUPPORTED_SOURCE");
}
