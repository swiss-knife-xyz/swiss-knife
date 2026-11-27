import { getKnownContract, getKnownContractUrl } from "@/data/contracts";
import { getNetworkName } from "@/data/networks";

export function getKnownContractSeo(chainId: string, address: string) {
  if (!/^[1-9]\d*$/.test(chainId)) return undefined;
  const entry = getKnownContract(Number(chainId), address);
  if (!entry) return undefined;

  const networkName = getNetworkName(entry.chainId);
  return {
    title: `${entry.label} on ${networkName} | ETH.sh`,
    description: `${entry.label} contract on ${networkName}: ${entry.address}. ${entry.description} Explore its ABI and read or write contract functions on ETH.sh.`,
    canonical: getKnownContractUrl(entry),
  };
}
