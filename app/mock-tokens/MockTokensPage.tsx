"use client";
import { Box } from "@chakra-ui/react";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { Layout } from "@/components/Layout";
import { getPublicClient } from "@/lib/publicClient";
import { estimateMockDeployment, sendReviewedMock } from "@/lib/mockTokens";
import { MockTokenTool, type MockWallet } from "./MockTokenTool";

export function MockTokensPage() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const wallet: MockWallet = {
    account: address,
    chainId,
    estimate: async (deployment, account) => {
      try {
        return await estimateMockDeployment(
          deployment,
          account,
          getPublicClient(deployment.chain.id, { timeout: 10_000 })
        );
      } catch {
        throw new Error(
          "Could not estimate gas on the selected network. Check native gas balance and RPC availability. Nothing was submitted."
        );
      }
    },
    submit: async (deployment, estimate, account) => {
      if (!walletClient) throw new Error("Connect a wallet first.");
      return sendReviewedMock(deployment, estimate, account, {
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
      <Box mb={5} maxW="850px" mx="auto">
        <ConnectButton />
      </Box>
      <Box pb={8} minW={0}>
        <MockTokenTool wallet={wallet} />
      </Box>
    </Layout>
  );
}
