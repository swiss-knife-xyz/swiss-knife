export const address = "0x1111111111111111111111111111111111111111";
export const fixture = {
  is_verified: true,
  language: "solidity",
  name: "Example",
  file_path: "contracts/Example.sol",
  source_code: "pragma solidity ^0.8.24; contract Example {}",
  compiler_version: "v0.8.24+commit.e11b9ed9",
  compiler_settings: {
    compilationTarget: { "contracts/Example.sol": "Example" },
    optimizer: { enabled: true, runs: 123, details: { yul: true } },
    viaIR: true,
    evmVersion: "paris",
    metadata: { bytecodeHash: "ipfs" },
    libraries: { "lib/L.sol": { L: address } },
    remappings: ["lib/=lib/"],
  },
  external_libraries: [{ name: "L", address_hash: address }],
  constructor_args: "0x1234",
  additional_sources: [{ file_path: "lib/L.sol", source_code: "library L {}" }],
  license_type: "mit",
  is_partially_verified: false,
};
