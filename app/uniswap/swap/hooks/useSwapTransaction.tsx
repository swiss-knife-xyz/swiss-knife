import { useState, useRef, useCallback, useEffect } from "react";
import { useToast, Link, HStack, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, Hex, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { SwapQuoteSnapshot } from "../lib/quoteState";
import { slippageToBasiPoints } from "../lib/utils";
import { buildSwapCalls } from "../lib/transactions";
import { getSwapChainConfig } from "../lib/utils";
import { Permit2Abi } from "../../lib/constants";

interface UseSwapTransactionParams {
  isChainSupported: boolean;
}

interface SwapParams {
  quote: SwapQuoteSnapshot;
  slippage: string;
}

export const useSwapTransaction = ({
  isChainSupported,
}: UseSwapTransactionParams) => {
  const { chain, address } = useAccount();
  const publicClient = usePublicClient();
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
      if (!isChainSupported || !chain?.id || !address || !publicClient) {
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
        const slippageBps = slippageToBasiPoints(swapParams.slippage);
        let erc20Allowance: bigint | undefined;
        let permit2Allowance:
          | { amount: bigint; expiration: number }
          | undefined;
        if (swapParams.quote.quoteParams.exactCurrency !== zeroAddress) {
          const chainConfig = getSwapChainConfig(chain.id);
          if (!chainConfig)
            throw new Error("Swap contracts are not configured.");
          const [tokenAllowance, permitAllowance] = await Promise.all([
            publicClient.readContract({
              address: swapParams.quote.quoteParams.exactCurrency,
              abi: erc20Abi,
              functionName: "allowance",
              args: [address, chainConfig.permit2],
            }),
            publicClient.readContract({
              address: chainConfig.permit2,
              abi: Permit2Abi,
              functionName: "allowance",
              args: [
                address,
                swapParams.quote.quoteParams.exactCurrency,
                chainConfig.universalRouter,
              ],
            }),
          ]);
          erc20Allowance = tokenAllowance;
          permit2Allowance = {
            amount: permitAllowance[0],
            expiration: permitAllowance[1],
          };
        }
        const calls = buildSwapCalls({
          quote: swapParams.quote,
          chainId: chain.id,
          sender: address,
          slippageBps,
          nowSeconds: Math.floor(Date.now() / 1000),
          erc20Allowance,
          permit2Allowance,
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
      publicClient,
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
