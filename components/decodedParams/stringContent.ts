import { decodeBase64 } from "@/utils";

export function parseJsonContent(
  value: unknown
): Record<string, unknown> | unknown[] | undefined {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed !== null && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function analyzeString(value: string) {
  const decoded = decodeBase64(value);
  const json = parseJsonContent(decoded?.isJson ? decoded.content : value);
  const svg = decoded?.isSvg ? decoded.content : undefined;
  return {
    json,
    svg,
    image: svg
      ? value.startsWith("data:")
        ? value
        : `data:image/svg+xml;base64,${value}`
      : undefined,
    isUrl: /^(https?:\/\/|ipfs:\/\/)/i.test(value),
    isBase64: Boolean(decoded && (decoded.isJson || decoded.isSvg)),
  };
}

export const isImageUrl = (value: string) =>
  /^(https?:\/\/|ipfs:\/\/)/i.test(value) &&
  /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#]|$)/i.test(value);
