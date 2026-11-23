import { getAddress, type Address } from "viem";

export const DELEGATION_PREFIX = "0xef0100";

/** EIP-7702 delegation designator: exactly 0xef0100 followed by 20 bytes. */
export function getDelegatedImplementation(code: string | undefined): Address | null {
  if (!code || !/^0xef0100[0-9a-f]{40}$/i.test(code)) return null;
  const address = getAddress(`0x${code.slice(8)}`);
  // Authorizing the zero address clears delegation rather than setting code.
  return /^0x0{40}$/.test(address) ? null : address;
}
