// Keep independent public providers in priority order.
export const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.filebase.io/ipfs/",
  "https://ipfs.orbitor.dev/ipfs/",
] as const;

export const IPFS_GATEWAY_TIMEOUT_MS = 8_000;

export function getIPFSGatewayUrls(value: string): string[] {
  const uri = /^ipfs:\/\/(?:ipfs\/)?(.+)$/i.exec(value);
  if (uri) return IPFS_GATEWAYS.map((gateway) => gateway + uri[1]);

  // Also recover URLs that have already been resolved through a known gateway.
  try {
    const url = new URL(value);
    const hosts = IPFS_GATEWAYS.map((gateway) => new URL(gateway).hostname);
    if (
      url.protocol === "https:" &&
      hosts.includes(url.hostname) &&
      url.pathname.startsWith("/ipfs/")
    ) {
      const path = url.pathname.slice(6) + url.search + url.hash;
      return [
        ...new Set([value, ...IPFS_GATEWAYS.map((gateway) => gateway + path)]),
      ];
    }
  } catch {
    // Non-URL strings and data URIs pass through unchanged.
  }
  return [value];
}
