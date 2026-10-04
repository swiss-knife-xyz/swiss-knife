import subdomains from "@/subdomains";

// These category roots are aliases, not indexable content pages.
export const defaultTools: Record<string, string> = {
  calldata: "decoder", converter: "eth", ens: "history",
  foundry: "forge-stack-tracer-ui", safe: "eip-712-hash",
  solidity: "compiler", transact: "send-tx", uniswap: "tick-to-price", wallet: "bridge",
};

export function getCanonicalUrl(appPath: string): string {
  const [base, ...parts] = appPath.replace(/^\/+|\/+$/g, "").split("/");
  const subdomain = Object.values(subdomains).find((item) => item.base === base);
  if (!subdomain || subdomain.isRelativePath) {
    return `https://eth.sh${base ? `/${[base, ...parts].join("/")}` : "/"}`;
  }
  return `https://${base}.eth.sh/${parts.join("/")}`;
}

/** Redirect live aliases canonically, but keep local/preview navigation on its origin. */
export function getToolEntryRedirect(base: string, host: string | null): string {
  const tool = defaultTools[base];
  if (!tool) throw new Error(`No default tool configured for ${base}`);
  const path = `/${base}/${tool}`;
  const hostname = host?.toLowerCase().replace(/:\d+$/, "");
  if (hostname === "eth.sh" || hostname === "www.eth.sh" || hostname === `${base}.eth.sh`) {
    return getCanonicalUrl(path);
  }
  // A root-relative Location preserves the request's scheme, host and port.
  return path;
}

export function getPublicPageUrls(): string[] {
  const paths = ["/", "/robin-bridge"];
  for (const { base, paths: tools } of Object.values(subdomains)) {
    if (!defaultTools[base]) paths.push(`/${base}`);
    for (const tool of tools) paths.push(`/${base}/${tool}`);
  }
  return Array.from(new Set(paths.map(getCanonicalUrl)));
}
