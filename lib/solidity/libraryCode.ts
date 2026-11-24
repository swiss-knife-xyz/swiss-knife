import { getPublicClient } from "@/lib/publicClient";
import {
  libraryAddress,
  type LibraryAddresses,
  type LibraryReference,
} from "./libraries";

export async function checkLibraryAddresses(
  chainId: number,
  refs: LibraryReference[],
  addresses: LibraryAddresses
) {
  let index = 0;
  let failed = false;
  const jobs = async () => {
    try {
      while (!failed && index < refs.length) {
        const ref = refs[index++];
        const address = libraryAddress(addresses[ref.sourcePath]?.[ref.name]);
        if (!address) throw new Error(`Enter a valid address for ${ref.name}.`);
        const code = await getPublicClient(chainId, { timeout: 10000 }).getCode(
          {
            address: address as `0x${string}`,
          }
        );
        if (!code || code === "0x")
          throw new Error(
            `No contract code at the ${ref.name} address on this network.`
          );
      }
    } catch (error) {
      failed = true;
      throw error;
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, refs.length) }, jobs));
}
