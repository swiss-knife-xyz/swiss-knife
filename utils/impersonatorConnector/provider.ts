import { Provider, RpcRequest } from "ox";
import {
  type Address,
  type Hex,
  getAddress,
  numberToHex,
  fromHex,
  createPublicClient,
  http,
  isAddress,
  type PublicClient,
} from "viem";
import type { Chain } from "@wagmi/core/chains";

export const IMPERSONATOR_ADDRESS_KEY = "impersonatorConnector.address";
export const IMPERSONATOR_ENS_KEY = "impersonatorConnector.ens";
export const IMPERSONATOR_LAST_USED_ADDRESS_KEY =
  "impersonatorConnector.lastUsedAddress";
export const IMPERSONATOR_LAST_USED_ENS_KEY =
  "impersonatorConnector.lastUsedEns";

export function getStoredImpersonatorAddress(): Address | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = localStorage.getItem(IMPERSONATOR_ADDRESS_KEY);
  try {
    return stored && isAddress(stored) ? getAddress(stored) : undefined;
  } catch {
    return undefined;
  }
}

export function getStoredImpersonatorENS(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = localStorage.getItem(IMPERSONATOR_ENS_KEY);
  return stored || undefined;
}

export function setStoredImpersonatorAddress(
  address: Address | null,
  ensName?: string | null
): void {
  if (typeof window === "undefined") return;
  if (address && isAddress(address)) {
    localStorage.setItem(IMPERSONATOR_ADDRESS_KEY, getAddress(address));
    if (ensName) {
      localStorage.setItem(IMPERSONATOR_ENS_KEY, ensName);
    } else {
      localStorage.removeItem(IMPERSONATOR_ENS_KEY);
    }
  } else {
    localStorage.removeItem(IMPERSONATOR_ADDRESS_KEY);
    localStorage.removeItem(IMPERSONATOR_ENS_KEY);
  }
}

export function getLastUsedImpersonatorAddress(): Address | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = localStorage.getItem(IMPERSONATOR_LAST_USED_ADDRESS_KEY);
  try {
    return stored && isAddress(stored) ? getAddress(stored) : undefined;
  } catch {
    return undefined;
  }
}

export function getLastUsedImpersonatorENS(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = localStorage.getItem(IMPERSONATOR_LAST_USED_ENS_KEY);
  return stored || undefined;
}

export function setLastUsedImpersonatorAddress(
  address: Address | null,
  ensName?: string | null
): void {
  if (typeof window === "undefined") return;
  if (address && isAddress(address)) {
    localStorage.setItem(
      IMPERSONATOR_LAST_USED_ADDRESS_KEY,
      getAddress(address)
    );
    if (ensName) {
      localStorage.setItem(IMPERSONATOR_LAST_USED_ENS_KEY, ensName);
    } else {
      localStorage.removeItem(IMPERSONATOR_LAST_USED_ENS_KEY);
    }
  } else {
    localStorage.removeItem(IMPERSONATOR_LAST_USED_ADDRESS_KEY);
    localStorage.removeItem(IMPERSONATOR_LAST_USED_ENS_KEY);
  }
}

export type ImpersonatorProviderDependencies = {
  chains: readonly Chain[];
  emitter: ReturnType<typeof Provider.createEmitter>;
  getImpersonatedAddress: () => Address | undefined;
  getCurrentChainId: () => number;
};

