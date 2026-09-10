import { useState, useRef, useCallback, useEffect } from "react";
import { useToast, Link, HStack, Text } from "@chakra-ui/react";
import {
  useSendTransaction as useWagmiSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Hex, Call } from "viem";
import { useAccount } from "wagmi";
import { ExternalLinkIcon } from "@chakra-ui/icons";

interface UseSendTransactionProps {
  isChainSupported: boolean;
}

export const useSendTransaction = ({
  isChainSupported,
}: UseSendTransactionProps) => {
  const { chain } = useAccount();
  const toast = useToast();
  const queryClient = useQueryClient();

  const activeTransactionRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<Hex | undefined>();
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);

  const {
    sendTransaction,
    data: txHash,
    isPending,
    error: sendError,
  } = useWagmiSendTransaction();

  const {
    isLoading: isWaitingForTransaction,
    isSuccess: isTransactionSuccess,
    isError: isTransactionError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

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

  const executeSendTransaction = useCallback(
    async (call: Call) => {
      if (!isChainSupported) {
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
      activeTransactionRef.current = null;

      // Clear any existing timeouts from previous transactions
      clearAllTimeouts();

      setCurrentTxHash(undefined);
      setIsTransactionComplete(false);

      try {
        // Generate a unique transaction ID for this attempt
        const transactionId = `tx-${Date.now()}-${Math.random()}`;
        activeTransactionRef.current = transactionId;

        // For multiple calls, we'll send them as a single transaction
        // This is a simplified approach - you might need to use a multicall contract for multiple calls
        sendTransaction({
          to: call.to,
          data: call.data,
          value: call.value,
        });

        setLocalIsLoading(false);
      } catch (error) {
        console.error("Error in transaction:", error);
        setLocalIsLoading(false);
        activeTransactionRef.current = null;
      }
    },
    [
      sendTransaction,
      toast,
      setLocalIsLoading,
      isChainSupported,
      clearAllTimeouts,
    ]
  );

  // Show "Transaction Submitted" toast when we first get a txHash (wallet confirmed)
  useEffect(() => {
    if (
      txHash &&
      !currentTxHash &&
      !isTransactionComplete &&
      activeTransactionRef.current
    ) {
      setCurrentTxHash(txHash);

      // Create the initial "Transaction Submitted" toast now that wallet has confirmed
      const txUrl = chain?.blockExplorers?.default?.url
        ? `${chain.blockExplorers.default.url}/tx/${txHash}`
        : "";

      if (txUrl) {
        toast({
          id: activeTransactionRef.current,
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
      } else {
        toast({
          id: activeTransactionRef.current,
          title: "Transaction Submitted",
          description: "Initializing pool",
          status: "loading",
          position: "bottom-right",
          duration: null,
          isClosable: true,
        });
      }
    }
  }, [
    txHash,
    currentTxHash,
    isTransactionComplete,
    chain?.blockExplorers?.default?.url,
    toast,
  ]);

  // Handle error state when transaction fails before getting txHash (e.g., user rejection)
  useEffect(() => {
    if (
      sendError &&
      activeTransactionRef.current &&
      !txHash &&
      !isTransactionComplete
    ) {
      setIsTransactionComplete(true);

      const errorMessage =
        (sendError as any)?.shortMessage ||
        (sendError as any)?.message ||
        "Transaction failed";

      toast({
        title: "Transaction Failed",
        description: errorMessage,
        status: "error",
        position: "bottom-right",
        duration: 10000,
        isClosable: true,
      });

      activeTransactionRef.current = null;
    }
  }, [sendError, txHash, isTransactionComplete, toast]);

  // Handle toast notifications and state updates for pending, success, error
  useEffect(() => {
    if (
      !txHash ||
      !currentTxHash ||
      !activeTransactionRef.current ||
      isTransactionComplete
    ) {
      return;
    }

    const effectInstanceToastId = activeTransactionRef.current;

    // Check for final states first
    if (isTransactionSuccess) {
      // SUCCESS state detected
      if (effectInstanceToastId === activeTransactionRef.current) {
        setIsTransactionComplete(true);
        setCurrentTxHash(undefined);

        toastTimeoutRef.current = setTimeout(() => {
          if (effectInstanceToastId === activeTransactionRef.current) {
            const txUrl = chain?.blockExplorers?.default?.url
              ? `${chain.blockExplorers.default.url}/tx/${txHash}`
              : "";

            toast.update(effectInstanceToastId, {
              title: "Transaction Confirmed",
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

            // Invalidate balance queries to trigger refresh
            queryClient.invalidateQueries({ queryKey: ["balance"] });
            queryClient.invalidateQueries({ queryKey: ["readContract"] });
          }
          toastTimeoutRef.current = null;
        }, 0);
      }
      return;
    }

    if (isTransactionError || sendError) {
      // ERROR state detected
      if (effectInstanceToastId === activeTransactionRef.current) {
        setIsTransactionComplete(true);
        setCurrentTxHash(undefined);

        toastTimeoutRef.current = setTimeout(() => {
          if (effectInstanceToastId === activeTransactionRef.current) {
            const txUrl = chain?.blockExplorers?.default?.url
              ? `${chain.blockExplorers.default.url}/tx/${txHash}`
              : "";

            const errorMessage =
              (receiptError as any)?.message ||
              (sendError as any)?.message ||
              "Transaction failed";

            toast.update(effectInstanceToastId, {
              title: "Transaction Failed",
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
          toastTimeoutRef.current = null;
        }, 0);
      }
      return;
    }

    // PENDING state logic
    if (isWaitingForTransaction) {
      pendingTimeoutRef.current = setTimeout(() => {
        if (
          !isTransactionSuccess &&
          !isTransactionError &&
          currentTxHash === txHash &&
          effectInstanceToastId === activeTransactionRef.current
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
        pendingTimeoutRef.current = null;
      }, 150);
      return;
    }
  }, [
    txHash,
    currentTxHash,
    isWaitingForTransaction,
    isTransactionSuccess,
    isTransactionError,
    sendError,
    receiptError,
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
    executeSendTransaction,
    isLoading: localIsLoading || isPending || isWaitingForTransaction,
    isTransactionComplete,
  };
};
