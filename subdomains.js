const subdomains = {
  CONSTANTS: {
    base: "constants",
    paths: [],
  },
  EPOCH_CONVERTER: {
    base: "epoch-converter",
    paths: [],
  },
  EXPLORER: {
    base: "explorer",
    paths: ["address", "tx"],
  },
  CONVERTER: {
    base: "converter",
    paths: ["address-checksum", "eth", "hexadecimal", "keccak256", "padding"],
  },
  TRANSACT: {
    base: "transact",
    paths: ["send-tx"],
  },
  CALLDATA: {
    base: "calldata",
    paths: ["decoder"],
  },
  STORAGE_SLOTS: {
    base: "storage-slots",
    paths: [],
  },
  UNISWAP: {
    base: "uniswap",
    paths: ["tick-to-price"],
  },
  CHARACTER_COUNT: {
    base: "character-count",
    paths: [],
  },
  CONTRACT_ADDRESS: {
    base: "contract-address",
    paths: [],
  },
};

module.exports = subdomains;
