import { parseContenthash, type ContenthashRecord } from "./contenthash";
import { parseHistoryTimestamp } from "./dates";

export interface DomainDetails {
  id: string;
  createdAt: number | null;
  expiryDate: number | null;
  owner: string | null;
  registrant: string | null;
  resolver: { id: string } | null;
  isSubdomain: boolean;
  currentContenthash: ContenthashRecord | null;
}

export interface IndexedDomain {
  id: string;
  createdAt?: string | null;
  expiryDate?: string | null;
  owner?: { id: string } | null;
  wrappedOwner?: { id: string } | null;
  registrant?: { id: string } | null;
  resolver?: { id: string } | null;
}

// Ownership and registration information remain usable without resolver records.
export function indexedDomainDetails(
  domain: IndexedDomain,
  isSubdomain: boolean
): DomainDetails {
  return {
    id: domain.id,
    createdAt: parseHistoryTimestamp(domain.createdAt),
    expiryDate: parseHistoryTimestamp(domain.expiryDate),
    owner: domain.wrappedOwner?.id ?? domain.owner?.id ?? null,
    registrant: domain.registrant?.id ?? null,
    resolver: domain.resolver ?? null,
    isSubdomain,
    currentContenthash: null,
  };
}

export function withCurrentContenthash(
  details: DomainDetails,
  raw: string | null | undefined
): DomainDetails {
  return { ...details, currentContenthash: parseContenthash(raw) };
}

export interface DomainRegistration {
  blockNumber: number;
  transactionID: string;
  expiryDate: number | null;
}

export function registrationDetails(
  event:
    | {
        blockNumber: number;
        transactionID: string;
        expiryDate?: unknown;
      }
    | undefined
): DomainRegistration | null {
  return event
    ? {
        blockNumber: event.blockNumber,
        transactionID: event.transactionID,
        expiryDate: parseHistoryTimestamp(event.expiryDate),
      }
    : null;
}
