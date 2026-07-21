"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Spacer,
  Spinner,
  Stack,
  Switch,
  Text,
  Tooltip,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  AlertTriangle,
  Ban,
  Gauge,
  RefreshCw,
  RotateCw,
  Search,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import {
  type Address,
  type Hash,
  type Hex,
  formatEther,
  formatGwei,
  isAddress,
  isHash,
  parseEther,
  parseGwei,
} from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CopyToClipboard } from "@/components/CopyToClipboard";

type Mode = "cancel" | "speed-up";
type FeeMode = "eip1559" | "legacy";

type LoadedTransaction = {
  hash: Hash;
  from: Address;
  to: Address | null;
  nonce: number;
  gas: bigint;
  input: Hex;
  value: bigint;
  blockHash: Hash | null;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  type?: string;
};

const DEFAULT_GAS_LIMIT = "21000";
const ZERO_DATA = "0x" as Hex;

const bumpFee = (fee?: bigint) => {
  if (!fee || fee <= 0n) return undefined;
  return (fee * 125n + 99n) / 100n;
};

const maxFee = (...fees: Array<bigint | undefined>) => {
  return fees.reduce<bigint | undefined>((max, fee) => {
    if (!fee || fee <= 0n) return max;
    if (!max || fee > max) return fee;
    return max;
  }, undefined);
};

const formatGweiInput = (fee?: bigint) => {
  if (!fee || fee <= 0n) return "";
  const formatted = formatGwei(fee);
  if (!formatted.includes(".")) return formatted;
  return formatted.replace(/(\.\d{0,9})\d+$/, "$1").replace(/\.?0+$/, "");
};

const shortenHash = (value: string) =>
  value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;

