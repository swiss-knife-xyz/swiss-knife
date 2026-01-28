import { useState, useRef, useCallback } from "react";
import { useToast } from "@chakra-ui/react";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";
import { useAccount } from "wagmi";
import { Hex, Call, encodeAbiParameters, encodeFunctionData } from "viem";
import {
  UniV4PositionManagerAddress,
  V4PMActions,
  DecreaseLiquidityParamsAbi,
  SettlePairParamsAbi,
  TakePairParamsAbi,
  UniV4PositionManagerAbi as PositionManagerAbi,
} from "../../lib/constants";
import { PositionDetails } from "./usePositionDetails";

interface UseRemoveLiquidityTransactionProps {
  isChainSupported: boolean;
}

export const useRemoveLiquidityTransaction = ({
  isChainSupported,
}: UseRemoveLiquidityTransactionProps) => {
  const { chain } = useAccount();
  const toast = useToast();

  const activeSendCallsIdRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    async (positionDetails: PositionDetails) => {
      if (!isChainSupported || !chain?.id) {
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
      if (!positionManagerAddress) {
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
      clearAllTimeouts();
      setCurrentTxHash(undefined);
      setIsTransactionComplete(false);

      try {
        // Encode the decrease liquidity parameters
        const decreaseLiquidityParams = encodeAbiParameters(
          DecreaseLiquidityParamsAbi,
          [
            BigInt(positionDetails.tokenId),
            BigInt(positionDetails.liquidity), // Remove 100% of liquidity
            0n, // amount0Min - set to 0 for simplicity (can be improved)
            0n, // amount1Min - set to 0 for simplicity (can be improved)
            "0x", // empty hookData
          ]
        );

        // Encode settle pair parameters
        const settlePairParams = encodeAbiParameters(SettlePairParamsAbi, [
          positionDetails.poolKey.currency0,
          positionDetails.poolKey.currency1,
        ]);

        // Encode take pair parameters (recipient is the user)
        const takePairParams = encodeAbiParameters(TakePairParamsAbi, [
          positionDetails.poolKey.currency0,
          positionDetails.poolKey.currency1,
          "0x0000000000000000000000000000000000000001", // Use address(1) as placeholder for current user
        ]);

        // Build the actions sequence
        const actions =
          V4PMActions.DECREASE_LIQUIDITY +
          V4PMActions.SETTLE_PAIR +
          V4PMActions.TAKE_PAIR;

        // Build the params for modifyLiquidities
        const unlockData = encodeAbiParameters(
          [
            { type: "bytes", name: "actions" },
            { type: "bytes[]", name: "params" },
          ],
          [
            `0x${actions}`,
            [decreaseLiquidityParams, settlePairParams, takePairParams],
          ]
        );

        // Calculate deadline (30 minutes from now)
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);

        const calls: Call[] = [
          {
            to: positionManagerAddress,
            data: encodeFunctionData({
              abi: PositionManagerAbi,
              functionName: "modifyLiquidities",
              args: [unlockData, deadline],
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
    [isChainSupported, chain?.id, sendCalls, toast, clearAllTimeouts]
  );

  // Handle transaction status updates
  if (sendCallsData?.id === activeSendCallsIdRef.current) {
    if (txHash && txHash !== currentTxHash) {
      setCurrentTxHash(txHash);
    }

    if (isCallsSuccess && !isTransactionComplete) {
      setIsTransactionComplete(true);
      setLocalIsLoading(false);

      toast({
        title: "Liquidity Removed Successfully!",
        description: txHash
          ? `Your position has been closed. View transaction: https://basescan.org/tx/${txHash}`
          : "Your position has been closed.",
        status: "success",
        position: "bottom-right",
        duration: 8000,
        isClosable: true,
      });
    }

    if ((isCallsError || isSendCallsError) && localIsLoading) {
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
  }

  const isLoading = localIsLoading || isPending || isWaitingForCalls;

  return {
    executeRemoveLiquidity,
    isLoading,
    currentTxHash,
    isTransactionComplete,
  };
};
