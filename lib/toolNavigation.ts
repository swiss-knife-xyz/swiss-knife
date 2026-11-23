import { toolCategories, type ToolCatalogEntry } from "@/data/toolCatalog";
import subdomains from "@/subdomains";
import { defaultTools } from "@/lib/seo";
import { getPath } from "@/utils";

const pageLabels: Record<string, string> = {
  decoder: "Calldata Decoder",
  encoder: "Calldata Encoder",
  "viem-error-simulate": "Viem Error Simulator",
  cowswap: "CowSwap Decoder",
  verify: "Cross-explorer Verification",
  eth: "ETH / Wei",
  "gas-cost": "Gas Cost",
  hexadecimal: "Hexadecimal",
  keccak256: "Keccak256",
  padding: "Padding",
  "address-checksum": "Address Checksum",
  "send-tx": "Send Transaction",
  "tick-to-price": "Tick to Price",
  "pool-price-to-target": "Pool Price to Target",
  "initialize-pool": "Initialize Pool",
  "add-liquidity": "Add Liquidity",
  swap: "Swap",
  positions: "Positions",
  "calldata-decoder": "Safe Calldata Decoder",
  "eip-712-hash": "EIP-712 Hash",
  compiler: "Solidity Compiler",
  history: "ENS History",
  ccip: "CCIP Resolve",
  bridge: "Wallet Bridge",
  "ds-proxy": "DS Proxy",
  "coinbase-smart-wallet": "Coinbase Smart Wallet",
  signatures: "Wallet Signatures",
  "forge-stack-tracer-ui": "Forge Stack Tracer",
};
const featuredPages = new Set(
  toolCategories.flatMap((category) =>
    category.tools.map(
      (tool) =>
        `${tool.subdomain}/${tool.path ?? defaultTools[tool.subdomain] ?? ""}`
    )
  )
);
export const navigation = toolCategories.map((category) => ({
  ...category,
  tools: category.tools.map((tool) => ({
    ...tool,
    id: `${tool.subdomain}/${tool.path ?? defaultTools[tool.subdomain] ?? ""}`,
    children: tool.path
      ? []
      : (
          Object.values(subdomains).find((item) => item.base === tool.subdomain)
            ?.paths ?? []
        )
          .filter((path) => !featuredPages.has(`${tool.subdomain}/${path}`))
          .map((path) => ({
            path,
            label: pageLabels[path] ?? path.replaceAll("-", " "),
          })),
  })),
}));
export const toolHref = (
  tool: ToolCatalogEntry,
  path = tool.path ?? defaultTools[tool.subdomain] ?? ""
) => `${getPath(tool.subdomain, tool.info.isRelativePath)}${path}`;

export function matchesToolQuery(query: string, ...values: string[]) {
  return values.join(" ").toLowerCase().includes(query.trim().toLowerCase());
}

export function getFilteredToolNavigation(query: string) {
  return navigation
    .map((category) => ({
      ...category,
      tools: category.tools.flatMap((tool) => {
        const parentMatches = matchesToolQuery(
          query,
          tool.info.label,
          tool.subdomain,
          tool.path ?? ""
        );
        const children = tool.children.filter(
          (child) =>
            parentMatches || matchesToolQuery(query, child.label, child.path)
        );
        return parentMatches || children.length ? [{ ...tool, children }] : [];
      }),
    }))
    .filter((category) => category.tools.length);
}

/** Flat suggestions use the same catalog, child pages, matching and order as All Tools. */
export function searchToolNavigation(query: string, limit = 6) {
  if (!query.trim()) return [];
  const results: { label: string; detail: string; href: string }[] = [];
  for (const category of getFilteredToolNavigation(query)) {
    for (const tool of category.tools) {
      if (
        matchesToolQuery(
          query,
          tool.info.label,
          tool.subdomain,
          tool.path ?? ""
        )
      ) {
        results.push({
          label: tool.info.label,
          detail: category.label,
          href: toolHref(tool),
        });
      }
      for (const child of tool.children) {
        results.push({
          label: child.label,
          detail: tool.info.label,
          href: toolHref(tool, child.path),
        });
      }
    }
  }
  return results.slice(0, limit);
}
