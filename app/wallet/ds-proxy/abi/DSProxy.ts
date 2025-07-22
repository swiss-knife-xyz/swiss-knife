export const DS_PROXY_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "_cacheAddr", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "authority",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract DSAuthority",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cache",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract DSProxyCache",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "_target", type: "address", internalType: "address" },
      { name: "_data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "response", type: "bytes", internalType: "bytes" }],
    stateMutability: "payable",
  },

  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setAuthority",
    inputs: [
      {
        name: "authority_",
        type: "address",
        internalType: "contract DSAuthority",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setCache",
    inputs: [{ name: "_cacheAddr", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setOwner",
    inputs: [{ name: "owner_", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "LogNote",
    inputs: [
      {
        name: "sig",
        type: "bytes4",
        indexed: true,
        internalType: "bytes4",
      },
      {
        name: "guy",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "foo",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "bar",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "wad",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "fax",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: true,
  },
  {
    type: "event",
    name: "LogSetAuthority",
    inputs: [
      {
        name: "authority",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "LogSetOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
] as const;
