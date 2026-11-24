const chainIds = require("./supported-chain-ids.json");
const supportedChainIds = new Set(chainIds.map(String));

// Public legacy routes only. Root entries go directly to the final default tool.
const routes = {
  calldata: {
    defaultPath: "decoder",
    paths: ["decoder", "encoder", "viem-error-simulate"],
  },
  converter: {
    defaultPath: "eth",
    paths: ["eth", "hexadecimal", "keccak256", "padding", "address-checksum"],
  },
  constants: { paths: [] },
  "epoch-converter": { paths: [] },
  transact: { host: "tx", paths: ["send-tx"], defaultPath: "" },
  "storage-slots": { paths: [] },
  "character-counter": { paths: [] },
  uniswap: { defaultPath: "tick-to-price", paths: ["tick-to-price"] },
  "determine-address": {
    paths: [],
    destination: "https://eth.sh/determine-address",
  },
  "contract-address": {
    paths: [],
    destination: "https://eth.sh/determine-address",
  },
  "contract-diff": { paths: [] },
  foundry: {
    defaultPath: "forge-stack-tracer-ui",
    paths: ["forge-stack-tracer-ui"],
  },
  wallet: {
    defaultPath: "bridge",
    paths: [
      "bridge",
      "bridge/apps",
      "ds-proxy",
      "coinbase-smart-wallet",
      "signatures",
      "signatures/view",
    ],
  },
  ens: { defaultPath: "history", paths: ["history", "ccip"] },
  "7702beat": { paths: [] },
  safe: {
    defaultPath: "eip-712-hash",
    paths: ["calldata-decoder", "eip-712-hash"],
  },
  apps: { paths: [] },
  solidity: { defaultPath: "compiler", paths: ["compiler"] },
  "usdc-pay": { paths: [] },
  siwe: { paths: [] },
};
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const txPattern = /^0x[0-9a-fA-F]{64}$/;

/** Keep original encoding, repeated fields, empty values and numeric precision. */
function migrationSearch(search) {
  const fields = search ? search.slice(1).split("&") : [];
  const kept = fields.filter((field) => {
    const key = field.split("=", 1)[0];
    try {
      return decodeURIComponent(key.replace(/\+/g, " ")) !== "migration";
    } catch {
      return true;
    }
  });
  return `?${[...kept, "migration=swiss-knife"].join("&")}`;
}

function explorerPath(path, searchParams) {
  if (path === "") return "https://eth.sh/explorers";
  const parts = path.split("/");
  if (parts[0] === "tx" && parts.length === 2 && txPattern.test(parts[1])) {
    return `https://eth.sh/explorers/tx/${parts[1]}`;
  }
  if (parts[0] === "address" && parts.length === 2) {
    const input = parts[1];
    if (addressPattern.test(input)) {
      const requested = searchParams.getAll("chainId");
      // Never silently reinterpret an explicit unsupported/ambiguous chain.
      const chainId = requested.length === 0 ? "1" : requested[0];
      if (requested.length <= 1 && supportedChainIds.has(chainId)) {
        return `https://explorer.eth.sh/${chainId}/${input}`;
      }
      return `https://eth.sh/explorers/address/${input}`;
    }
    // Legacy address searches also accepted names. The unified workspace cannot.
    let name;
    try {
      name = decodeURIComponent(input);
    } catch {
      return null;
    }
    if (name.includes(".") && !/[\s/#?\\]/.test(name)) {
      return `https://eth.sh/explorers/address/${input}`;
    }
  }
  if (
    parts[0] === "contract" &&
    parts.length === 3 &&
    addressPattern.test(parts[1])
  ) {
    if (supportedChainIds.has(parts[2])) {
      return `https://explorer.eth.sh/${parts[2]}/${parts[1]}`;
    }
    if (/^[1-9]\d*$/.test(parts[2])) {
      // Preserve the path's authoritative chain ID as a directory filter.
      searchParams.set("chainId", parts[2]);
      return `https://eth.sh/explorers/address/${parts[1]}`;
    }
  }
  return null;
}

/**
 * Returns an absolute Location or null. Disabled unless explicitly enabled.
 * HTTP request URLs omit fragments: callers MUST NOT add one to Location,
 * allowing browsers to inherit the original fragment during redirection.
 * @param {string} input
 * @param {{ enabled?: boolean }} options
 * @returns {string | null}
 */
function getMigrationRedirect(input, { enabled = false } = {}) {
  if (!enabled) return null;
  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    return null;
  const host = url.hostname.toLowerCase();
  const apex = host === "swiss-knife.xyz" || host === "www.swiss-knife.xyz";
  const suffix = ".swiss-knife.xyz";
  if (!apex && !host.endsWith(suffix)) return null;
  // Normalize only trailing slashes; unknown/internal/asset routes never match.
  let path = url.pathname.replace(/^\//, "").replace(/\/+$/, "");
  let tool;
  if (apex) {
    if (!path) return `https://eth.sh/${migrationSearch(url.search)}`;
    const [base, ...parts] = path.split("/");
    tool = base;
    path = parts.join("/");
  } else {
    tool = host.slice(0, -suffix.length);
  }
  let destination;
  if (tool === "explorer") {
    // Detect whether a fallback intentionally translated path chainId to query.
    const params = new URLSearchParams(url.search);
    destination = explorerPath(path, params);
    if (destination && params.toString() !== url.searchParams.toString()) {
      // Replace only chainId, preserving every unrelated query field verbatim.
      const chainId = params.get("chainId");
      const fields = url.search
        .slice(1)
        .split("&")
        .filter((field) => {
          try {
            return (
              decodeURIComponent(field.split("=", 1)[0].replace(/\+/g, " ")) !==
              "chainId"
            );
          } catch {
            return true;
          }
        });
      url.search = `?${fields.filter(Boolean).join("&")}${fields.filter(Boolean).length ? "&" : ""}chainId=${chainId}`;
    }
  } else if (Object.hasOwn(routes, tool)) {
    const route = routes[tool];
    const dynamicEns = tool === "ens" && /^history\/[^/]+$/.test(path);
    if (path && !route.paths.includes(path) && !dynamicEns) return null;
    const targetPath =
      tool === "transact" ? "" : path || route.defaultPath || "";
    destination =
      route.destination || `https://${route.host || tool}.eth.sh/${targetPath}`;
  }
  return destination ? destination + migrationSearch(url.search) : null;
}

module.exports = { getMigrationRedirect };
