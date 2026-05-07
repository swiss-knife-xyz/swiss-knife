import type { ReactNode } from "react";
import type { Address, Hex, PublicClient } from "viem";

export interface OwnerCheck {
  isOwner: boolean;
  error?: string;
}

export interface WrappedTransaction {
  to: Address;
  value: bigint;
  data: Hex;
}

export interface SmartWalletConfig {
  // Identity / display
  emoji: string;
  // Used in UI text and toasts (e.g. "DSProxy", "Coinbase Smart Wallet").
  shortName: string;
  // Heading for the address-config card (e.g. "DSProxy Address").
  configHeading: string;
  // Top-of-page description.
  description: ReactNode;

  // Persistence
  localStorageKey: string;

  // Chain support (returns true if a session request on this chain is supported).
  isChainSupported: (chainId: number) => boolean;
  // Display list of supported chain names (used in the "not supported" warning).
  getSupportedChainNames: () => string[];

  // Owner check. The shared module already verifies the address is a contract;
  // this callback only needs to check ownership against the connected EOA.
  checkOwner: (args: {
    walletAddress: Address;
    eoa: Address;
    publicClient: PublicClient;
  }) => Promise<OwnerCheck>;
  // Error message shown when the owner check throws (e.g. wrong contract type).
  ownerCheckErrorMessage: string;

  // Wrap a dApp-issued tx into a smart-wallet-relayed tx.
  wrapTransaction: (args: {
    walletAddress: Address;
    chainId: number;
    to: Address;
    value: bigint;
    data: Hex;
  }) => WrappedTransaction;

  // Optional ERC-1271 signature wrappers. When set, the modal will produce a
  // signature that the dApp can verify against the smart wallet via
  // `isValidSignature(hash, signature)`. When unset, signing methods are
  // rejected with a clear error (the smart wallet cannot sign).
  //
  // Implementations should:
  //   1. Compute the hash the dApp would verify (EIP-191 for personal_sign,
  //      EIP-712 for eth_signTypedData_*).
  //   2. Have the EOA owner produce a raw signature over the wallet-specific
  //      rebound hash (e.g. Coinbase Smart Wallet's `replaySafeHash`).
  //   3. Encode that raw signature in whatever wrapper the wallet's
  //      `isValidSignature` expects.
  signPersonalMessage?: (args: {
    walletAddress: Address;
    chainId: number;
    eoa: Address;
    walletClient: any;
    publicClient: PublicClient;
    message: string | Hex;
  }) => Promise<Hex>;
  signTypedData?: (args: {
    walletAddress: Address;
    chainId: number;
    eoa: Address;
    walletClient: any;
    publicClient: PublicClient;
    typedData: any;
  }) => Promise<Hex>;

  // How to handle the WalletConnect `wallet_switchEthereumChain` method.
  //   "switch" → actually switch via wagmi `switchChainAsync`
  //   "ack"    → no-op, return success (used when the smart wallet handles
  //              cross-chain execution itself)
  walletSwitchChainBehavior: "switch" | "ack";
  // Toast shown for "ack" behavior.
  ackChainSwitchToast?: {
    title: string;
    description: (chainId: number) => string;
  };

  // Optional footer rendered inside the address-config card (e.g. executor
  // address link for DSProxy, gas-paid-by-EOA note for Coinbase Smart Wallet).
  ConfigFooter?: React.FC<{ chainId: number }>;
}
