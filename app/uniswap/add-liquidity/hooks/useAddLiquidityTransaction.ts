import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useSendCalls, useWaitForCallsStatus } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Hex, Call } from "viem";
import { useAccount } from "wagmi";

interface UseAddLiquidityTransactionProps {
  isChainSupported: boolean;
}

export const useAddLiquidityTransaction = ({
  isChainSupported,
}: UseAddLiquidityTransactionProps) => {
  const { chain } = useAccount();
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
    // get last tx hash. for 7702 supported wallets, this would be the only tx
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

  const executeSendCalls = useCallback(
    async (calls: Call[]) => {
      if (!isChainSupported) {
        toast({
          title: "Chain not supported",
          description: "Please switch to a supported chain",
          status: "error",
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
        await new Promise((resolve, reject) => {
          sendCalls(
            { calls },
            {
              onSuccess: (data) => {
                activeSendCallsIdRef.current = data.id; // Track active transaction
                // Show "Transaction Submitted" toast immediately when user approves

                setTimeout(() => {
                  toast({
                    id: data.id, // Use sendCalls ID initially
                    title: "Transaction Submitted",
                    description: "Adding liquidity to pool",
                    status: "loading",
                    duration: null, // Keep until we update it
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
        console.error("Error in add liquidity:", error);
        setTimeout(() => {
          toast({
            title: "Transaction Failed",
            description:
              error instanceof Error
                ? (error as any).shortMessage || error.message
                : "Failed to add liquidity",
            status: "error",
            duration: 10000,
            isClosable: true,
          });
        }, 0);
        // Only reset loading if we didn't get a transaction (user rejected or other error)
        setLocalIsLoading(false);
      }
    },
    [sendCalls, toast, setLocalIsLoading, isChainSupported, clearAllTimeouts]
  );

  // Set currentTxHash when we first get a txHash and add View action to toast
  useEffect(() => {
    // Only proceed if:
    // 1. We have the actual txHash from receipt.
    // 2. We haven't latched it into currentTxHash yet for this transaction's lifecycle.
    // 3. The overall transaction is not yet marked as complete.
    // 4. We have a valid sendCallsData.id for the toast.
    if (
      txHash &&
      !currentTxHash &&
      !isTransactionComplete &&
      sendCallsData?.id &&
      chain?.blockExplorers?.default?.url
    ) {
      setCurrentTxHash(txHash); // Latch the hash for the current transaction processing lifecycle

      // Schedule update to add "View" action
      setTimeout(() => {
        // At execution time, re-check all critical conditions:
        // - Toast ID must still be the same (sendCallsData.id).
        // - Latched currentTxHash (state) must match the txHash this effect instance was for.
        // - Transaction must not be complete.
        if (
          sendCallsData?.id &&
          currentTxHash === txHash && // Ensures we are acting on the correct, latched tx
          !isTransactionComplete // Crucial: stops update if tx concluded
        ) {
          const txUrl = chain?.blockExplorers?.default?.url
            ? `${chain.blockExplorers.default.url}/tx/${txHash}`
            : "";
          toast.update(sendCallsData.id, {
            title: "Transaction Submitted",
            description: `Adding liquidity to pool${
              txUrl ? `. View transaction: ${txUrl}` : ""
            }`,
            status: "loading",
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

  // Handle toast notifications and state updates for pending, success, error
  useEffect(() => {
    if (
      !txHash ||
      !currentTxHash ||
      !sendCallsData?.id ||
      isTransactionComplete
    ) {
      return;
    }

    const effectInstanceToastId = sendCallsData.id; // Capture for use in callbacks

    // Check for final states first
    if (
      isCallsSuccess &&
      receipts &&
      receipts.every((receipt) => receipt.status === "success")
    ) {
      // SUCCESS state detected from receipts
      if (effectInstanceToastId === activeSendCallsIdRef.current) {
        // This is still the active transaction, proceed with synchronous finalization steps
        setIsTransactionComplete(true); // Synchronously mark as complete
        setCurrentTxHash(undefined); // Synchronously clear currentTxHash to prevent re-processing by this effect

        toastTimeoutRef.current = setTimeout(() => {
          if (effectInstanceToastId === activeSendCallsIdRef.current) {
            const txUrl = chain?.blockExplorers?.default?.url
              ? `${chain.blockExplorers.default.url}/tx/${txHash}`
              : "";

            toast.update(effectInstanceToastId, {
              title: "Transaction Confirmed",
              description: `Successfully added liquidity${
                txUrl ? `. View transaction: ${txUrl}` : ""
              }`,
              status: "success",
              duration: 10000,
              isClosable: true,
            });

            // Invalidate balance queries to trigger refresh for the currency balances
            queryClient.invalidateQueries({ queryKey: ["balance"] });
            queryClient.invalidateQueries({ queryKey: ["readContract"] });
          }
          toastTimeoutRef.current = null;
        }, 0);
      }
      return; // Exit after handling success
    }

    if (
      isCallsError ||
      (receipts && receipts.some((receipt) => receipt.status === "reverted"))
    ) {
      // ERROR state detected from receipts or hook error
      if (effectInstanceToastId === activeSendCallsIdRef.current) {
        // This is still the active transaction, proceed with synchronous finalization steps
        setIsTransactionComplete(true); // Synchronously mark as complete
        setCurrentTxHash(undefined); // Synchronously clear currentTxHash

        toastTimeoutRef.current = setTimeout(() => {
          if (effectInstanceToastId === activeSendCallsIdRef.current) {
            const txUrl = chain?.blockExplorers?.default?.url
              ? `${chain.blockExplorers.default.url}/tx/${txHash}`
              : "";

            toast.update(effectInstanceToastId, {
              title: "Transaction Failed",
              description: `Failed to add liquidity. Please try again${
                txUrl ? `. View transaction: ${txUrl}` : ""
              }`,
              status: "error",
              duration: 15000,
              isClosable: true,
            });
          }
          toastTimeoutRef.current = null;
        }, 0);
      }
      return; // Exit after handling error
    }

    // PENDING state logic
    if (isWaitingForCalls) {
      pendingTimeoutRef.current = setTimeout(() => {
        // Ensure not already success/error AND still the active transaction
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
          currentTxHash === txHash && // Ensure we're acting on the hash this effect instance saw
          effectInstanceToastId === activeSendCallsIdRef.current
        ) {
          const txUrl = chain?.blockExplorers?.default?.url
            ? `${chain.blockExplorers.default.url}/tx/${txHash}`
            : "";

          toast.update(effectInstanceToastId, {
            title: "Transaction Pending",
            description: `Adding liquidity to pool${
              txUrl ? `. View transaction: ${txUrl}` : ""
            }`,
            status: "loading",
            duration: null,
            isClosable: true,
          });
        }
        pendingTimeoutRef.current = null;
      }, 150);
      return; // Exit after scheduling pending update
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
    executeSendCalls,
    isLoading: localIsLoading || isPending || isWaitingForCalls,
    isTransactionComplete,
  };
};
