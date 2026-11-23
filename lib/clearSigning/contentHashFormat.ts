import {
  decode as decodeContentHash,
  getCodec,
} from "@ensdomains/content-hash";

export interface ContentHashDisplay {
  raw: string;
  uri?: string;
  codec?: string;
  decoded?: string;
}

const CODEC_URI_SCHEMES: Record<string, string> = {
  ipfs: "ipfs",
  ipns: "ipns",
  swarm: "bzz",
  arweave: "ar",
  onion: "onion",
  onion3: "onion",
};

export function decodeContentHashForDisplay(
  value: unknown
): ContentHashDisplay {
  const raw = normalizeContentHashInput(value);
  if (!raw) return { raw: stringifyContentHashValue(value) };

  try {
    const codec = getCodec(raw);
    const decoded = decodeContentHash(raw);
    if (!codec || !decoded) return { raw };

    const codecName = String(codec);
    const scheme = CODEC_URI_SCHEMES[codecName] || codecName;
    return {
      raw,
      codec: codecName,
      decoded,
      uri: `${scheme}://${decoded}`,
    };
  } catch {
    return { raw };
  }
}

function normalizeContentHashInput(value: unknown): string | null {
  const raw = stringifyContentHashValue(value).trim();
  if (!raw) return null;

  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) return raw;
  return `0x${hex.toLowerCase()}`;
}

function stringifyContentHashValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
