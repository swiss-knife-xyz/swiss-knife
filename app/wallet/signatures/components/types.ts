export type SignatureType = "message" | "typed_data";

export type SharedSignaturePayload = {
  type: SignatureType;
  message?: string;
  rawData?: string;
  parsedData?: EIP712TypedData;
  signers: SignerEntry[];
};

export type EIP712TypedData = {
  domain?: Record<string, any>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, any>;
};

export type SignerEntry = {
  address: `0x${string}`;
  signature: `0x${string}`;
  timestamp: string;
};

export const exampleTypedDataJSON = {
  types: {
    IceCreamOrder: [
      { name: "flavor", type: "string" },
      { name: "scoops", type: "int32" },
      { name: "toppings", type: "string" },
    ],
  },
  primaryType: "IceCreamOrder",
  message: {
    flavor: "Chocolate Chip",
    scoops: 2,
    toppings: "Choco chips and sprinkles",
  },
} as const;
