import { useState, useRef, useCallback, useEffect } from "react";
import { useToast, Link, HStack, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  Hex,
  Call,
  Address,
  zeroAddress,
  parseUnits,
  encodeFunctionData,
  erc20Abi,
} from "viem";
import { useAccount } from "wagmi";
import { QuoteExactInputParams } from "@/lib/uniswap/types";
import { getExactInputCalldata } from "@/lib/uniswap/universalRouter";
import {
  UniversalRouterAddress,
  Permit2Address,
  Permit2Abi,
  DEFAULT_SLIPPAGE_BPS,
} from "../lib/constants";
import { slippageToBasiPoints } from "../lib/utils";

interface UseSwapTransactionParams {
  isChainSupported: boolean;
}

interface SwapParams {
  quoteParams: QuoteExactInputParams;
  amountOut: bigint;
  slippage: string;
  fromCurrency: Address;
  toCurrency: Address;
  swapAmount: string;
  fromDecimals: number;
}

export const useSwapTransaction = ({
  isChainSupported,
}: UseSwapTransactionParams) => {
  const { chain, address } = useAccount();
  const toast = useToast();
  const queryClient = useQueryClient();

  const activeSendCallsIdRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<Hex | undefined>();
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);

  const {
    sendCalls,
    data: sendCallsData,
    isPending,
    isError: isSendCallsError,
  } = useSendCalls();

  const {
    data: waitForCallsStatusData,
    isLoading: isWaitingForCalls,
    isSuccess: isCallsSuccess,
    isError: isCallsError,
  } = useWaitForCallsStatus({ id: sendCallsData?.id });

  const receipts = waitForCallsStatusData?.receipts;

  // Get the transaction hash from receipts
  let txHash: Hex | undefined;
  if (receipts && receipts.length > 0) {
    txHash = receipts[receipts.length - 1].transactionHash;
  }

  // Helper function to clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  const executeSwap = useCallback(
    async (swapParams: SwapParams) => {
      if (!isChainSupported || !chain?.id || !address) {
        toast({
          title: "Chain not supported",
          description: "Please switch to a supported chain",
          status: "error",
          position: "bottom-right",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setLocalIsLoading(true);

      // IMMEDIATELY invalidate any previous transaction to prevent stale callbacks
      activeSendCallsIdRef.current = null;

      // Clear any existing timeouts from previous transactions
      clearAllTimeouts();

      setCurrentTxHash(undefined);
      setIsTransactionComplete(false);

      try {
        const calls: Call[] = [];
        const currentChainId = chain.id;

        // Calculate slippage
        const slippageBps =
          slippageToBasiPoints(swapParams.slippage) || DEFAULT_SLIPPAGE_BPS;
        const amountOutMin =
          (swapParams.amountOut * (10000n - BigInt(slippageBps))) / 10000n;

        // Generate swap calldata
        const swapCalldata = getExactInputCalldata({
          quoteParams: swapParams.quoteParams,
          amountOutMin,
          tokenOut: swapParams.toCurrency,
        });

        // If not ETH, add token approval
        if (swapParams.fromCurrency !== zeroAddress) {
          const amountIn = parseUnits(
            swapParams.swapAmount,
            swapParams.fromDecimals
          );

          // Approve token to Permit2
          calls.push({
            to: swapParams.fromCurrency,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [Permit2Address[currentChainId], amountIn],
            }),
          });

          // Approve Permit2 to UniversalRouter
          calls.push({
            to: Permit2Address[currentChainId],
            data: encodeFunctionData({
              abi: Permit2Abi,
              functionName: "approve",
              args: [
                swapParams.fromCurrency,
                UniversalRouterAddress[currentChainId],
                2n ** 160n - 1n, // maxUint160 as bigint
                Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration as number
              ],
            }),
          });
        }

        // Add swap call
        calls.push({
          to: UniversalRouterAddress[currentChainId],
          data: swapCalldata,
          value:
            swapParams.fromCurrency === zeroAddress
              ? parseUnits(swapParams.swapAmount, swapParams.fromDecimals)
              : undefined,
        });

        await new Promise((resolve, reject) => {
          sendCalls(
            { calls },
            {
              onSuccess: (data) => {
                activeSendCallsIdRef.current = data.id;
                setTimeout(() => {
                  toast({
                    id: data.id,
                    title: "Transaction Submitted",
                    description: "Swapping tokens",
                    status: "loading",
                    position: "bottom-right",
                    duration: null,
                    isClosable: true,
                  });
                }, 0);
                resolve(data);
              },
              onError: (error) => reject(error),
            }
          );
        });
        setLocalIsLoading(false);
      } catch (error) {
        console.error("Error in swap:", error);
        setTimeout(() => {
          toast({
            title: "Transaction Failed",
            description:
              error instanceof Error
                ? (error as any).shortMessage || error.message
                : "Failed to swap tokens",
            status: "error",
            position: "bottom-right",
            duration: 10000,
            isClosable: true,
          });
        }, 0);
        setLocalIsLoading(false);
      }
    },
    [
      sendCalls,
      toast,
      setLocalIsLoading,
      isChainSupported,
      clearAllTimeouts,
      chain?.id,
      address,
    ]
  );

  // Toast management effects (similar to add-liquidity hook)
  useEffect(() => {
    if (
      txHash &&
      !currentTxHash &&
      !isTransactionComplete &&
      sendCallsData?.id &&
      chain?.blockExplorers?.default?.url
    ) {
      setCurrentTxHash(txHash);

      setTimeout(() => {
        if (
          sendCallsData?.id &&
          currentTxHash === txHash &&
          !isTransactionComplete
        ) {
          const txUrl = chain?.blockExplorers?.default?.url
            ? `${chain.blockExplorers.default.url}/tx/${txHash}`
            : "";
          toast.update(sendCallsData.id, {
            title: "Transaction Submitted",
            description: (
              <Link href={txUrl} isExternal>
                <HStack>
                  <Text>View on explorer</Text>
                  <ExternalLinkIcon />
                </HStack>
              </Link>
            ),
            status: "loading",
            position: "bottom-right",
            duration: null,
            isClosable: true,
          });
        }
      }, 0);
    }
  }, [
    txHash,
    currentTxHash,
    isTransactionComplete,
    sendCallsData?.id,
    chain?.blockExplorers?.default?.url,
    toast,
  ]);

  // Handle success/error states
  useEffect(() => {
    if (
      !txHash ||
      !currentTxHash ||
      !sendCallsData?.id ||
      isTransactionComplete
    ) {
      return;
    }

    const effectInstanceToastId = sendCallsData.id;

    if (
      isCallsSuccess &&
      receipts &&
      receipts.every((receipt) => receipt.status === "success")
    ) {
      if (effectInstanceToastId === activeSendCallsIdRef.current) {
        setIsTransactionComplete(true);
        setCurrentTxHash(undefined);

        setTimeout(() => {
          if (effectInstanceToastId === activeSendCallsIdRef.current) {
            const txUrl = chain?.blockExplorers?.default?.url
              ? `${chain.blockExplorers.default.url}/tx/${txHash}`
              : "";

            toast.update(effectInstanceToastId, {
              title: "Swap Successful",
              description: (
                <Link href={txUrl} isExternal>
                  <HStack>
                    <Text>View on explorer</Text>
                    <ExternalLinkIcon />
                  </HStack>
                </Link>
              ),
              status: "success",
              position: "bottom-right",
              duration: 10000,
              isClosable: true,
            });

            queryClient.invalidateQueries({ queryKey: ["balance"] });
            queryClient.invalidateQueries({ queryKey: ["readContract"] });
          }
        }, 0);
      }
      return;
    }

    if (
      isCallsError ||
      (receipts && receipts.some((receipt) => receipt.status === "reverted"))
    ) {
      if (effectInstanceToastId === activeSendCallsIdRef.current) {
        setIsTransactionComplete(true);
        setCurrentTxHash(undefined);

        setTimeout(() => {
          if (effectInstanceToastId === activeSendCallsIdRef.current) {
            const txUrl = chain?.blockExplorers?.default?.url
              ? `${chain.blockExplorers.default.url}/tx/${txHash}`
              : "";

            toast.update(effectInstanceToastId, {
              title: "Swap Failed",
              description: (
                <Link href={txUrl} isExternal>
                  <HStack>
                    <Text>View on explorer</Text>
                    <ExternalLinkIcon />
                  </HStack>
                </Link>
              ),
              status: "error",
              position: "bottom-right",
              duration: 15000,
              isClosable: true,
            });
          }
        }, 0);
      }
      return;
    }

    if (isWaitingForCalls) {
      setTimeout(() => {
        if (
          !(
            isCallsSuccess &&
            receipts &&
            receipts.every((r) => r.status === "success")
          ) &&
          !(
            isCallsError ||
            (receipts && receipts.some((r) => r.status === "reverted"))
          ) &&
          currentTxHash === txHash &&
          effectInstanceToastId === activeSendCallsIdRef.current
        ) {
          const txUrl = chain?.blockExplorers?.default?.url
            ? `${chain.blockExplorers.default.url}/tx/${txHash}`
            : "";

          toast.update(effectInstanceToastId, {
            title: "Transaction Pending",
            description: (
              <Link href={txUrl} isExternal>
                <HStack>
                  <Text>View on explorer</Text>
                  <ExternalLinkIcon />
                </HStack>
              </Link>
            ),
            status: "loading",
            position: "bottom-right",
            duration: null,
            isClosable: true,
          });
        }
      }, 150);
      return;
    }
  }, [
    txHash,
    currentTxHash,
    sendCallsData?.id,
    isWaitingForCalls,
    isCallsSuccess,
    isCallsError,
    receipts,
    chain?.blockExplorers?.default?.url,
    isTransactionComplete,
    queryClient,
    toast,
  ]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    executeSwap,
    isLoading: localIsLoading || isPending || isWaitingForCalls,
    isTransactionComplete,
  };
};
