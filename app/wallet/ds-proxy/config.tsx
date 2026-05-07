import { HStack, Link, Text } from "@chakra-ui/react";
import { arbitrum, base, baseSepolia, mainnet, optimism } from "viem/chains";
import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  parseAbiParameters,
} from "viem";
import { chainIdToChain } from "@/data/common";
import type { SmartWalletConfig } from "../_smart-wallet-connect/types";
import { DS_PROXY_ABI } from "./abi/DSProxy";
import { EXECUTE_CALL_ABI } from "./abi/ExecuteCall";

const EXECUTOR_ADDRESSES: Record<number, Address> = {
  [mainnet.id]: "0x538eda025a8be6ff8fc1fe6050ba3aafb7620608",
  [arbitrum.id]: "0x15e98867e2df679445e4bb90f108ad2928d14397",
  [base.id]: "0x232c43c354dbebb75c1ed0d9a3fddde5d630e335",
  [baseSepolia.id]: "0x0D7A8Be0d74d3B98cc86c99e27b340697336C1f4",
  [optimism.id]: "0xfd5ac928aac40d490bcf1a83038d58aa90ea39a7",
};

export const dsProxyConfig: SmartWalletConfig = {
  emoji: "🛡️",
  shortName: "DSProxy",
  configHeading: "DSProxy Address",
  description:
    "Connect your DSProxy contract to any dapp via WalletConnect. Transactions will be executed through your DSProxy.",

  localStorageKey: "dsProxyAddress",

  isChainSupported: (chainId) => !!EXECUTOR_ADDRESSES[chainId],
  getSupportedChainNames: () =>
    Object.keys(EXECUTOR_ADDRESSES).map((chainIdStr) => {
      const chainId = parseInt(chainIdStr);
      const chain = chainIdToChain[chainId];
      return chain ? chain.name : `Chain ${chainId}`;
    }),

  checkOwner: async ({ walletAddress, eoa, publicClient }) => {
    const owner = await publicClient.readContract({
      address: walletAddress,
      abi: [
        {
          inputs: [],
          name: "owner",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "owner",
    });
    return { isOwner: owner?.toLowerCase() === eoa.toLowerCase() };
  },
  ownerCheckErrorMessage:
    "Failed to verify DSProxy owner - contract may not have owner() function",

  wrapTransaction: ({ walletAddress, chainId, to, value, data }) => {
    const executorAddress = EXECUTOR_ADDRESSES[chainId];

    // Encode struct Params {to, value, data} for executeActionDirect.
    const encodedParams = encodeAbiParameters(
      parseAbiParameters("(address,uint256,bytes)"),
      [[to, value, data]]
    );

    const executeActionDirectData = encodeFunctionData({
      abi: EXECUTE_CALL_ABI,
      functionName: "executeActionDirect",
      args: [encodedParams],
    });

    const dsProxyExecuteData = encodeFunctionData({
      abi: DS_PROXY_ABI,
      functionName: "execute",
      args: [executorAddress, executeActionDirectData],
    });

    return {
      to: walletAddress,
      value: 0n,
      data: dsProxyExecuteData,
    };
  },

  // DSProxy execution is per-chain via the DSProxy contract on that chain;
  // we don't need to actually switch the EOA's chain to relay.
  walletSwitchChainBehavior: "ack",
  ackChainSwitchToast: {
    title: "Chain switch handled by DSProxy",
    description: (chainId) => `DSProxy will execute on chain ${chainId}`,
  },

  ConfigFooter: ({ chainId }) => {
    const executorAddress = EXECUTOR_ADDRESSES[chainId];
    return (
      <>
        <HStack spacing={2}>
          <Text>Transactions will be executed via {"DeFiSaver's "}</Text>
          <Link
            href="https://github.com/defisaver/defisaver-v3-contracts/blob/main/contracts/actions/utils/ExecuteCall.sol"
            isExternal
            textDecoration="underline"
            display="inline"
          >
            ExecuteCall contract
          </Link>
        </HStack>

        {executorAddress && (
          <HStack spacing={2} fontSize="xs">
            <Text>Executor address:</Text>
            <Link
              fontFamily="mono"
              color="blue.300"
              isExternal
              href={`${chainIdToChain[chainId].blockExplorers?.default.url}/address/${executorAddress}`}
            >
              {executorAddress}
            </Link>
          </HStack>
        )}
      </>
    );
  },
};
