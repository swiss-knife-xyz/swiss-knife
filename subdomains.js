const subdomains = {
  CALLDATA: {
    base: "calldata",
    paths: ["decoder"],
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
    paths: ["tick-to-price"],
  },
  CONTRACT_ADDRESS: {
    base: "contract-address",
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
    paths: ["bridge"],
  },
  ENS: {
    base: "ens",
    paths: ["history"],
  },
  "7702BEAT": {
    base: "7702beat",
    paths: [],
    isRelativePath: true,
  },
  "712HASH": {
    base: "712hash",
    paths: [],
  },
};

module.exports = subdomains;
