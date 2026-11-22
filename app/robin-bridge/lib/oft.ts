import {
  concat,
  encodeAbiParameters,
  getContractAddress,
  keccak256,
  padHex,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import {
  ROBIN_OFT_ADAPTER_BYTECODE,
  ROBIN_OFT_BYTECODE,
} from "./oftArtifacts.generated";

export const BASE_CHAIN_ID = 8453;
export const ROBINHOOD_CHAIN_ID = 4663;
export const BASE_EID = 30184;
export const ROBINHOOD_EID = 30416;
export const SHARED_DECIMALS = 6;

export const CREATE2_FACTORY =
  "0x4e59b44847b379578588920cA78FbF26c0B4956C" as Address;

export const LAYERZERO = {
  base: {
    endpoint: "0x1a44076050125825900e736c501f859c50fE728c",
    sendLib: "0xb5320b0b3a13cc860893e2bd79fcd7e13484dda2",
    receiveLib: "0xc70ab6f32772f59fbfc23889caf4ba3376c84baf",
    executor: "0x2cca08ae69e0c44b18a57ab2a87644234daebae4",
    dvns: [
      "0x9e059a54699a285714207b43B055483E78FAac25",
      "0xcd37CA043f8479064e10635020c65FfC005d36f6",
    ],
  },
  robinhood: {
    endpoint: "0x6f475642a6e85809b1c36fa62763669b1b48dd5b",
    sendLib: "0xc39161c743d0307eb9bcc9fef03eeb9dc4802de7",
    receiveLib: "0xe1844c5d63a9543023008d332bd3d2e6f1fe1043",
    executor: "0x4208d6e27538189bb48e603d6123a94b8abe0a0b",
    dvns: [
      "0x0ffe02df012299a370d5dd69298a5826eacafdf8",
      "0xd01ae6905d48315f7be10c7330aecf8360ef5b12",
    ],
  },
} as const satisfies Record<
  string,
  {
    endpoint: Address;
    sendLib: Address;
    receiveLib: Address;
    executor: Address;
    dvns: readonly [Address, Address];
  }
>;

export type OftDeployment = {
  baseToken: Address;
  adapter: Address;
  robinToken: Address;
  name: string;
  symbol: string;
  baseDecimals: number;
  logo?: string;
};

export type OftDeploymentPlan = OftDeployment & {
  salt: Hex;
  adapterInitCode: Hex;
  robinOftInitCode: Hex;
  adapterDeployData: Hex;
  robinOftDeployData: Hex;
};

const adapterConstructor = [
  { name: "token_", type: "address" },
  { name: "endpoint_", type: "address" },
  { name: "delegate_", type: "address" },
] as const;

const oftConstructor = [
  { name: "name_", type: "string" },
  { name: "symbol_", type: "string" },
  { name: "endpoint_", type: "address" },
  { name: "delegate_", type: "address" },
] as const;

export function buildDeploymentPlan({
  baseToken,
  name,
  symbol,
  baseDecimals,
  owner,
}: Omit<OftDeployment, "adapter" | "robinToken"> & {
  owner: Address;
}): OftDeploymentPlan {
  const salt = keccak256(
    concat([
      stringToHex("ETH.SH-ROBIN-OFT-V1"),
      padHex(baseToken, { size: 32 }),
      padHex(owner, { size: 32 }),
    ])
  );
  const adapterInitCode = concat([
    ROBIN_OFT_ADAPTER_BYTECODE,
    encodeAbiParameters(adapterConstructor, [
      baseToken,
      LAYERZERO.base.endpoint,
      owner,
    ]),
  ]);
  const robinOftInitCode = concat([
    ROBIN_OFT_BYTECODE,
    encodeAbiParameters(oftConstructor, [
      name,
      symbol,
      LAYERZERO.robinhood.endpoint,
      owner,
    ]),
  ]);

  const adapter = getContractAddress({
    bytecode: adapterInitCode,
    from: CREATE2_FACTORY,
    opcode: "CREATE2",
    salt,
  });
  const robinToken = getContractAddress({
    bytecode: robinOftInitCode,
    from: CREATE2_FACTORY,
    opcode: "CREATE2",
    salt,
  });

  return {
    baseToken,
    adapter,
    robinToken,
    name,
    symbol,
    baseDecimals,
    salt,
    adapterInitCode,
    robinOftInitCode,
    adapterDeployData: concat([salt, adapterInitCode]),
    robinOftDeployData: concat([salt, robinOftInitCode]),
  };
}

const ulnConfigType = {
  type: "tuple",
  components: [
    { name: "confirmations", type: "uint64" },
    { name: "requiredDVNCount", type: "uint8" },
    { name: "optionalDVNCount", type: "uint8" },
    { name: "optionalDVNThreshold", type: "uint8" },
    { name: "requiredDVNs", type: "address[]" },
    { name: "optionalDVNs", type: "address[]" },
  ],
} as const;

const executorConfigType = {
  type: "tuple",
  components: [
    { name: "maxMessageSize", type: "uint32" },
    { name: "executor", type: "address" },
  ],
} as const;

export function encodeUlnConfig(dvns: readonly [Address, Address]): Hex {
  return encodeAbiParameters(
    [ulnConfigType],
    [
      {
        confirmations: 20n,
        requiredDVNCount: 2,
        optionalDVNCount: 0,
        optionalDVNThreshold: 0,
        requiredDVNs: [...dvns].sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        ),
        optionalDVNs: [],
      },
    ]
  );
}

export function encodeExecutorConfig(executor: Address): Hex {
  return encodeAbiParameters(
    [executorConfigType],
    [{ maxMessageSize: 10_000, executor }]
  );
}

export const oappAdminAbi = [
  {
    type: "function",
    name: "setPeer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eid", type: "uint32" },
      { name: "peer", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "peers",
    stateMutability: "view",
    inputs: [{ name: "eid", type: "uint32" }],
    outputs: [{ name: "peer", type: "bytes32" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

export const endpointConfigAbi = [
  {
    type: "function",
    name: "setConfig",
    stateMutability: "nonpayable",
    inputs: [
      { name: "oapp", type: "address" },
      { name: "lib", type: "address" },
      {
        name: "params",
        type: "tuple[]",
        components: [
          { name: "eid", type: "uint32" },
          { name: "configType", type: "uint32" },
          { name: "config", type: "bytes" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getConfig",
    stateMutability: "view",
    inputs: [
      { name: "oapp", type: "address" },
      { name: "lib", type: "address" },
      { name: "eid", type: "uint32" },
      { name: "configType", type: "uint32" },
    ],
    outputs: [{ name: "config", type: "bytes" }],
  },
] as const;

export const dvnAbi = [
  {
    type: "function",
    name: "getFee",
    stateMutability: "view",
    inputs: [
      { name: "dstEid", type: "uint32" },
      { name: "confirmations", type: "uint64" },
      { name: "sender", type: "address" },
      { name: "options", type: "bytes" },
    ],
    outputs: [{ name: "fee", type: "uint256" }],
  },
] as const;
