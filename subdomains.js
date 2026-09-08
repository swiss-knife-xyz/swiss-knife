const subdomains = {
  CALLDATA: {
    base: "calldata",
    paths: ["decoder", "encoder", "viem-error-simulate", "cowswap"],
  },
  CONTRACT: {
    base: "contract",
    paths: [],
  },
  EXPLORER: {
    base: "explorer",
    paths: ["address", "tx"],
  },
  CONVERTER: {
    base: "converter",
    paths: ["eth", "hexadecimal", "keccak256", "padding", "address-checksum"],
  },
  CONSTANTS: {
    base: "constants",
    paths: [],
  },
  EPOCH_CONVERTER: {
    base: "epoch-converter",
    paths: [],
  },
  TRANSACT: {
    base: "transact",
    paths: ["send-tx"],
  },
  STORAGE_SLOTS: {
    base: "storage-slots",
    paths: [],
  },
  CHARACTER_COUNTER: {
    base: "character-counter",
    paths: [],
  },
  UNISWAP: {
    base: "uniswap",
    paths: ["tick-to-price", "pool-price-to-target"],
  },
  DETERMINE_ADDRESS: {
    base: "determine-address",
    paths: [],
  },
  CONTRACT_DIFF: {
    base: "contract-diff",
    paths: [],
  },
  FOUNDRY: {
    base: "foundry",
    paths: ["forge-stack-tracer-ui"],
  },
  WALLET: {
    base: "wallet",
    paths: ["bridge", "ds-proxy", "signatures"],
  },
  MIGRATE: {
    base: "migrate",
    paths: [],
  },
  GWEI: {
    base: "gwei",
    paths: [],
  },
  ENS: {
    base: "ens",
    paths: ["history"],
  },
  "7702BEAT": {
    base: "7702beat",
    paths: [],
  },
  SAFE: {
    base: "safe",
    paths: ["calldata-decoder", "eip-712-hash"],
  },
  APPS: {
    base: "apps",
    paths: [],
  },
  SOLIDITY: {
    base: "solidity",
    paths: ["compiler"],
  },
  USDC_PAY: {
    base: "usdc-pay",
    paths: [],
  },
  SIWE: {
    base: "siwe",
    paths: [],
  },
  FAUCET: {
    base: "faucet",
    paths: [],
  },
  SKILLS: {
    base: "skills",
    paths: [],
  },
  ORGS: {
    base: "orgs",
    paths: [],
    isRelativePath: true,
  },
  PRIVACY: {
    base: "privacy",
    paths: [],
  },
};

module.exports = subdomains;
