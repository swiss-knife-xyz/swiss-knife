import { normalize } from "viem/ens";

// Next route parameters can still contain percent escapes. Decode exactly once.
export function decodeEnsRouteName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeEnsInput(value: string): string {
  const input = decodeEnsRouteName(value.trim());
  if (!input) throw new Error("Please enter an ENS name");
  return normalize(input);
}

export interface IndexedEvent {
  id: string;
  __typename: string;
  blockNumber: number;
  transactionID: string;
  owner?: { id: string };
  newOwner?: { id: string };
  registrant?: { id: string };
  resolver?: { address: string };
  expiryDate?: string;
  hash?: string;
  ttl?: string;
  fuses?: number;
  addr?: { id: string } | string;
  coinType?: string;
  multicoinAddr?: string;
  name?: string;
  key?: string;
  value?: string | null;
  contentType?: string;
  x?: string;
  y?: string;
  interfaceID?: string;
  implementer?: string;
  target?: string;
  isAuthorized?: boolean;
  version?: string;
}

// The ENS subgraph indexes both registries, including the 2017 registry.
// Query by node, rather than its human-readable label or current resolver.
export const DOMAIN_EVENTS_QUERY = `query History($node: String!, $cursor: ID!, $first: Int!) {
  domainEvents(first: $first, orderBy: id, orderDirection: asc, where: {domain: $node, id_gt: $cursor}) {
    id __typename blockNumber transactionID
    ... on Transfer { owner { id } }
    ... on NewOwner { owner { id } }
    ... on WrappedTransfer { owner { id } }
    ... on NewResolver { resolver { address } }
    ... on NewTTL { ttl }
    ... on NameWrapped { owner { id } expiryDate fuses }
    ... on NameUnwrapped { owner { id } }
    ... on FusesSet { fuses }
    ... on ExpiryExtended { expiryDate }
  }
}`;

export const REGISTRATION_EVENTS_QUERY = `query History($node: String!, $cursor: ID!, $first: Int!) {
  registrationEvents(first: $first, orderBy: id, orderDirection: asc, where: {registration_: {domain: $node}, id_gt: $cursor}) {
    id __typename blockNumber transactionID
    ... on NameRegistered { registrant { id } expiryDate }
    ... on NameRenewed { expiryDate }
    ... on NameTransferred { newOwner { id } }
  }
}`;

export const RESOLVER_EVENTS_QUERY = `query History($node: String!, $cursor: ID!, $first: Int!) {
  resolverEvents(first: $first, orderBy: id, orderDirection: asc, where: {resolver_: {domain: $node}, id_gt: $cursor}) {
    id __typename blockNumber transactionID
    ... on ContenthashChanged { hash }
    ... on AddrChanged { addr { id } }
    ... on MulticoinAddrChanged { coinType multicoinAddr: addr }
    ... on NameChanged { name }
    ... on TextChanged { key value }
    ... on AbiChanged { contentType }
    ... on PubkeyChanged { x y }
    ... on InterfaceChanged { interfaceID implementer }
    ... on AuthorisationChanged { owner target isAuthorized }
    ... on VersionChanged { version }
  }
}`;

export async function fetchIndexedEvents(
  query: string,
  field: "domainEvents" | "registrationEvents" | "resolverEvents",
  node: string,
  request: (
    query: string,
    variables: Record<string, unknown>
  ) => Promise<Record<string, IndexedEvent[]>>,
  pageSize = 1000
): Promise<IndexedEvent[]> {
  const events: IndexedEvent[] = [];
  let cursor = "";
  for (;;) {
    const data = await request(query, { node, cursor, first: pageSize });
    const page = data[field];
    if (!Array.isArray(page)) throw new Error(`Missing ENS ${field} response`);
    events.push(...page);
    if (page.length < pageSize) return events;
    const next = page[page.length - 1].id;
    if (next <= cursor)
      throw new Error("ENS history pagination did not advance");
    cursor = next;
  }
}

export function eventSummary(event: IndexedEvent): string {
  switch (event.__typename) {
    case "NewResolver":
      return `Resolver: ${event.resolver?.address ?? "cleared"}`;
    case "NewTTL":
      return `TTL: ${event.ttl} seconds`;
    case "NameWrapped":
      return `Wrapped · fuses: ${event.fuses}`;
    case "NameUnwrapped":
      return "Name unwrapped";
    case "FusesSet":
      return `Fuses: ${event.fuses}`;
    case "AddrChanged":
      return `ETH address: ${typeof event.addr === "object" ? event.addr.id : event.addr}`;
    case "MulticoinAddrChanged":
      return `Coin type ${event.coinType}: ${event.multicoinAddr}`;
    case "NameChanged":
      return `Name: ${event.name}`;
    case "TextChanged":
      return `${event.key}: ${event.value ?? "value not indexed"}`;
    case "AbiChanged":
      return `ABI content type: ${event.contentType}`;
    case "PubkeyChanged":
      return `Public key: ${event.x}, ${event.y}`;
    case "InterfaceChanged":
      return `Interface ${event.interfaceID}: ${event.implementer}`;
    case "AuthorisationChanged":
      return `${event.isAuthorized ? "Authorized" : "Revoked"}: ${event.target}`;
    case "VersionChanged":
      return `Resolver version: ${event.version}`;
    default:
      return "";
  }
}
