"use client";
import { useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { Layout } from "@/components/Layout";
import { getPublicClient } from "@/lib/publicClient";
import { sendMockDeployment } from "@/lib/mockTokens";
import { MockTokenTool, type MockWallet } from "./MockTokenTool";

export function MockTokensPage() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { data: walletClient } = useWalletClient();
  const wallet: MockWallet = {
    account: hydrated ? address : undefined,
    chainId: hydrated ? chainId : undefined,
    switchChain: async (id) => {
      await switchChainAsync({ chainId: id });
    },
    submit: async (deployment, account) => {
      if (!walletClient) throw new Error("Connect a wallet first.");
      return sendMockDeployment(deployment, account, {
        getChainId: () => walletClient.getChainId(),
        getAddresses: () => walletClient.getAddresses(),
        sendTransaction: (request) => walletClient.sendTransaction(request),
      });
    },
    receipt: async (id, hash) => {
      const receipt = await getPublicClient(id, {
        timeout: 10_000,
      }).getTransactionReceipt({ hash });
      return {
        status: receipt.status,
        contractAddress: receipt.contractAddress ?? null,
      };
    },
  };
  return (
    <Layout minW={0}>
      <Box pb={8} minW={0}>
        <MockTokenTool wallet={wallet} walletControl={<ConnectButton />} />
      </Box>
    </Layout>
  );
}
