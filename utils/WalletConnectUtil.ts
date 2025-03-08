import { WalletKit, IWalletKit } from "@reown/walletkit";
import { Core } from "@walletconnect/core";

export let web3wallet: IWalletKit;

export async function createWeb3Wallet() {
  const core = new Core({
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  });
  web3wallet = await WalletKit.init({
    core,
    metadata: {
      name: "Swiss Knife Wallet",
      description: "Connect your mobile wallet to any desktop dapp.",
      url: "https://swiss-knife.xyz",
      icons: ["https://swiss-knife.xyz/icon.png"],
    },
  });
  (window as any).web3wallet = web3wallet;

  try {
    const clientId =
      await web3wallet.engine.signClient.core.crypto.getClientId();
    console.log("WalletConnect ClientID: ", clientId);
    localStorage.setItem("WALLETCONNECT_CLIENT_ID", clientId);
  } catch (error) {
    console.error(
      "Failed to set WalletConnect clientId in localStorage: ",
      error
    );
  }
}

export async function updateSignClientChainId(
  chainId: string,
  address: string
) {
  console.log("chainId", chainId, address);
  // get most recent session
  const sessions = web3wallet.getActiveSessions();
  if (!sessions) return;
  const namespace = chainId.split(":")[0];
  Object.values(sessions).forEach(async (session) => {
    await web3wallet.updateSession({
      topic: session.topic,
      namespaces: {
        ...session.namespaces,
        [namespace]: {
          ...session.namespaces[namespace],
          chains: [
            ...new Set(
              [chainId].concat(
                Array.from(session?.namespaces?.[namespace]?.chains || [])
              )
            ),
          ],
          accounts: [
            ...new Set(
              [`${chainId}:${address}`].concat(
                Array.from(session?.namespaces?.[namespace]?.accounts || [])
              )
            ),
          ],
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const chainChanged = {
      topic: session.topic,
      event: {
        name: "chainChanged",
        data: parseInt(chainId.split(":")[1]),
      },
      chainId: chainId,
    };

    const accountsChanged = {
      topic: session.topic,
      event: {
        name: "accountsChanged",
        data: [`${chainId}:${address}`],
      },
      chainId,
    };
    await web3wallet.emitSessionEvent(chainChanged);
    await web3wallet.emitSessionEvent(accountsChanged);
  });
}
