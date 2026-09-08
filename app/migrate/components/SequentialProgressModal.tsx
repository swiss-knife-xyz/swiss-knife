"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  HStack,
  VStack,
  Text,
  Box,
  Progress,
  Image,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { Check, X, AlertTriangle, Wallet, Clock } from "lucide-react";
import { Hex, formatUnits } from "viem";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { formatUsdCompact } from "../lib/format";
import {
  ExecutionPlan,
  PreparedTransfer,
} from "../hooks/useMigrateExecution";
import { tokenKey } from "../lib/portfolioApi";
import { buildTransferCall } from "../lib/buildTransferCall";

type RowStatus = "queued" | "wallet" | "mining" | "done" | "failed" | "skipped";

interface Row {
  transfer: PreparedTransfer;
  status: RowStatus;
  txHash?: Hex;
  error?: string;
}

interface SequentialProgressModalProps {
  plan: ExecutionPlan;
  onClose: (didMigrateAnything: boolean) => void;
}

export function SequentialProgressModal({
  plan,
  onClose,
}: SequentialProgressModalProps) {
  const [rows, setRows] = useState<Row[]>(
    plan.transfers.map((t) => ({ transfer: t, status: "queued" }))
  );
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [hasMigratedAnything, setHasMigratedAnything] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Ref to mark we're intentionally pausing/skipping so stale receipt callbacks don't override state.
  const activeIdxRef = useRef<number>(0);

  const {
    sendTransaction,
    data: currentHash,
    error: sendError,
    isPending: isWalletPending,
    reset: resetSend,
  } = useSendTransaction();

  const {
    isSuccess: isReceiptSuccess,
    isError: isReceiptError,
    error: receiptError,
    data: receiptData,
  } = useWaitForTransactionReceipt({
    hash: currentHash,
    query: { enabled: !!currentHash },
  });

  const allTerminal = rows.every(
    (r) => r.status === "done" || r.status === "skipped" || r.status === "failed"
  );
  const totalDone = rows.filter((r) => r.status === "done").length;
  const progressValue =
    rows.length === 0 ? 0 : Math.round((totalDone / rows.length) * 100);

  const sendRow = useCallback(
    (idx: number) => {
      const row = rows[idx];
      if (!row) return;
      activeIdxRef.current = idx;
      setRows((curr) => {
        const next = curr.slice();
        next[idx] = { ...next[idx], status: "wallet", error: undefined };
        return next;
      });
      resetSend();
      const call = buildTransferCall(
        row.transfer.token,
        plan.receiver,
        row.transfer.amountWei
      );
      sendTransaction({
        to: call.to,
        data: call.data,
        value: call.value,
        chainId: plan.chainId,
      });
    },
    [rows, plan, sendTransaction, resetSend]
  );

  // Kick off the first row on mount. Deferred with setTimeout(0) so the
  // mutate call lands AFTER React strict-mode's synchronous effect double-
  // invoke — running it inline strands the underlying TanStack-Query
  // mutation in `pending` forever (TanStack/query#8512). The didStartRef
  // guard prevents the second effect run from queueing a duplicate; we
  // deliberately skip clearTimeout cleanup so strict-mode's pseudo-unmount
  // doesn't cancel the only queued task.
  const didStartRef = useRef(false);
  useEffect(() => {
    if (didStartRef.current) return;
    didStartRef.current = true;
    if (rows.length === 0) return;
    setTimeout(() => sendRow(0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transition wallet → mining when we first see a hash for the active row.
  useEffect(() => {
    if (!currentHash) return;
    const idx = activeIdxRef.current;
    setRows((curr) => {
      if (curr[idx]?.status !== "wallet") return curr;
      const next = curr.slice();
      next[idx] = { ...next[idx], status: "mining", txHash: currentHash };
      return next;
    });
  }, [currentHash]);

  // Handle send-level errors (e.g., wallet rejection before broadcast).
  useEffect(() => {
    if (!sendError) return;
    const idx = activeIdxRef.current;
    setRows((curr) => {
      if (curr[idx]?.status === "done" || curr[idx]?.status === "skipped")
        return curr;
      const next = curr.slice();
      next[idx] = {
        ...next[idx],
        status: "failed",
        error:
          (sendError as any)?.shortMessage ||
          sendError.message ||
          "Wallet rejected the request",
      };
      return next;
    });
  }, [sendError]);

  // Handle receipt outcomes and auto-advance.
  useEffect(() => {
    if (!currentHash) return;
    const idx = activeIdxRef.current;
    if (isReceiptSuccess && receiptData) {
      if (receiptData.status === "reverted") {
        setRows((curr) => {
          const next = curr.slice();
          next[idx] = {
            ...next[idx],
            status: "failed",
            error:
              "Transaction reverted on-chain. The token contract may be blocking transfers.",
          };
          return next;
        });
        return;
      }
      // Success
      setHasMigratedAnything(true);
      setRows((curr) => {
        const next = curr.slice();
        next[idx] = { ...next[idx], status: "done" };
        return next;
      });
      const nextIdx = idx + 1;
      if (nextIdx < rows.length) {
        setCurrentIdx(nextIdx);
        setTimeout(() => sendRow(nextIdx), 50);
      }
    } else if (isReceiptError) {
      setRows((curr) => {
        const next = curr.slice();
        next[idx] = {
          ...next[idx],
          status: "failed",
          error:
            (receiptError as any)?.shortMessage ||
            receiptError?.message ||
            "Failed to confirm",
        };
        return next;
      });
    }
  }, [
    isReceiptSuccess,
    isReceiptError,
    receiptData,
    receiptError,
    currentHash,
    rows.length,
    sendRow,
  ]);

  const handleRetry = () => sendRow(currentIdx);

  const handleSkip = () => {
    setRows((curr) => {
      const next = curr.slice();
      next[currentIdx] = { ...next[currentIdx], status: "skipped" };
      return next;
    });
    const nextIdx = currentIdx + 1;
    if (nextIdx < rows.length) {
      setCurrentIdx(nextIdx);
      setTimeout(() => sendRow(nextIdx), 50);
    }
  };

  const handleRequestClose = () => {
    if (allTerminal) {
      onClose(hasMigratedAnything);
      return;
    }
    setConfirmClose(true);
  };

  const handleConfirmClose = () => {
    setConfirmClose(false);
    onClose(hasMigratedAnything);
  };

  return (
    <>
      <Modal
        isOpen
        onClose={handleRequestClose}
        closeOnOverlayClick={allTerminal}
        isCentered
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg="bg.muted" color="white" borderRadius="lg">
          <ModalHeader>Migrating {rows.length} tokens · one by one</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="wider">
                    PROGRESS
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    {totalDone} / {rows.length} done
                  </Text>
                </HStack>
                <Progress
                  value={progressValue}
                  size="sm"
                  colorScheme="blue"
                  bg="whiteAlpha.100"
                  borderRadius="full"
                />
              </Box>

              <Box
                bg="whiteAlpha.50"
                borderRadius="md"
                border="1px solid"
                borderColor="whiteAlpha.200"
                maxH="320px"
                overflowY="auto"
              >
                <VStack align="stretch" spacing={0}>
                  {rows.map((r, i) => {
                    const t = r.transfer.token;
                    const isActive = i === currentIdx && !allTerminal;
                    const amountFormatted = formatUnits(
                      r.transfer.amountWei,
                      t.decimals
                    );
                    const amountShort = amountFormatted.includes(".")
                      ? amountFormatted.replace(/\.?0+$/, "")
                      : amountFormatted;
                    const amountNum = Number(amountFormatted);
                    const usd =
                      t.priceUsd > 0 && Number.isFinite(amountNum)
                        ? formatUsdCompact(amountNum * t.priceUsd)
                        : null;
                    return (
                      <Box
                        key={tokenKey(t)}
                        px={3}
                        py={2.5}
                        borderBottom={
                          i < rows.length - 1 ? "1px solid" : undefined
                        }
                        borderColor="whiteAlpha.100"
                        bg={isActive ? "whiteAlpha.100" : "transparent"}
                      >
                        <HStack spacing={3}>
                          {t.logoUrl ? (
                            <Image
                              src={t.logoUrl}
                              alt={t.symbol}
                              boxSize="24px"
                              borderRadius="full"
                              fallbackSrc="/icon.png"
                            />
                          ) : (
                            <Box
                              boxSize="24px"
                              borderRadius="full"
                              bg="whiteAlpha.200"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Text fontSize="2xs" color="whiteAlpha.700">
                                ?
                              </Text>
                            </Box>
                          )}
                          <Text fontSize="sm" color="white" flex={1}>
                            {t.symbol.toUpperCase()}
                          </Text>
                          <VStack
                            spacing={0}
                            align="flex-end"
                            minW="0"
                            flexShrink={0}
                          >
                            <Text
                              fontSize="sm"
                              color="white"
                              fontFamily="mono"
                              sx={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {amountShort}
                            </Text>
                            {usd && (
                              <Text fontSize="xs" color="whiteAlpha.600">
                                {usd}
                              </Text>
                            )}
                          </VStack>
                          <StatusBadge status={r.status} />
                          {r.status === "failed" && i === currentIdx && (
                            <HStack spacing={1}>
                              <Button
                                size="xs"
                                colorScheme="blue"
                                bg="primary.500"
                                _hover={{ bg: "primary.600" }}
                                onClick={handleRetry}
                              >
                                Retry
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                borderColor="whiteAlpha.300"
                                color="whiteAlpha.800"
                                _hover={{ bg: "whiteAlpha.100" }}
                                onClick={handleSkip}
                              >
                                Skip
                              </Button>
                            </HStack>
                          )}
                        </HStack>
                        {r.status === "failed" && r.error && (
                          <Text
                            fontSize="xs"
                            color="#F87171"
                            mt={1}
                            ml="36px"
                            noOfLines={2}
                          >
                            {r.error}
                          </Text>
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            {allTerminal ? (
              <Button
                colorScheme="blue"
                bg="primary.500"
                _hover={{ bg: "primary.600" }}
                onClick={handleConfirmClose}
              >
                Close
              </Button>
            ) : (
              <Text fontSize="xs" color="whiteAlpha.600">
                {isWalletPending
                  ? "Confirm the request in your wallet…"
                  : "Waiting for on-chain confirmation…"}
              </Text>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={confirmClose}
        leastDestructiveRef={cancelRef as any}
        onClose={() => setConfirmClose(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="bg.muted" color="white">
            <AlertDialogHeader>Stop migration?</AlertDialogHeader>
            <AlertDialogBody>
              {totalDone} of {rows.length} tokens have transferred. The
              remaining tokens won't be sent.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={() => setConfirmClose(false)}
                variant="ghost"
                _hover={{ bg: "whiteAlpha.100" }}
              >
                Keep going
              </Button>
              <Button
                ml={3}
                bg="#F87171"
                color="white"
                _hover={{ bg: "#EF4444" }}
                onClick={handleConfirmClose}
              >
                Stop
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  switch (status) {
    case "queued":
      return (
        <Text fontSize="2xs" color="whiteAlpha.600" letterSpacing="wider">
          QUEUED
        </Text>
      );
    case "wallet":
      return (
        <HStack spacing={1}>
          <Wallet size={12} color="var(--chakra-colors-primary-400)" />
          <Text fontSize="2xs" color="primary.400" letterSpacing="wider">
            WALLET
          </Text>
        </HStack>
      );
    case "mining":
      return (
        <HStack spacing={1}>
          <Spinner size="xs" color="primary.400" speed="0.6s" />
          <Text fontSize="2xs" color="primary.400" letterSpacing="wider">
            MINING
          </Text>
        </HStack>
      );
    case "done":
      return (
        <HStack spacing={1}>
          <Check size={14} color="#4ADE80" />
          <Text fontSize="2xs" color="#4ADE80" letterSpacing="wider">
            DONE
          </Text>
        </HStack>
      );
    case "failed":
      return (
        <HStack spacing={1}>
          <AlertTriangle size={12} color="#F87171" />
          <Text fontSize="2xs" color="#F87171" letterSpacing="wider">
            FAILED
          </Text>
        </HStack>
      );
    case "skipped":
      return (
        <HStack spacing={1}>
          <X size={14} color="#A1A1AA" />
          <Text fontSize="2xs" color="whiteAlpha.600" letterSpacing="wider">
            SKIPPED
          </Text>
        </HStack>
      );
  }
}
