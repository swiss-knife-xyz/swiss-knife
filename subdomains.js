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
    paths: ["tick-to-price", "pool-price-to-target"],
  },
  CONTRACT_ADDRESS: {
    base: "contract-address",
    paths: [],
  },
  FOUNDRY: {
    base: "foundry",
    paths: ["forge-stack-tracer-ui"],
  },
};

module.exports = subdomains;