export function createImpersonatorEip1193Provider({
  chains,
  emitter,
  getImpersonatedAddress,
  getCurrentChainId,
}: ImpersonatorProviderDependencies) {
  const publicClientCache: { [chainId: number]: PublicClient } = {};

  function getPublicClientForChain(chainId: number): PublicClient | null {
    if (publicClientCache[chainId]) {
      return publicClientCache[chainId];
    }

    const chain = chains.find((c) => c.id === chainId);
    if (!chain) {
      console.error(
        `[ImpersonatorProvider] Chain with id ${chainId} not found in config.`
      );
      return null;
    }

    const rpcUrl = chain.rpcUrls.default?.http[0];
    if (!rpcUrl) {
      console.error(
        `[ImpersonatorProvider] No RPC URL found for chain ${chainId}.`
      );
      return null;
    }

    try {
      const client = createPublicClient({ chain, transport: http(rpcUrl) });
      publicClientCache[chainId] = client;
      return client;
    } catch (e) {
      console.error(
        `[ImpersonatorProvider] Failed to create public client for chain ${chainId}:`,
        e
      );
      return null;
    }
  }

  const provider = Provider.from({
    ...emitter,
    async request(args: { method: string; params?: unknown }) {
      const { method } = args;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = args.params as any[] | undefined;
      const impersonatedAddress = getImpersonatedAddress();
      const currentChainId = getCurrentChainId();

      if (method === "eth_requestAccounts" || method === "eth_accounts") {
        return impersonatedAddress ? [impersonatedAddress] : [];
      }

      if (method === "eth_chainId") {
        return numberToHex(currentChainId as number);
      }

      const DUMMY_TX_HASH = `0x${"0".repeat(64)}` as Hex;
      const DUMMY_SIGNATURE = `0x${"1".repeat(130)}` as Hex; // 65 bytes
      const DUMMY_SIGNATURE_EIP712 = `0x${"2".repeat(130)}` as Hex;

      if (method === "eth_sendTransaction") {
        if (!impersonatedAddress)
          throw new Provider.UserRejectedRequestError(
            new Error("No impersonated address set.")
          );
        console.warn(
          `[ImpersonatorProvider] ${method} called for ${impersonatedAddress}. Returning dummy hash. Transaction will NOT be sent.`
        );
        return DUMMY_TX_HASH;
      }

      if (method === "personal_sign" || method === "eth_sign") {
        if (!impersonatedAddress)
          throw new Provider.UserRejectedRequestError(
            new Error("No impersonated address set.")
          );
        console.warn(
          `[ImpersonatorProvider] ${method} called for ${impersonatedAddress}. Returning dummy signature.`
        );
        return DUMMY_SIGNATURE;
      }

      if (
        method === "eth_signTypedData" ||
        method === "eth_signTypedData_v3" ||
        method === "eth_signTypedData_v4"
      ) {
        if (!impersonatedAddress)
          throw new Provider.UserRejectedRequestError(
            new Error("No impersonated address set.")
          );
        console.warn(
          `[ImpersonatorProvider] ${method} called for ${impersonatedAddress}. Returning dummy signature.`
        );
        return DUMMY_SIGNATURE_EIP712;
      }

      if (method === "wallet_addEthereumChain") {
        const newChain = params?.[0];
        if (newChain?.chainId) {
          const newChainIdNum = fromHex(newChain.chainId as Hex, "number");
          if (chains.find((c) => c.id === newChainIdNum)) {
            console.warn(
              `[ImpersonatorProvider] ${method} called for chain ID ${newChainIdNum}. Chain already configured.`
            );
            return null;
          }
        }
        console.warn(
          `[ImpersonatorProvider] ${method} called. DApp trying to add a chain. This connector only supports chains pre-configured in Wagmi.`
        );
        throw new Provider.ProviderRpcError(
          4902,
          "ImpersonatorProvider: Adding new chains via 'wallet_addEthereumChain' is not supported. Configure chains in Wagmi setup."
        );
      }

      if (method === "wallet_switchEthereumChain") {
        const newChainIdHex = params?.[0]?.chainId;
        if (!newChainIdHex)
          throw new Provider.ProviderRpcError(
            -32602,
            "chainId is required for wallet_switchEthereumChain"
          );

        const targetChainId = fromHex(newChainIdHex as Hex, "number");
        if (!chains.find((c) => c.id === targetChainId)) {
          throw new Provider.ProviderRpcError(
            4902,
            `Chain with id ${targetChainId} not configured.`
          );
        }
        if (targetChainId === currentChainId) return null;

        console.log(
          `[ImpersonatorProvider] ${method} to ${targetChainId} requested and validated.`
        );
        return null;
      }

      const client = getPublicClientForChain(currentChainId);
      if (!client) {
        throw new Provider.ProviderRpcError(
          4901,
          `[ImpersonatorProvider] Not connected to a valid chain (currentChainId: ${currentChainId}).`
        );
      }

      try {
        // @ts-expect-error - Viem's request is strictly typed based on method and ox Provider.from handles this.
        const result = await client.request({ method, params });
        return result;
      } catch (error: any) {
        console.error(
          `[ImpersonatorProvider] Error forwarding RPC request '${method}':`,
          error
        );
        const code =
          error.code ||
          (error instanceof Provider.ProviderRpcError
            ? (error as any).code
            : null) ||
          -32000;
        const message =
          error.shortMessage ||
          error.message ||
          "Error forwarding RPC request.";
        throw new Provider.ProviderRpcError(code, message);
      }
    },
  });

  return provider;
}
