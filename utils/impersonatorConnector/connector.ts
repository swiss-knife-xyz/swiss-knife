import { ChainNotConfiguredError, createConnector } from "@wagmi/core";
import {
  type Address,
  SwitchChainError,
  UserRejectedRequestError,
  getAddress,
  isAddress,
  zeroAddress,
} from "viem";
import type { Chain } from "@wagmi/core/chains";
import { Provider } from "ox";
import {
  createImpersonatorEip1193Provider,
  getStoredImpersonatorAddress,
  setStoredImpersonatorAddress,
  IMPERSONATOR_ADDRESS_KEY,
} from "./provider";

export const impersonatorConnectorId = "xyz.impersonator.connector" as const;
export const impersonatorConnectorName = "Impersonator" as const;

interface WagmiStoredState {
  chainId?: number;
}

export type ImpersonatorParameters = {
  /**
   * A function that opens a modal for the user to input an Ethereum address.
   * Should resolve with the address if provided, or null/undefined if cancelled.
   */
  openModal: () => Promise<Address | undefined | null>;
  /** Icon URL to display for the connector */
  icon?: string;
  /** Optional, initial address to use if none is in localStorage. */
  initialAddress?: Address;
};

// Define a more specific EIP-1193 provider type
interface TypedEip1193Provider extends Provider.Provider {
  on(
    event: "accountsChanged",
    listener: (accounts: readonly Address[]) => void
  ): this;
  on(event: "chainChanged", listener: (chainId: string) => void): this;
  on(event: "disconnect", listener: (error?: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this; // Fallback for other events

  removeListener(
    event: "accountsChanged",
    listener: (accounts: readonly Address[]) => void
  ): this;
  removeListener(
    event: "chainChanged",
    listener: (chainId: string) => void
  ): this;
  removeListener(event: "disconnect", listener: (error?: Error) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this; // Fallback for other events
}

// Use Provider.Provider type from ox
type ImpersonatorEip1193Provider = TypedEip1193Provider;

// Define a more specific type for the properties passed to the connector function
type ImpersonatorConnectorProps = {}; // Currently no extra props, but can be extended

// Type for the config object passed by createConnector - Let TypeScript infer this for now.
// type ConnectorConfig = Parameters<CreateConnectorFn<ImpersonatorEip1193Provider, ImpersonatorConnectorProps>>[0];

export function impersonator(parameters: ImpersonatorParameters) {
  const { openModal, icon, initialAddress } = parameters;

  let providerInstance: ImpersonatorEip1193Provider | undefined;
  let currentImpersonatedAddress: Address | undefined =
    getStoredImpersonatorAddress();
  let currentChainId: number | undefined;

  return createConnector<
    ImpersonatorEip1193Provider,
    ImpersonatorConnectorProps
  >((config) => ({
    id: impersonatorConnectorId,
    name: impersonatorConnectorName,
    type: impersonatorConnectorId,
    icon:
      icon ||
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MTgiIGhlaWdodD0iNDE4Ij48cGF0aCBmaWxsPSIjRkZGIiBkPSJtMTc1IDI5IDEgMSA1IDEgMyAxaDJ2MmgzbDkgNWM3IDQgMTkgMyAyNyAxbDgtNmg0di0yaDJsMy0xaDNsMy0yYzktMSAxNiAwIDI0IDRsMyAxYzMgMSAzIDIgNSA1bDMgMiA0IDhoMmMzIDMgNCA4IDYgMTJsMyAzIDIgNHYyYzIgNCAyIDYgMiAxMGgybDQgMTBhNDE1IDQxNSAwIDAgMCA1IDE4djJsMiAxdjJsMSA0djVoMmwxIDEzIDMtMS0xIDhoMmwxIDRoM2wzIDFoNGw4IDNhMTAyNDkyNTQ1NDQzMTI3IDEwMjQ5MjU0NTQ0MzEyNyAwIDAgMSAyMiA4bDEgMmgydjJoMnYyaDNsMyAxIDEgMiAyIDFjNCAyIDYgNSA4IDl2NGgybDEgMTAtMSAzLTIgNi0yIDNjLTIgNC00IDYtOCA5aC0zbC0xIDItMSAyaC0zdjJsLTExIDN2MmwtOCAzLTEwIDNoLTN2MTlsNCAzdjNoNmwxIDJoMmwxIDMgNCAzIDcgNXYzaDJjMyAxIDQgMyA2IDZ2Mmw3IDMgMSA2aDJsMiAxIDEgM2gyYTI5NzQgMjk3NCAwIDAgMSA0IDl2OGwtMTIgN3YybC05IDV2MmMtMyAzLTYgNC0xMCA0djJjLTQgNC03IDYtMTIgN3YyYy0yIDMtMyAzLTYgNGgtM3YyaC0ydjJoLTN2MmwtNSAxdjRsMSAydjJsMiAxIDIgMXYyaDJsMyA0YzEgMyAxIDMgNCA1djhsLTMgMS0yIDRhNDgyNDMgNDgyNDMgMCAwIDEtMjQwIDFjLTQgMC02LTEtMTAtMy0yLTMtMy00LTItOHYtNGw1LTF2LTJsMi01aDJsMS0yIDUtOC02LTN2LTJsLTMtMWE0OTkgNDk5IDAgMCAxLTgtNXYtMmgtM3YtM2gtM2MtNC0xLTYtMy05LTZ2LTJsLTMtMS02LTN2LTJsLTMtMS0zLTItNC0ydi0ybC00LTJ2LTJoLTNsLTUtM3YtOGMwLTIgMS0zIDMtNWwyLTMgMy00di0zaDJsMi0xIDEtMyA1LTMgMS0zIDQtNCA4LTcgNi0zIDEtM2MxLTMgMy0zIDYtNCA0LTIgNi00IDgtN3YtMThoLTNjLTctMS0xNC00LTIwLTdsLTktNWMtMy0xLTMtMi01LTVoLTJsLTYtNHYtMmgtMmwtMi02aC0ybC0xLTExdi0ybDEtOWgzdi0zbDMtNSA1LTIgMS0yYzMtMyA1LTMgOC00bDEtMyAyIDF2LTJsMy0xIDktMiAyLTEgMy0zIDUtMWg0di0ybDE0LTIgMS00aDJ2LTZoMmwtMS02IDMtMXYtM2wzLTE4IDEtNGgybDEtM3YtNGwxLTIgMy0xMmgydi0ybDQtMTIgMS00IDEtMmgydi0ybDQtNiAxLTRoMmwxLTRoM3YtMmMxLTQgMy01IDYtN2w0LTRjOS01IDE3LTYgMjctNVptLTU2IDExM2MtMSA2LTEgMTIgMiAxOGw0IDMgMi0xIDEgMiA5IDIgNCAyIDYgM2gzbDMgMWgyYTI0MSAyNDEgMCAwIDAgMjAgM2w4IDFoMmE0NjcgNDY3IDAgMCAwIDU3LTFjNCAxIDQgMSA3LTFsNi0xaDRhMjg4NTUgMjg4NTUgMCAwIDEgMTgtMmwxLTNoMmwxMC0yIDMtMSA1LTMgMS0yIDQgMSAxLTE4aC00djJoLTNsLTQgMWgtM2wtMyAxLTEgMi0xIDItNSAxaC02bC03IDEtMSAyaC0xMHYyYTI0MDMzIDI0MDMzIDAgMCAxLTg5LTF2LTFoLTNsLTE4LTMtOC0xdi0yaC01di0ybC0xMC0zdi0yaC00Wm0tMTUgOTJ2MTNoMmw2IDEyaDJsMSA0aDJsNyAyIDIgNWgybDEgNiAyIDVoMmwxIDQgNiAxNSAzIDUgMSAzIDMgNiAzIDQgMSAzaDJsMSA3aDNsMSAzaDJsMSA2IDQgMXYyaDJsMSA1aDJsMSAzIDIgMWMzIDEgNSA0IDcgNmw1IDMgMSAyaDN2Mmg0bDMgMWgybDEgMmE1OSA1OSAwIDAgMCAxNyAxbDExLTIgMy0xIDMtMSA0LTEgMi0xIDEtNCAzLTEgNy01IDQtNWMzLTIgMy0yIDQtNmgydi0yaDJsNC0xMGgzbDEtNWgybDEtN2gyYzQtNCA1LTcgNS0xMmgybDEtMyAzLTYgMS02aDJsMS0ydi0zbDEtMyAzLTNjMi00IDMtOSAzLTE0aDl2LTJoMmM0LTMgNi02IDctMTB2LTNoMmMyLTUgMi05IDItMTRoLTZsLTEgMS00IDFoLTlsLTMgMWgtMmwtMyAxLTEgNHY0aC0xbC0xIDZoLTF2NWwtMiAxLTIgNy0xIDItNSAyLTMgMnYyaC0ydjJsLTcgMXYyaC0xMWMtMTMgMC0xMyAwLTE5LTNoLTN2LTJoLTN2LTJoLTN2LTJsLTItMmMtMi0yLTItMi0yLTVsLTItMi0yLTZoLTJ2LTEwaC05djlsLTMgMS0yIDEzLTYgMnYyaC0ybC0xIDFjLTYgNi0xNiA2LTI0IDYtMTEgMC0xMSAwLTE0LTNoLTR2LTJoLTJ2LTJsLTctMy0xLTVoLTJsLTEtOC0yIDEtMi04aC0ybDEtMTFoLTVhMjc2NDYgMjc2NDYgMCAwIDEtMTItMWwtMy0xLTMtMWgtNlptMTg1IDYgMSA0Wm0tMTQ4IDYzIDEgMloiLz48cGF0aCBmaWxsPSIjRkZGIiBkPSJNMTgwIDE1OGg2M3YxaC02M3YtMVoiLz48L3N2Zz4=",

    async connect(options: { chainId?: number } = {}) {
      const { chainId: requestedChainId } = options;
      try {
        let anAddress = getStoredImpersonatorAddress();

        if (!anAddress && initialAddress && isAddress(initialAddress)) {
          anAddress = getAddress(initialAddress);
          setStoredImpersonatorAddress(anAddress);
        }

        if (!anAddress) {
          try {
            // Now open our modal for the actual address input
            const inputAddress = await openModal();
            if (!inputAddress || !isAddress(inputAddress)) {
              // If user cancels, disconnect properly and ensure RainbowKit knows about it
              currentImpersonatedAddress = undefined;
              setStoredImpersonatorAddress(null);
              config.emitter.emit("disconnect");
              config.emitter.emit("change", {
                accounts: [],
                chainId: currentChainId,
              });
              throw new UserRejectedRequestError(
                new Error("User rejected or provided invalid address.")
              );
            }
            anAddress = getAddress(inputAddress);
            // Note: setStoredImpersonatorAddress is called by the modal with ENS name
          } catch (error) {
            // Ensure we clean up state and notify RainbowKit
            currentImpersonatedAddress = undefined;
            setStoredImpersonatorAddress(null);
            config.emitter.emit("disconnect");
            config.emitter.emit("change", {
              accounts: [],
              chainId: currentChainId,
            });
            throw error;
          }
        }

        currentImpersonatedAddress = anAddress;

        // Set up chain ID if not already set
        if (!currentChainId) {
          currentChainId = requestedChainId || config.chains[0]?.id;
          if (!currentChainId) throw new Error("No chain found for connector.");
        }

        // Get provider and set up listeners
        const eip1193Provider =
          (await this.getProvider()) as TypedEip1193Provider;

        // Remove any existing listeners first
        eip1193Provider.removeListener(
          "accountsChanged",
          this.onAccountsChanged.bind(this) as any
        );
        eip1193Provider.removeListener(
          "chainChanged",
          this.onChainChanged.bind(this)
        );
        eip1193Provider.removeListener(
          "disconnect",
          this.onDisconnect.bind(this)
        );

        // Add listeners
        eip1193Provider.on(
          "accountsChanged",
          this.onAccountsChanged.bind(this) as any
        );
        eip1193Provider.on("chainChanged", this.onChainChanged.bind(this));
        eip1193Provider.on("disconnect", this.onDisconnect.bind(this));

        // Emit change event AFTER everything is set up
        config.emitter.emit("change", {
          accounts: [currentImpersonatedAddress] as any,
          chainId: currentChainId,
        });

        return {
          accounts: [currentImpersonatedAddress],
          chainId: currentChainId,
        };
      } catch (error) {
        if (error instanceof UserRejectedRequestError) throw error;
        console.error("[ImpersonatorConnector] Connection failed", error);
        throw new Error("Failed to connect impersonator");
      }
    },

    async disconnect() {
      // Clear both current and stored address
      currentImpersonatedAddress = undefined;
      setStoredImpersonatorAddress(null);

      config.emitter.emit("disconnect");
    },

    async getAccounts() {
      if (!currentImpersonatedAddress) {
        const stored = getStoredImpersonatorAddress();
        if (stored) currentImpersonatedAddress = stored;
        else return [] as readonly Address[];
      }
      return [currentImpersonatedAddress] as readonly Address[];
    },

    async getChainId() {
      if (currentChainId === undefined) {
        const storedState = (await config.storage?.getItem(
          "state"
        )) as WagmiStoredState | null;
        if (
          storedState?.chainId &&
          config.chains.some((c: Chain) => c.id === storedState.chainId)
        ) {
          currentChainId = storedState.chainId;
        } else {
          currentChainId = config.chains[0]?.id;
        }
      }
      if (currentChainId === undefined)
        throw new Error("Chain ID not resolved");
      return currentChainId;
    },

    async getProvider(): Promise<ImpersonatorEip1193Provider> {
      if (!providerInstance) {
        const emitter = Provider.createEmitter();

        providerInstance = createImpersonatorEip1193Provider({
          chains: config.chains,
          emitter: emitter,
          getImpersonatedAddress: () => currentImpersonatedAddress,
          getCurrentChainId: () => currentChainId ?? config.chains[0]?.id ?? 1,
        }) as ImpersonatorEip1193Provider;
      }
      return providerInstance;
    },

    async isAuthorized() {
      const addr = currentImpersonatedAddress || getStoredImpersonatorAddress();
      return !!addr;
    },

    async switchChain({ chainId }: { chainId: number }) {
      const chain = config.chains.find((x: Chain) => x.id === chainId);
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

      currentChainId = chainId;

      config.emitter.emit("change", {
        chainId,
        accounts: currentImpersonatedAddress
          ? ([currentImpersonatedAddress] as any)
          : undefined,
      });

      return chain;
    },

    onAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) {
        config.emitter.emit("disconnect");
        currentImpersonatedAddress = undefined;
        setStoredImpersonatorAddress(null);
      } else {
        const newAddress = getAddress(accounts[0]);
        currentImpersonatedAddress = newAddress;
        // Note: setStoredImpersonatorAddress is called by the modal with ENS name
        config.emitter.emit("change", {
          accounts: [newAddress] as any,
          chainId: currentChainId,
        });
      }
    },

    onChainChanged(chainIdHex: string | number) {
      const newChainId = Number(chainIdHex);
      currentChainId = newChainId;
      config.emitter.emit("change", {
        chainId: newChainId,
        accounts: currentImpersonatedAddress
          ? ([currentImpersonatedAddress] as any)
          : undefined,
      });
    },

    onDisconnect(error?: Error) {
      if (error)
        console.error(
          "[ImpersonatorConnector] Disconnected with error:",
          error
        );
    },

    async openImpersonatorSettings() {
      if (!config) throw new Error("Connector not ready");
      const inputAddress = await openModal();
      if (inputAddress && isAddress(inputAddress)) {
        const newAddress = getAddress(inputAddress);

        // Update internal state
        currentImpersonatedAddress = newAddress;
        // Note: setStoredImpersonatorAddress is called by the modal with ENS name

        // Reconnect to ensure all state is properly updated
        await this.connect({ chainId: currentChainId });

        return newAddress;
      }
      return currentImpersonatedAddress;
    },
  }));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === IMPERSONATOR_ADDRESS_KEY) {
      const newValue = event.newValue;
      if (newValue && isAddress(newValue)) {
        const newAddress = getAddress(newValue);
        console.log(
          "[ImpersonatorConnector] Impersonated address changed in another tab to:",
          newAddress
        );
      } else if (!newValue) {
        console.log(
          "[ImpersonatorConnector] Impersonated address cleared in another tab."
        );
      }
    }
  });
}
