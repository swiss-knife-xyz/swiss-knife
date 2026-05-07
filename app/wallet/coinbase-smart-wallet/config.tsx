import { HStack, Text } from "@chakra-ui/react";
import { InfoIcon } from "@chakra-ui/icons";
import {
  Address,
  Hex,
  PublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  hashMessage,
  hashTypedData,
  pad,
  parseAbiParameters,
} from "viem";
import type { SmartWalletConfig } from "../_smart-wallet-connect/types";
import { COINBASE_SMART_WALLET_ABI } from "./abi/CoinbaseSmartWallet";

// Coinbase Smart Wallet uses EIP-712 with this domain for `replaySafeHash`.
// See CoinbaseSmartWallet._domainNameAndVersion().
const CBSW_DOMAIN_NAME = "Coinbase Smart Wallet";
const CBSW_DOMAIN_VERSION = "1";

// `replaySafeHash(hash)` is `_hashTypedDataV4(keccak256(abi.encode(MESSAGE_TYPEHASH, hash)))`
// where MESSAGE_TYPEHASH = keccak256("CoinbaseSmartWalletMessage(bytes32 hash)").
// Signing the corresponding typed data via the EOA produces a signature over
// exactly that rebound hash, which is what `isValidSignature` checks.
const REPLAY_SAFE_TYPES = {
  CoinbaseSmartWalletMessage: [{ name: "hash", type: "bytes32" }],
} as const;

// CBSW stores EOA owners as `abi.encode(address)` (32 bytes, left-padded).
// Iterate through registered owners to find this EOA's index, since the
// `SignatureWrapper` ABI requires it.
async function findOwnerIndex({
  walletAddress,
  eoa,
  publicClient,
}: {
  walletAddress: Address;
  eoa: Address;
  publicClient: PublicClient;
}): Promise<bigint> {
  const nextOwnerIndex = await publicClient.readContract({
    address: walletAddress,
    abi: COINBASE_SMART_WALLET_ABI,
    functionName: "nextOwnerIndex",
  });

  const eoaPaddedHex = pad(eoa, { size: 32 }).toLowerCase();

  for (let i = 0n; i < nextOwnerIndex; i++) {
    try {
      const ownerBytes = await publicClient.readContract({
        address: walletAddress,
        abi: COINBASE_SMART_WALLET_ABI,
        functionName: "ownerAtIndex",
        args: [i],
      });
      if (ownerBytes.toLowerCase() === eoaPaddedHex) {
        return i;
      }
    } catch {
      // Removed owner index — keep searching.
    }
  }
  throw new Error(
    `EOA ${eoa} is not a registered owner of this Coinbase Smart Wallet`
  );
}

async function wrapErc1271Signature({
  hash,
  walletAddress,
  chainId,
  eoa,
  walletClient,
  publicClient,
}: {
  hash: Hex;
  walletAddress: Address;
  chainId: number;
  eoa: Address;
  walletClient: any;
  publicClient: PublicClient;
}): Promise<Hex> {
  const ownerIndex = await findOwnerIndex({
    walletAddress,
    eoa,
    publicClient,
  });

  const eoaSig: Hex = await walletClient.signTypedData({
    account: eoa,
    domain: {
      name: CBSW_DOMAIN_NAME,
      version: CBSW_DOMAIN_VERSION,
      chainId,
      verifyingContract: walletAddress,
    },
    types: REPLAY_SAFE_TYPES,
    primaryType: "CoinbaseSmartWalletMessage",
    message: { hash },
  });

  // SignatureWrapper { uint256 ownerIndex; bytes signatureData; }
  return encodeAbiParameters(parseAbiParameters("(uint256, bytes)"), [
    [ownerIndex, eoaSig],
  ]);
}

export const coinbaseSmartWalletConfig: SmartWalletConfig = {
  emoji: "🔵",
  shortName: "Coinbase Smart Wallet",
  configHeading: "Coinbase Smart Wallet Address",
  description:
    "Connect your Coinbase Smart Wallet to any dapp via WalletConnect. Transactions will be executed through your Coinbase Smart Wallet.",

  localStorageKey: "coinbaseSmartWalletAddress",

  // Coinbase Smart Wallet uses CREATE2 with a per-EOA-set deterministic
  // address; the bytecode check during validation already rejects chains
  // where it isn't deployed yet.
  isChainSupported: () => true,
  getSupportedChainNames: () => [],

  checkOwner: async ({ walletAddress, eoa, publicClient }) => {
    const isOwner = await publicClient.readContract({
      address: walletAddress,
      abi: [
        {
          inputs: [{ internalType: "address", name: "", type: "address" }],
          name: "isOwnerAddress",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "isOwnerAddress",
      args: [eoa],
    });
    return {
      isOwner,
      error: isOwner
        ? undefined
        : "Connected EOA is not a registered owner. Note: passkey-only owners can't be used here.",
    };
  },
  ownerCheckErrorMessage:
    "Failed to verify Coinbase Smart Wallet owner - contract may not have isOwnerAddress() function",

  wrapTransaction: ({ walletAddress, to, value, data }) => {
    const executeData = encodeFunctionData({
      abi: COINBASE_SMART_WALLET_ABI,
      functionName: "execute",
      args: [to, value, data],
    });

    return {
      to: walletAddress,
      value: 0n,
      data: executeData,
    };
  },

  signPersonalMessage: async ({
    walletAddress,
    chainId,
    eoa,
    walletClient,
    publicClient,
    message,
  }) => {
    // Hex-encoded payloads (the WalletConnect convention) must be hashed
    // as raw bytes per EIP-191; plain strings are hashed as UTF-8.
    const hash = hashMessage(
      typeof message === "string" && message.startsWith("0x")
        ? { raw: message as Hex }
        : (message as string)
    );
    return wrapErc1271Signature({
      hash,
      walletAddress,
      chainId,
      eoa,
      walletClient,
      publicClient,
    });
  },

  signTypedData: async ({
    walletAddress,
    chainId,
    eoa,
    walletClient,
    publicClient,
    typedData,
  }) => {
    const hash = hashTypedData(typedData);
    return wrapErc1271Signature({
      hash,
      walletAddress,
      chainId,
      eoa,
      walletClient,
      publicClient,
    });
  },

  // Coinbase Smart Wallet ownership is per-chain (the contract may be deployed
  // at the same address on multiple chains, but each is a separate instance);
  // the EOA must actually be on the requested chain to relay.
  walletSwitchChainBehavior: "switch",

  ConfigFooter: () => (
    <HStack spacing={2}>
      <InfoIcon color="gray.500" />
      <Text>
        Transactions will be executed via your Coinbase Smart Wallet, with gas
        paid by your connected wallet
      </Text>
    </HStack>
  ),
};
