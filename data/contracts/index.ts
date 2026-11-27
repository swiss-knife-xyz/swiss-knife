import registry from "./registry.json";

export interface KnownContract {
  protocol: string;
  version: string;
  chainId: number;
  address: string;
  label: string;
  kind: string;
  description: string;
  source: string;
  aliases?: string[];
}

export interface ContractSource {
  url: string;
  reviewedAt: string;
  revision?: string;
  publishedAt?: string;
}

/** Curated discovery metadata, not a protocol support list or live deployment check. */
export const knownContracts: readonly KnownContract[] = registry.contracts;
export const contractSources: Readonly<Record<string, ContractSource>> =
  registry.sources;

const byDeployment = new Map(
  knownContracts.map((entry) => [
    `${entry.chainId}:${entry.address.toLowerCase()}`,
    entry,
  ])
);

export function getKnownContract(chainId: number, address: string) {
  return byDeployment.get(`${chainId}:${address.toLowerCase()}`);
}

export function getKnownContractUrl(entry: KnownContract) {
  return `https://explorer.eth.sh/${entry.chainId}/${entry.address}`;
}
