import contentHash from "content-hash";

type Protocol = "ipfs" | "ipns" | "swarm" | "onion" | "onion3";
const protocols: Record<string, Protocol> = {
  "ipfs-ns": "ipfs",
  "ipns-ns": "ipns",
  "swarm-ns": "swarm",
  onion: "onion",
  onion3: "onion3",
};

export interface ContenthashRecord {
  raw: string;
  protocol: Protocol | null;
  value: string;
  display: string;
  gatewayUrl?: string;
}

// Keep nonempty records visible even when their codec or payload is unsupported.
export function parseContenthash(
  raw: string | null | undefined
): ContenthashRecord | null {
  if (!raw || raw === "0x") return null;
  const fallback: ContenthashRecord = {
    raw,
    protocol: null,
    value: raw,
    display: raw,
  };
  if (!/^0x(?:[0-9a-f]{2})+$/i.test(raw)) return fallback;
  try {
    const protocol = protocols[contentHash.getCodec(raw)];
    if (!protocol) return fallback;
    const decoded = contentHash.decode(raw);
    const value =
      protocol === "ipfs"
        ? contentHash.helpers.cidV0ToV1Base32(decoded)
        : decoded;
    if (!value) return fallback;
    const scheme = protocol === "swarm" ? "bzz" : protocol;
    const record: ContenthashRecord = {
      raw,
      protocol,
      value,
      display: `${scheme}://${value}`,
    };
    // A subdomain gateway needs a CID that fits into a DNS label.
    if (protocol === "ipfs" && value.length <= 63) {
      record.gatewayUrl = `https://${value}.ipfs.inbrowser.link`;
    }
    return record;
  } catch {
    return fallback;
  }
}

export function shortenContenthash(record: ContenthashRecord): string {
  const prefix = record.protocol
    ? record.display.slice(0, record.display.length - record.value.length)
    : "";
  const value = record.value;
  return `${prefix}${value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-4)}` : value}`;
}
