import sdk from "@farcaster/frame-sdk";
import { SwitchChainError, fromHex, getAddress, numberToHex } from "viem";
import { ChainNotConfiguredError, createConnector } from "wagmi";

frameConnector.type = "frameConnector" as const;

export function frameConnector() {
  let connected = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createConnector<any>((config) => ({
    id: "farcaster",
    name: "Farcaster Wallet",
    type: frameConnector.type,

    async setup() {
      // Only attempt to connect if we're in a frame context
      const provider = await this.getProvider();
      if (provider) {
        this.connect({ chainId: config.chains[0].id });
      }
    },
    // @ts-expect-error - wagmi connector type mismatch with withCapabilities generic
    async connect({ chainId } = {}) {
      try {
        const provider = await this.getProvider() as typeof sdk.wallet.ethProvider | undefined;
        if (!provider) {
          connected = false;
          return { accounts: [] as readonly `0x${string}`[], chainId: chainId || config.chains[0].id };
        }

        const accounts = await provider.request({
          method: "eth_requestAccounts",
        });

        let currentChainId = await this.getChainId();
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain!({ chainId });
          currentChainId = chain.id;
        }

        connected = true;

        return {
          accounts: accounts.map((x: string) => getAddress(x)) as readonly `0x${string}`[],
          chainId: currentChainId,
        };
      } catch (error) {
        connected = false;
        console.error("Error connecting to Frame:", error);
        return { accounts: [] as readonly `0x${string}`[], chainId: chainId || config.chains[0].id };
      }
    },
    async disconnect() {
      connected = false;
    },
    async getAccounts() {
      if (!connected) return [];
      const provider = await this.getProvider() as typeof sdk.wallet.ethProvider | undefined;
      if (!provider) return [];
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      return accounts.map((x: string) => getAddress(x));
    },
    async getChainId() {
      const provider = await this.getProvider() as typeof sdk.wallet.ethProvider | undefined;
      if (!provider) return config.chains[0].id;
      const hexChainId = await provider.request({ method: "eth_chainId" });
      return fromHex(hexChainId, "number");
    },
    async isAuthorized() {
      if (!connected) {
        return false;
      }

      const accounts = await this.getAccounts();
      return !!accounts.length;
    },
    async switchChain({ chainId }: { chainId: number }) {
      const provider = await this.getProvider() as typeof sdk.wallet.ethProvider | undefined;
      const chain = config.chains.find((x: { id: number }) => x.id === chainId);
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

      if (provider) {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: numberToHex(chainId) }],
        });
      }
      return chain;
    },
    onAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) this.onDisconnect();
      else
        config.emitter.emit("change", {
          accounts: accounts.map((x: string) => getAddress(x)),
        });
    },
    onChainChanged(chain) {
      const chainId = Number(chain);
      config.emitter.emit("change", { chainId });
    },
    async onDisconnect() {
      config.emitter.emit("disconnect");
      connected = false;
    },
    async getProvider() {
      return sdk.wallet.ethProvider;
    },
  }));
}
