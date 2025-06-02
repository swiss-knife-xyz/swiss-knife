import { IWalletKit } from "@reown/walletkit";

// Types for session requests
export interface SessionProposal {
  id: number;
  params: {
    id: number;
    pairingTopic: string;
    expiryTimestamp: number;
    relays: { protocol: string }[];
    proposer: {
      publicKey: string;
      metadata: {
        name: string;
        description: string;
        url: string;
        icons: string[];
      };
    };
    requiredNamespaces: Record<
      string,
      {
        chains: string[];
        methods: string[];
        events: string[];
      }
    >;
    optionalNamespaces: Record<
      string,
      {
        chains: string[];
        methods: string[];
        events: string[];
        rpcMap?: Record<string, string>;
      }
    >;
  };
}

export interface SessionRequest {
  id: number;
  topic: string;
  params: {
    request: {
      method: string;
      params: any;
    };
    chainId: string;
  };
}

export interface DecodedSignatureData {
  type: "message" | "typedData";
  decoded: any;
}

export type WalletKitInstance = IWalletKit;
