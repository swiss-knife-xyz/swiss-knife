interface PublicIPFSGateway {
  name: string;
  url: string;
  website: string;
  faviconDomain?: string;
  note?: string;
  automaticFallback?: boolean;
}

// Directory order is independent of the HTTP preview fallback policy below.
export const PUBLIC_IPFS_GATEWAYS: readonly PublicIPFSGateway[] = [
  {
    name: "Pinata",
    url: "https://gateway.pinata.cloud/ipfs/",
    website: "https://pinata.cloud",
    automaticFallback: true,
  },
  {
    name: "IPFS.io",
    url: "https://ipfs.io/ipfs/",
    website: "https://ipfs.io",
    faviconDomain: "ipfs.tech",
    note: "Browser retrieval via inbrowser.link",
  },
  {
    name: "dweb.link",
    url: "https://dweb.link/ipfs/",
    website: "https://dweb.link",
    faviconDomain: "ipfs.tech",
    note: "Browser retrieval via inbrowser.link",
  },
  {
    name: "Filebase",
    url: "https://ipfs.filebase.io/ipfs/",
    website: "https://filebase.com",
    automaticFallback: true,
  },
  {
    name: "Orbitor",
    url: "https://ipfs.orbitor.dev/ipfs/",
    website: "https://blog.chainsafe.io/orbitor-ipfs-announcement/",
    faviconDomain: "chainsafe.io",
    automaticFallback: true,
  },
  {
    name: "inbrowser.link",
    url: "https://inbrowser.link/ipfs/",
    website: "https://inbrowser.link",
    faviconDomain: "ipfs.tech",
    note: "Retrieves and verifies content in your browser",
  },
  {
    name: "4EVERLAND",
    url: "https://4everland.io/ipfs/",
    website: "https://www.4everland.org/ipfs/",
    note: "Does not serve HTML",
  },
];
// Browser resolvers and providers with content restrictions are for navigation;
// background JSON/image previews retain the verified independent HTTP providers.
export const IPFS_GATEWAYS = PUBLIC_IPFS_GATEWAYS.filter(
  (gateway) => gateway.automaticFallback
).map((gateway) => gateway.url);

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
