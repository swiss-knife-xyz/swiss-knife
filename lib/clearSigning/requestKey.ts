import { keccak256, toHex } from "viem";
import type { ClearSigningRequest } from "./resolve";

/** Bind cached presentation to the entire call envelope, not just its selector. */
export function clearSigningRequestKey(request: ClearSigningRequest): string {
  return keccak256(
    toHex(
      JSON.stringify([
        request.chainId ?? null,
        request.to?.toLowerCase() ?? null,
        request.from?.toLowerCase() ?? null,
        request.value ?? null,
        request.calldata.toLowerCase(),
        ...(request.allowMissingSender ? ["unknown-sender-preview"] : []),
      ])
    )
  );
}
