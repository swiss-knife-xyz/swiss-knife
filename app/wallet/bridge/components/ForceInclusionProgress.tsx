import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Text,
  Tooltip,
  VStack,
  Link,
  Spinner,
} from "@chakra-ui/react";
import { CheckCircleIcon, RepeatIcon } from "@chakra-ui/icons";
import { chainIdToChain } from "@/data/common";

interface ForceInclusionProgressProps {
  isOpen: boolean;
  onClose: () => void;
  l1ChainId: number;
  l2ChainId: number;
  l1Hash?: string;
  l2Hash?: string;
  status:
    | "building"
    | "submitting"
    | "waiting-l1"
    | "waiting-l2"
    | "complete"
    | "error";
  error?: string;
  onReturnEarly?: () => void;
  onRetry?: () => void;
  elapsedTime?: number;
}

export default function ForceInclusionProgress({
  isOpen,
  onClose,
  l1ChainId,
  l2ChainId,
  l1Hash,
  l2Hash,
  status,
  error,
  onReturnEarly,
  onRetry,
  elapsedTime,
}: ForceInclusionProgressProps) {
  const l1Chain = chainIdToChain[l1ChainId];
  const l2Chain = chainIdToChain[l2ChainId];

  const steps = [
    { key: "building", label: "Building deposit transaction" },
    { key: "submitting", label: "Submitting to L1" },
    { key: "waiting-l1", label: "Waiting for L1 confirmation" },
    { key: "waiting-l2", label: "Waiting for L2 confirmation" },
    { key: "complete", label: "Complete" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === status);
  const progress =
    status === "error" ? 0 : ((currentStepIndex + 1) / steps.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getExplorerUrl = (chainId: number, hash: string) => {
    const chain = chainIdToChain[chainId];
    if (!chain?.blockExplorers?.default?.url) return null;
    return `${chain.blockExplorers.default.url}/tx/${hash}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size={{ base: "sm", md: "lg" }}
      closeOnOverlayClick={status === "complete" || status === "error"}
      closeOnEsc={status === "complete" || status === "error"}
    >
      <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
      <ModalContent bg="bg.900" color="white">
        <ModalHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
          Force Inclusion Progress
        </ModalHeader>
        {(status === "complete" || status === "error") && <ModalCloseButton />}

        <ModalBody py={6}>
          <VStack spacing={6} align="stretch">
            {/* Progress Bar */}
            <Box>
              <Progress
                value={progress}
                colorScheme={
                  status === "error"
                    ? "red"
                    : status === "complete"
                    ? "green"
                    : "blue"
                }
                size="sm"
                borderRadius="full"
                isIndeterminate={status !== "complete" && status !== "error"}
              />
            </Box>

            {/* Current Status */}
            {status === "error" ? (
              /* Error State - Combined Display */
              <Box
                p={4}
                bg="red.900"
                borderRadius="md"
                borderWidth={1}
                borderColor="red.500"
              >
                <VStack align="stretch" spacing={2}>
                  <HStack>
                    <Box color="red.300" fontSize="xl">
                      ⚠️
                    </Box>
                    <Text fontWeight="bold" fontSize="lg" color="white">
                      Error
                    </Text>
                  </HStack>
                  {error && (
                    <Text fontSize="sm" color="red.200" mt={2}>
                      {error}
                    </Text>
                  )}
                </VStack>
              </Box>
            ) : (
              /* Normal Status Display */
              <Box
                p={4}
                bg={status === "complete" ? "green.900" : "blue.900"}
                borderRadius="md"
                borderWidth={1}
                borderColor={status === "complete" ? "green.500" : "blue.500"}
              >
                <HStack>
                  {status === "complete" ? (
                    <CheckCircleIcon color="green.300" boxSize={5} />
                  ) : (
                    <Spinner size="md" color="blue.300" />
                  )}
                  <Text fontWeight="bold" fontSize="lg">
                    {status === "complete"
                      ? "Transaction Complete"
                      : steps.find((s) => s.key === status)?.label ||
                        "Processing..."}
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Transaction Hashes */}
            <VStack spacing={3} align="stretch">
              {l1Hash && (
                <Box p={3} bg="whiteAlpha.100" borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold" mb={1}>
                    L1 Transaction ({l1Chain?.name || `Chain ${l1ChainId}`}):
                  </Text>
                  <Link
                    href={getExplorerUrl(l1ChainId, l1Hash) || "#"}
                    isExternal
                    color="blue.300"
                    fontSize="sm"
                    wordBreak="break-all"
                  >
                    {l1Hash}
                  </Link>
                </Box>
              )}

              {l2Hash && (
                <Box p={3} bg="whiteAlpha.100" borderRadius="md">
                  <Text fontSize="sm" fontWeight="bold" mb={1}>
                    L2 Transaction ({l2Chain?.name || `Chain ${l2ChainId}`}):
                  </Text>
                  <Link
                    href={getExplorerUrl(l2ChainId, l2Hash) || "#"}
                    isExternal
                    color="blue.300"
                    fontSize="sm"
                    wordBreak="break-all"
                  >
                    {l2Hash}
                  </Link>
                </Box>
              )}
            </VStack>

            {/* Elapsed Time */}
            {elapsedTime !== undefined && status === "waiting-l2" && (
              <Box textAlign="center">
                <Text fontSize="sm" color="whiteAlpha.700">
                  Elapsed time: {formatTime(elapsedTime)}
                </Text>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  L2 confirmation can take up to 10 minutes
                </Text>
              </Box>
            )}

            {/* Steps List */}
            <VStack spacing={2} align="stretch">
              {steps.map((step, index) => {
                const isComplete = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isPending = index > currentStepIndex;

                // Show elapsed time for L2 confirmation step when complete
                const showElapsedTime =
                  step.key === "waiting-l2" &&
                  isComplete &&
                  elapsedTime !== undefined;

                // Show retry button for "submitting" step on error
                const showRetryButton =
                  step.key === "submitting" && status === "error" && onRetry;

                // Highlight text for submitting step on error
                const highlightText =
                  step.key === "submitting" && status === "error";

                return (
                  <HStack key={step.key} spacing={3} justify="space-between">
                    <HStack spacing={3}>
                      <Box
                        w={6}
                        h={6}
                        borderRadius="full"
                        bg={
                          isComplete
                            ? "green.500"
                            : isCurrent
                            ? "blue.500"
                            : "whiteAlpha.300"
                        }
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {isComplete ? (
                          <CheckCircleIcon color="white" boxSize={4} />
                        ) : (
                          <Text color="white" fontSize="xs" fontWeight="bold">
                            {index + 1}
                          </Text>
                        )}
                      </Box>
                      <Text
                        fontSize="sm"
                        color={
                          highlightText
                            ? "white"
                            : isPending
                            ? "whiteAlpha.500"
                            : "white"
                        }
                        fontWeight={
                          isCurrent || highlightText ? "bold" : "normal"
                        }
                      >
                        {step.label}
                        {showElapsedTime && (
                          <Text
                            as="span"
                            color="whiteAlpha.600"
                            fontWeight="normal"
                            ml={2}
                          >
                            ({formatTime(elapsedTime)})
                          </Text>
                        )}
                      </Text>
                    </HStack>
                    {showRetryButton && (
                      <Button
                        leftIcon={<RepeatIcon />}
                        size="xs"
                        colorScheme="blue"
                        onClick={onRetry}
                        autoFocus
                        fontSize="xs"
                      >
                        Retry
                      </Button>
                    )}
                  </HStack>
                );
              })}
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor="whiteAlpha.200">
          <Flex w="100%" justifyContent="space-between" gap={3}>
            {status === "waiting-l2" && onReturnEarly && (
              <Button
                colorScheme="orange"
                variant="outline"
                onClick={onReturnEarly}
                size="sm"
              >
                Return L2 Hash Now
              </Button>
            )}
            {(status === "complete" || status === "error") && (
              <Button
                colorScheme={status === "error" ? "red" : "blue"}
                onClick={onClose}
                ml="auto"
                size="sm"
              >
                Close
              </Button>
            )}
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