const parsePositiveGwei = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Enter ${label}.`);

  const parsed = parseGwei(trimmed);
  if (parsed <= 0n) throw new Error(`${label} must be greater than zero.`);
  return parsed;
};

const parseNonce = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error("Enter a valid nonce.");
  return Number(trimmed);
};

const parseGasLimit = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) throw new Error("Enter a valid gas limit.");

  const parsed = BigInt(trimmed);
  if (parsed < 21_000n) throw new Error("Gas limit must be at least 21000.");
  return parsed;
};

const parseHexData = (value: string): Hex => {
  const trimmed = value.trim();
  if (!trimmed) return ZERO_DATA;
  if (!/^0x([0-9a-fA-F]{2})*$/.test(trimmed)) {
    throw new Error("Data must be 0x-prefixed hex with an even length.");
  }
  return trimmed as Hex;
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong.";
};

function ReplaceTxContent() {
  const toast = useToast();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [modeParam, setModeParam] = useQueryState(
    "mode",
    parseAsString.withDefault("speed-up").withOptions({ shallow: true })
  );
  const mode: Mode = modeParam === "speed-up" ? "speed-up" : "cancel";
  const setMode = (nextMode: Mode) => setModeParam(nextMode);
  const [txHash, setTxHash] = useQueryState<string>(
    "tx",
    parseAsString.withDefault("").withOptions({ shallow: true })
  );

  const [loadedTx, setLoadedTx] = useState<LoadedTransaction | null>(null);
  const [txLookupError, setTxLookupError] = useState("");
  const [isFetchingTx, setIsFetchingTx] = useState(false);
  const [isRefreshingFees, setIsRefreshingFees] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replacementHash, setReplacementHash] = useState<Hash | null>(null);
  const [useManualPayload, setUseManualPayload] = useState(false);

  const [nonce, setNonce] = useState("");
  const [gasLimit, setGasLimit] = useState(DEFAULT_GAS_LIMIT);
  const [manualTo, setManualTo] = useState("");
  const [manualValue, setManualValue] = useState("0");
  const [manualData, setManualData] = useState("0x");

  const [feeMode, setFeeMode] = useState<FeeMode>("eip1559");
  const [maxFeePerGas, setMaxFeePerGas] = useState("");
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState("");
  const [gasPrice, setGasPrice] = useState("");

  const lastLoadedHashRef = useRef("");

  const explorerBase = chain?.blockExplorers?.default?.url;
  const isLoadedTxConfirmed = Boolean(loadedTx?.blockHash);
  const senderMismatch =
    Boolean(loadedTx && address) &&
    loadedTx?.from.toLowerCase() !== address?.toLowerCase();

  const replacementUrl =
    replacementHash && explorerBase
      ? `${explorerBase}/tx/${replacementHash}`
      : "";

  const loadDefaultNonce = useCallback(async () => {
    if (!publicClient || !address) return;

    try {
      const nextConfirmedNonce = await publicClient.getTransactionCount({
        address,
        blockTag: "latest",
      });
      setNonce(String(nextConfirmedNonce));
    } catch (error) {
      toast({
        title: "Could not load nonce",
        description: toErrorMessage(error),
        status: "error",
        position: "bottom-right",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [address, publicClient, toast]);

  const refreshFees = useCallback(
    async (transaction?: LoadedTransaction | null) => {
      if (!publicClient) return;

      setIsRefreshingFees(true);

      try {
        const [estimatedFeesResult, gasPriceResult] = await Promise.allSettled([
          publicClient.estimateFeesPerGas(),
          publicClient.getGasPrice(),
        ]);

        const estimatedFees =
          estimatedFeesResult.status === "fulfilled"
            ? estimatedFeesResult.value
            : undefined;
        const networkGasPrice =
          gasPriceResult.status === "fulfilled"
            ? gasPriceResult.value
            : undefined;

        const originalMaxFee = transaction?.maxFeePerGas;
        const originalPriorityFee = transaction?.maxPriorityFeePerGas;
        const originalGasPrice = transaction?.gasPrice;
        const preferLegacy = Boolean(
          transaction && !originalMaxFee && originalGasPrice
        );

        if (preferLegacy) {
          setFeeMode("legacy");
          setGasPrice(
            formatGweiInput(maxFee(bumpFee(originalGasPrice), networkGasPrice))
          );
          return;
        }

        if (estimatedFees?.maxFeePerGas || originalMaxFee) {
          setFeeMode("eip1559");
          setMaxFeePerGas(
            formatGweiInput(
              maxFee(
                bumpFee(originalMaxFee ?? originalGasPrice),
                estimatedFees?.maxFeePerGas,
                networkGasPrice
              )
            )
          );
          setMaxPriorityFeePerGas(
            formatGweiInput(
              maxFee(
                bumpFee(originalPriorityFee),
                estimatedFees?.maxPriorityFeePerGas
              )
            )
          );
          return;
        }

        setFeeMode("legacy");
        setGasPrice(
          formatGweiInput(maxFee(bumpFee(originalGasPrice), networkGasPrice))
        );
      } catch (error) {
        toast({
          title: "Could not refresh fees",
          description: toErrorMessage(error),
          status: "error",
          position: "bottom-right",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsRefreshingFees(false);
      }
    },
    [publicClient, toast]
  );

  const fetchTransaction = useCallback(
    async (hashFromInput = txHash) => {
      const normalizedHash = hashFromInput.trim();

      setTxLookupError("");
      setLoadedTx(null);
      setReplacementHash(null);

      if (!normalizedHash) return;
      if (!isHash(normalizedHash)) {
        setTxLookupError("Enter a valid transaction hash.");
        return;
      }
      if (!publicClient) {
        setTxLookupError("No RPC client is available for the current network.");
        return;
      }

      setIsFetchingTx(true);

      try {
        const tx = await publicClient.getTransaction({
          hash: normalizedHash as Hash,
        });
        const loaded = tx as LoadedTransaction;

        setLoadedTx(loaded);
        setNonce(String(loaded.nonce));
        setGasLimit(mode === "cancel" ? DEFAULT_GAS_LIMIT : String(loaded.gas));
        setManualTo(loaded.to ?? "");
        setManualValue(formatEther(loaded.value));
        setManualData(loaded.input || ZERO_DATA);
        setUseManualPayload(false);
        lastLoadedHashRef.current = normalizedHash;

        await refreshFees(loaded);
      } catch (error) {
        setTxLookupError(
          `${toErrorMessage(error)} Make sure your wallet is on the same chain as the pending transaction.`
        );
      } finally {
        setIsFetchingTx(false);
      }
    },
    [mode, publicClient, refreshFees, txHash]
  );

  useEffect(() => {
    if (!txHash || lastLoadedHashRef.current === txHash) return;
    fetchTransaction(txHash);
  }, [fetchTransaction, txHash]);

  useEffect(() => {
    if (!loadedTx && address && publicClient) {
      loadDefaultNonce();
    }
  }, [address, loadedTx, loadDefaultNonce, publicClient]);

  useEffect(() => {
    if (!loadedTx && publicClient) {
      refreshFees(null);
    }
  }, [chainId, loadedTx, publicClient, refreshFees]);

  useEffect(() => {
    if (!loadedTx) return;
    setGasLimit(mode === "cancel" ? DEFAULT_GAS_LIMIT : String(loadedTx.gas));
  }, [loadedTx, mode]);

  const replacementSummary = useMemo(() => {
    if (mode === "cancel") {
      return {
        label: "Cancel transaction",
        description: "0 value self-transfer",
        to: address ?? "",
        value: "0 ETH",
        data: ZERO_DATA,
      };
    }

    const to = useManualPayload ? manualTo : (loadedTx?.to ?? manualTo);
    const value = useManualPayload
      ? `${manualValue || "0"} ETH`
      : `${formatEther(loadedTx?.value ?? 0n)} ETH`;
    const data = useManualPayload
      ? manualData || ZERO_DATA
      : (loadedTx?.input ?? ZERO_DATA);

    return {
      label: "Speed up transaction",
      description: "Same payload with higher fee",
      to,
      value,
      data,
    };
  }, [
    address,
    loadedTx,
    manualData,
    manualTo,
    manualValue,
    mode,
    useManualPayload,
  ]);

  const canSubmit =
    Boolean(isConnected && walletClient && address) &&
    !isLoadedTxConfirmed &&
    !senderMismatch &&
    (mode === "cancel" || Boolean(loadedTx) || useManualPayload) &&
    nonce.trim().length > 0 &&
    (feeMode === "legacy"
      ? gasPrice.trim().length > 0
      : maxFeePerGas.trim().length > 0 &&
        maxPriorityFeePerGas.trim().length > 0);

  const sendReplacement = async () => {
    if (!walletClient || !address || !publicClient) return;

    try {
      setIsSending(true);
      setReplacementHash(null);

      const parsedNonce = parseNonce(nonce);
      const parsedGasLimit =
        mode === "cancel" ? 21_000n : parseGasLimit(gasLimit);

      const feeFields =
        feeMode === "legacy"
          ? { gasPrice: parsePositiveGwei(gasPrice, "gas price") }
          : {
              maxFeePerGas: parsePositiveGwei(maxFeePerGas, "max fee per gas"),
              maxPriorityFeePerGas: parsePositiveGwei(
                maxPriorityFeePerGas,
                "max priority fee per gas"
              ),
            };

      let txRequest;

      if (mode === "cancel") {
        txRequest = {
          account: address,
          to: address,
          value: 0n,
          data: ZERO_DATA,
          nonce: parsedNonce,
          gas: parsedGasLimit,
          ...feeFields,
        };
      } else {
        const to = useManualPayload
          ? manualTo.trim()
          : (loadedTx?.to ?? manualTo.trim());
        const data = useManualPayload
          ? parseHexData(manualData)
          : (loadedTx?.input ?? parseHexData(manualData));
        const value = useManualPayload
          ? parseEther(manualValue || "0")
          : (loadedTx?.value ?? parseEther(manualValue || "0"));

        if (to && !isAddress(to)) {
          throw new Error("Enter a valid recipient address.");
        }
        if (!to && data === ZERO_DATA) {
          throw new Error(
            "Enter a recipient address, or provide contract creation data."
          );
        }

        txRequest = {
          account: address,
          to: to ? (to as Address) : undefined,
          value,
          data,
          nonce: parsedNonce,
          gas: parsedGasLimit,
          ...feeFields,
        };
      }

      const hash = await walletClient.sendTransaction(txRequest);
      setReplacementHash(hash);

      toast({
        title: "Replacement transaction sent",
        description: explorerBase ? (
          <Link href={`${explorerBase}/tx/${hash}`} isExternal>
            <HStack>
              <Text>View on explorer</Text>
              <ExternalLinkIcon />
            </HStack>
          </Link>
        ) : (
          shortenHash(hash)
        ),
        status: "loading",
        position: "bottom-right",
        duration: 7000,
        isClosable: true,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      toast({
        title:
          mode === "cancel"
            ? "Cancellation confirmed"
            : "Speed-up transaction confirmed",
        description: explorerBase ? (
          <Link href={`${explorerBase}/tx/${hash}`} isExternal>
            <HStack>
              <Text>View on explorer</Text>
              <ExternalLinkIcon />
            </HStack>
          </Link>
        ) : undefined,
        status: "success",
        position: "bottom-right",
        duration: 7000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Replacement failed",
        description: toErrorMessage(error),
        status: "error",
        position: "bottom-right",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Box maxW="980px" mx="auto" w="full">
      <Flex
        align={{ base: "stretch", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
        mb={6}
      >
        <Box>
          <Heading
            as="h1"
            fontSize={{ base: "4xl", md: "5xl" }}
            lineHeight="shorter"
            color="gray.100"
            fontWeight="bold"
          >
            Replace Pending Transaction
          </Heading>
          <Text color="gray.400" mt={2}>
            Submit a same-nonce replacement to cancel or speed up a pending EVM
            transaction.
          </Text>
        </Box>
        <Spacer />
        <ConnectButton />
      </Flex>

      <Grid templateColumns={{ base: "1fr", xl: "1.2fr 0.8fr" }} gap={5}>
        <GridItem>
          <Box
            p={{ base: 4, md: 5 }}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
          >
            <VStack spacing={5} align="stretch">
              <ButtonGroup
                isAttached
                size="md"
                variant="outline"
                w={{ base: "full", sm: "auto" }}
              >
                <Button
                  leftIcon={<Icon as={Gauge} />}
                  colorScheme={mode === "speed-up" ? "blue" : undefined}
                  variant={mode === "speed-up" ? "solid" : "outline"}
                  onClick={() => setMode("speed-up")}
                  flex={{ base: 1, sm: "initial" }}
                >
                  Speed Up
                </Button>
                <Button
                  leftIcon={<Icon as={Ban} />}
                  colorScheme={mode === "cancel" ? "red" : undefined}
                  variant={mode === "cancel" ? "solid" : "outline"}
                  onClick={() => setMode("cancel")}
                  flex={{ base: 1, sm: "initial" }}
                >
                  Cancel
                </Button>
              </ButtonGroup>

              <FormControl>
                <FormLabel color="gray.300">Transaction hash</FormLabel>
                <InputGroup>
                  <Input
                    value={txHash}
                    onChange={(event) => setTxHash(event.target.value.trim())}
                    placeholder="0x..."
                    spellCheck={false}
                    fontFamily="mono"
                    bg="whiteAlpha.50"
                    borderColor={txLookupError ? "red.400" : "whiteAlpha.200"}
                    _hover={{ borderColor: "whiteAlpha.400" }}
                    _focus={{
                      borderColor: txLookupError ? "red.400" : "blue.400",
                      boxShadow: txLookupError
                        ? "0 0 0 1px var(--chakra-colors-red-400)"
                        : "0 0 0 1px var(--chakra-colors-blue-400)",
                    }}
                  />
                  <InputRightElement w="5.5rem" pr={1}>
                    <Button
                      size="sm"
                      leftIcon={<Icon as={Search} />}
                      onClick={() => fetchTransaction()}
                      isLoading={isFetchingTx}
                    >
                      Load
                    </Button>
                  </InputRightElement>
                </InputGroup>
                {txLookupError ? (
                  <Text color="red.300" fontSize="sm" mt={2}>
                    {txLookupError}
                  </Text>
                ) : (
                  <Text color="gray.500" fontSize="sm" mt={2}>
                    Optional for cancel, recommended for speed up. The lookup
                    uses your currently selected wallet network.
                  </Text>
                )}
              </FormControl>

              {loadedTx && (
                <Box
                  border="1px solid"
                  borderColor={isLoadedTxConfirmed ? "orange.300" : "green.400"}
                  bg={isLoadedTxConfirmed ? "orange.900" : "green.900"}
                  rounded="lg"
                  p={4}
                >
                  <HStack mb={3} align="start">
                    <Box>
                      <Text color="gray.100" fontWeight="semibold">
                        Original transaction
                      </Text>
                      <Text color="gray.400" fontSize="sm" fontFamily="mono">
                        {shortenHash(loadedTx.hash)}
                      </Text>
                    </Box>
                    <Spacer />
                    <Badge
                      colorScheme={isLoadedTxConfirmed ? "orange" : "green"}
                    >
                      {isLoadedTxConfirmed ? "Confirmed" : "Pending"}
                    </Badge>
                    {explorerBase && (
                      <IconButton
                        as={Link}
                        href={`${explorerBase}/tx/${loadedTx.hash}`}
                        isExternal
                        aria-label="View original transaction"
                        icon={<ExternalLinkIcon />}
                        size="sm"
                        variant="ghost"
                      />
                    )}
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <TxFact label="From" value={loadedTx.from} copy />
                    <TxFact label="Nonce" value={String(loadedTx.nonce)} />
                    <TxFact
                      label="To"
                      value={loadedTx.to ?? "Contract creation"}
                      copy={Boolean(loadedTx.to)}
                    />
                    <TxFact
                      label="Value"
                      value={`${formatEther(loadedTx.value)} ETH`}
                    />
                  </SimpleGrid>
                </Box>
              )}

              {isLoadedTxConfirmed && (
                <Alert status="warning" rounded="lg" bg="orange.900">
                  <AlertIcon />
                  <AlertDescription color="orange.100">
                    This transaction is already confirmed. Confirmed
                    transactions cannot be canceled or sped up.
                  </AlertDescription>
                </Alert>
              )}

              {senderMismatch && (
                <Alert status="error" rounded="lg" bg="red.900">
                  <AlertIcon />
                  <AlertDescription color="red.100">
                    Connect the sender wallet to replace this transaction.
                  </AlertDescription>
                </Alert>
              )}

              <Divider borderColor="whiteAlpha.200" />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <HStack mb={2}>
                    <FormLabel color="gray.300" mb={0}>
                      Nonce
                    </FormLabel>
                    <Tooltip label="Use the next nonce after confirmed transactions">
                      <IconButton
                        aria-label="Load nonce"
                        icon={<Icon as={RefreshCw} />}
                        size="xs"
                        variant="ghost"
                        onClick={loadDefaultNonce}
                        isDisabled={!address}
                      />
                    </Tooltip>
                  </HStack>
                  <NumberInput value={nonce} onChange={setNonce} min={0}>
                    <NumberInputField
                      bg="whiteAlpha.50"
                      borderColor="whiteAlpha.200"
                      fontFamily="mono"
                    />
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300">Gas limit</FormLabel>
                  <NumberInput
                    value={gasLimit}
                    onChange={setGasLimit}
                    min={21_000}
                    isDisabled={mode === "cancel"}
                  >
                    <NumberInputField
                      bg="whiteAlpha.50"
                      borderColor="whiteAlpha.200"
                      fontFamily="mono"
                    />
                  </NumberInput>
                </FormControl>
              </SimpleGrid>

              {mode === "speed-up" && (
                <Box>
                  <HStack mb={3}>
                    <Switch
                      isChecked={useManualPayload}
                      onChange={(event) =>
                        setUseManualPayload(event.target.checked)
                      }
                      colorScheme="blue"
                    />
                    <Text color="gray.300" fontWeight="medium">
                      Manual transaction payload
                    </Text>
                  </HStack>
                  {useManualPayload && (
                    <VStack spacing={3} align="stretch">
                      <FormControl>
                        <FormLabel color="gray.300">To</FormLabel>
                        <Input
                          value={manualTo}
                          onChange={(event) =>
                            setManualTo(event.target.value.trim())
                          }
                          placeholder="0x... or blank for contract creation"
                          bg="whiteAlpha.50"
                          borderColor="whiteAlpha.200"
                          fontFamily="mono"
                        />
                      </FormControl>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                        <FormControl>
                          <FormLabel color="gray.300">Value in ETH</FormLabel>
                          <NumberInput
                            value={manualValue}
                            onChange={setManualValue}
                            min={0}
                          >
                            <NumberInputField
                              bg="whiteAlpha.50"
                              borderColor="whiteAlpha.200"
                              fontFamily="mono"
                            />
                          </NumberInput>
                        </FormControl>
                        <FormControl>
                          <FormLabel color="gray.300">Data</FormLabel>
                          <Input
                            value={manualData}
                            onChange={(event) =>
                              setManualData(event.target.value.trim())
                            }
                            placeholder="0x"
                            bg="whiteAlpha.50"
                            borderColor="whiteAlpha.200"
                            fontFamily="mono"
                          />
                        </FormControl>
                      </SimpleGrid>
                    </VStack>
                  )}
                </Box>
              )}

              <Box
                p={4}
                bg="blackAlpha.300"
                border="1px solid"
                borderColor="whiteAlpha.200"
                rounded="lg"
              >
                <HStack mb={4} align="center">
                  <Box>
                    <Text color="gray.100" fontWeight="semibold">
                      Replacement fee
                    </Text>
                    <Text color="gray.500" fontSize="sm">
                      Defaults use current network fees and a 25% bump over the
                      original transaction when loaded.
                    </Text>
                  </Box>
                  <Spacer />
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={
                      isRefreshingFees ? (
                        <Spinner size="xs" />
                      ) : (
                        <Icon as={RotateCw} />
                      )
                    }
                    onClick={() => refreshFees(loadedTx)}
                    isDisabled={!publicClient}
                  >
                    Refresh
                  </Button>
                </HStack>

                <ButtonGroup size="sm" isAttached mb={4}>
                  <Button
                    colorScheme={feeMode === "eip1559" ? "blue" : undefined}
                    variant={feeMode === "eip1559" ? "solid" : "outline"}
                    onClick={() => setFeeMode("eip1559")}
                  >
                    EIP-1559
                  </Button>
                  <Button
                    colorScheme={feeMode === "legacy" ? "blue" : undefined}
                    variant={feeMode === "legacy" ? "solid" : "outline"}
                    onClick={() => setFeeMode("legacy")}
                  >
                    Legacy
                  </Button>
                </ButtonGroup>

                {feeMode === "eip1559" ? (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <FormControl>
                      <FormLabel color="gray.300">
                        Max fee per gas, gwei
                      </FormLabel>
                      <Input
                        value={maxFeePerGas}
                        onChange={(event) =>
                          setMaxFeePerGas(event.target.value)
                        }
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        fontFamily="mono"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel color="gray.300">
                        Max priority fee, gwei
                      </FormLabel>
                      <Input
                        value={maxPriorityFeePerGas}
                        onChange={(event) =>
                          setMaxPriorityFeePerGas(event.target.value)
                        }
                        bg="whiteAlpha.50"
                        borderColor="whiteAlpha.200"
                        fontFamily="mono"
                      />
                    </FormControl>
                  </SimpleGrid>
                ) : (
                  <FormControl>
                    <FormLabel color="gray.300">Gas price, gwei</FormLabel>
                    <Input
                      value={gasPrice}
                      onChange={(event) => setGasPrice(event.target.value)}
                      bg="whiteAlpha.50"
                      borderColor="whiteAlpha.200"
                      fontFamily="mono"
                    />
                  </FormControl>
                )}
              </Box>

              <Box rounded="lg" bg="whiteAlpha.100" p={4}>
                <HStack align="flex-start" spacing={3}>
                  <Icon
                    as={AlertTriangle}
                    color="orange.300"
                    boxSize={5}
                    flexShrink={0}
                    mt="0.2rem"
                  />
                  <Text color="gray.300" lineHeight="tall">
                    Replacement only works while the original transaction is
                    still pending. Wallets can ignore a dapp-provided nonce, so
                    verify the nonce shown in your wallet before confirming.
                  </Text>
                </HStack>
              </Box>
            </VStack>
          </Box>
        </GridItem>

        <GridItem>
          <Stack spacing={5}>
            <Box
              p={{ base: 4, md: 5 }}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
            >
              <Text color="gray.100" fontWeight="semibold" mb={4}>
                Replacement preview
              </Text>
              <VStack spacing={3} align="stretch">
                <TxFact label="Action" value={replacementSummary.label} />
                <TxFact
                  label="Payload"
                  value={replacementSummary.description}
                />
                <TxFact
                  label="To"
                  value={replacementSummary.to || "Contract creation"}
                  copy={Boolean(replacementSummary.to)}
                />
                <TxFact label="Value" value={replacementSummary.value} />
                <TxFact
                  label="Data"
                  value={shortenHash(replacementSummary.data)}
                  copyValue={replacementSummary.data}
                />
                <TxFact label="Nonce" value={nonce || "Not set"} />
              </VStack>
            </Box>

            <Button
              colorScheme={mode === "cancel" ? "red" : "blue"}
              size="lg"
              leftIcon={<Icon as={mode === "cancel" ? Ban : Gauge} />}
              onClick={sendReplacement}
              isDisabled={!canSubmit}
              isLoading={isSending}
              w="full"
            >
              {mode === "cancel"
                ? "Cancel Transaction"
                : "Speed Up Transaction"}
            </Button>

            {replacementHash && (
              <Box
                p={{ base: 4, md: 5 }}
                bg="green.900"
                border="1px solid"
                borderColor="green.400"
                borderRadius="lg"
              >
                <Text color="green.100" fontWeight="semibold" mb={2}>
                  Replacement submitted
                </Text>
                <HStack>
                  <Text color="green.100" fontFamily="mono" fontSize="sm">
                    {shortenHash(replacementHash)}
                  </Text>
                  <CopyToClipboard textToCopy={replacementHash} size="xs" />
                  {replacementUrl && (
                    <IconButton
                      as={Link}
                      href={replacementUrl}
                      isExternal
                      aria-label="View replacement transaction"
                      icon={<ExternalLinkIcon />}
                      size="sm"
                      variant="ghost"
                    />
                  )}
                </HStack>
              </Box>
            )}
          </Stack>
        </GridItem>
      </Grid>
    </Box>
  );
}

export default function ReplaceTxPage() {
  return (
    <Suspense
      fallback={
        <Box maxW="980px" mx="auto" w="full" color="gray.400">
          Loading...
        </Box>
      }
    >
      <ReplaceTxContent />
    </Suspense>
  );
}

function TxFact({
  label,
  value,
  copy,
  copyValue,
}: {
  label: string;
  value: string;
  copy?: boolean;
  copyValue?: string;
}) {
  return (
    <Box minW={0}>
      <Text color="gray.500" fontSize="xs" textTransform="uppercase">
        {label}
      </Text>
      <HStack minW={0} spacing={2}>
        <Text
          color="gray.200"
          fontSize="sm"
          fontFamily={value.startsWith("0x") ? "mono" : "body"}
          noOfLines={1}
          wordBreak="break-all"
        >
          {value || "-"}
        </Text>
        {(copy || copyValue) && value && value !== "-" && (
          <CopyToClipboard textToCopy={copyValue ?? value} size="xs" />
        )}
      </HStack>
    </Box>
  );
}
