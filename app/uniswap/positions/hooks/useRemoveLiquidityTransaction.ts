import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";
import { useAccount, usePublicClient } from "wagmi";
import { Hex, Call } from "viem";
import {
  StateViewAbi,
  StateViewAddress,
  UniV4PositionManagerAddress,
} from "../../lib/constants";
import { PositionDetails } from "./usePositionDetails";
import { buildRemoveLiquidityCalldata } from "../lib/transactions";
import { getPoolId } from "../../add-liquidity/lib/utils";

interface UseRemoveLiquidityTransactionProps {
  isChainSupported: boolean;
}

export interface RemoveLiquidityOptions {
  slippageBps?: number;
  hookData?: Hex;
}

export const useRemoveLiquidityTransaction = ({
  isChainSupported,
}: UseRemoveLiquidityTransactionProps) => {
  const { chain } = useAccount();
  const publicClient = usePublicClient();
  const toast = useToast();

  const activeSendCallsIdRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handledSuccessIdRef = useRef<string | null>(null);
  const handledErrorIdRef = useRef<string | null>(null);

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
  }, []);

  const executeRemoveLiquidity = useCallback(
    async (
      positionDetails: PositionDetails,
      options: RemoveLiquidityOptions = {}
    ) => {
      if (!isChainSupported || !chain?.id || !publicClient) {
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

      const positionManagerAddress = UniV4PositionManagerAddress[chain.id];
      const stateViewAddress = StateViewAddress[chain.id];
      if (!positionManagerAddress || !stateViewAddress) {
        toast({
          title: "Position Manager not found",
          description: "Position Manager not deployed on this chain",
          status: "error",
          position: "bottom-right",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setLocalIsLoading(true);

      // Clear any existing state
      activeSendCallsIdRef.current = null;
      handledSuccessIdRef.current = null;
      handledErrorIdRef.current = null;
      clearAllTimeouts();
      setCurrentTxHash(undefined);
      setIsTransactionComplete(false);

      try {
        const [currentSqrtPriceX96, currentTick] =
          (await publicClient.readContract({
            address: stateViewAddress,
            abi: StateViewAbi,
            functionName: "getSlot0",
            args: [getPoolId(positionDetails.poolKey)],
          })) as readonly [bigint, number, number, number];

        // Calculate deadline (30 minutes from now)
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);

        const calls: Call[] = [
          {
            to: positionManagerAddress,
            data: buildRemoveLiquidityCalldata({
              tokenId: BigInt(positionDetails.tokenId),
              liquidity: BigInt(positionDetails.liquidity),
              poolKey: positionDetails.poolKey,
              tickLower: positionDetails.positionInfo.tickLower,
              tickUpper: positionDetails.positionInfo.tickUpper,
              currentSqrtPriceX96,
              currentTick,
              deadline,
              slippageBps: options.slippageBps,
              hookData: options.hookData,
            }),
            value: 0n,
          },
        ];

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
                    description:
                      "Your remove liquidity transaction is being processed",
                    status: "info",
                    position: "bottom-right",
                    duration: 3000,
                    isClosable: true,
                  });
                }, 500);

                resolve(data);
              },
              onError: (error) => {
                console.error("SendCalls error:", error);
                reject(error);
              },
            }
          );
        });
      } catch (error) {
        console.error("Remove liquidity error:", error);
        toast({
          title: "Transaction Failed",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
          status: "error",
          position: "bottom-right",
          duration: 5000,
          isClosable: true,
        });
        setLocalIsLoading(false);
      }
    },
    [
      isChainSupported,
      chain?.id,
      publicClient,
      sendCalls,
      toast,
      clearAllTimeouts,
    ]
  );

  // Handle transaction status updates outside render. Refs make the toast side
  // effects idempotent under React Strict Mode.
  useEffect(() => {
    const callsId = sendCallsData?.id;
    if (!callsId || callsId !== activeSendCallsIdRef.current) return;

    if (txHash && txHash !== currentTxHash) {
      setCurrentTxHash(txHash);
    }

    if (isCallsSuccess && handledSuccessIdRef.current !== callsId) {
      handledSuccessIdRef.current = callsId;
      setIsTransactionComplete(true);
      setLocalIsLoading(false);

      const explorerUrl = chain?.blockExplorers?.default?.url;
      toast({
        title: "Liquidity Removed Successfully!",
        description:
          txHash && explorerUrl
            ? `Your position has been closed. View transaction: ${explorerUrl}/tx/${txHash}`
            : "Your position has been closed.",
        status: "success",
        position: "bottom-right",
        duration: 8000,
        isClosable: true,
      });
    }

    if (
      (isCallsError || isSendCallsError) &&
      handledErrorIdRef.current !== callsId
    ) {
      handledErrorIdRef.current = callsId;
      setLocalIsLoading(false);
      toast({
        title: "Transaction Failed",
        description: "Failed to remove liquidity. Please try again.",
        status: "error",
        position: "bottom-right",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [
    chain?.blockExplorers?.default?.url,
    currentTxHash,
    isCallsError,
    isCallsSuccess,
    isSendCallsError,
    sendCallsData?.id,
    toast,
    txHash,
  ]);

  const isLoading = localIsLoading || isPending || isWaitingForCalls;

  return {
    executeRemoveLiquidity,
    isLoading,
    currentTxHash,
    isTransactionComplete,
  };
};
