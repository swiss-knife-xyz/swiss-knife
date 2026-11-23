"use client";

import dynamic from "next/dynamic";
import type { ClearSigningRequest } from "@/lib/clearSigning/resolve";
import { ToolLoading } from "@/components/ToolLoading";

import { useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  HStack,
  Heading,
  VStack,
  Text,
  Box,
  Textarea,
  Spacer,
  Link,
  Button,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Avatar,
  Spinner,
  Tooltip,
  Image,
  Icon,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { FiSend, FiUser, FiCode, FiDollarSign, FiGlobe, FiEdit2, FiX } from "react-icons/fi";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  parseEther,
  formatEther,
  isAddress,
  stringify,
  zeroAddress,
} from "viem";
import { useWalletClient, useAccount, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { InputField } from "@/components/InputField";
import { NetworkSelect } from "@/components/NetworkSelect";
import { DarkSelect } from "@/components/DarkSelect";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import {
  getPath,
  ethFormatOptions,
  ETHSelectedOptionState,
  startHexWith0x,
  resolveNameToAddress,
  resolveAddressToName,
  getNameAvatar,
  isResolvableName,
  slicedText,
  generateTenderlyUrl,
} from "@/utils";
import subdomains from "@/subdomains";
import { chainIdToChain, getNetworkIcon } from "@/data/networks";
import { useCustomChains } from "@/lib/customChains/store";
import { decodeRecursive } from "@/lib/decoder";
import { useAutoHideScrollbars } from "@/hooks/useAutoHideScrollbars";
import { DecodedCalldataSkeleton } from "@/components/decodedParams/DecodedCalldataSkeleton";
import { CalldataTree } from "@/components/decodedParams/CalldataTree";
import { config } from "@/app/providers";
import { getDisplayFunctionName } from "@/utils/functionNames";

const ClearSigningSummary = dynamic(
  () => import("@/components/ClearSigning/ClearSigningSummary"),
  { ssr: false }
);

function SendTxContent() {
  useCustomChains();
  const scrollbars = useAutoHideScrollbars();
  const { data: walletClient } = useWalletClient();
  const { chain, address: connectedAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const searchParams = useSearchParams();

  const [to, setTo] = useQueryState<string>(
    "to",
    parseAsString.withDefault("")
  );
  const [calldata, setCalldata] = useQueryState<string>(
    "calldata",
    parseAsString.withDefault("")
  );
  const [ethValue, setEthValue] = useQueryState<string>(
    "eth",
    parseAsString.withDefault("")
  );
  const [chainId, setChainId] = useQueryState<number>(
    "chainId",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: false })
  );
  const [isEditingNetwork, setEditingNetwork] = useState(false);
  const networkEditRef = useRef<HTMLButtonElement>(null);
  const closeNetworkEditor = () => {
    setEditingNetwork(false);
    requestAnimationFrame(() => networkEditRef.current?.focus());
  };
  const initialChainInUrl = useRef(searchParams.has("chainId"));
  const adoptedWalletChain = useRef(false);
  const busy = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<{
    phase: "wallet" | "pending" | "success" | "error" | "network";
    title: string;
    detail?: string;
    hash?: `0x${string}`;
    chainId: number;
  } | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [liveMismatch, setLiveMismatch] = useState<number | null>(null);
  const needsNetworkSwitch =
    !!connectedAddress && (chain?.id !== chainId || liveMismatch === chainId);
  useEffect(() => {
    setLiveMismatch(null);
  }, [chain?.id]);
  const networkName = chainIdToChain[chainId]?.name || `chain ${chainId}`;

  useEffect(() => {
    if (chain && !initialChainInUrl.current && !adoptedWalletChain.current) {
      adoptedWalletChain.current = true;
      setChainId(chain.id);
    }
  }, [chain?.id, setChainId]);

  useEffect(() => {
    if (!status) return;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    statusRef.current?.scrollIntoView?.({
      behavior: reduced ? "instant" : "smooth",
      block: "nearest",
    });
  }, [status]);

  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<ETHSelectedOptionState>({
      label: ethFormatOptions[1],
      value: ethFormatOptions[1],
    });

  const [isLoading, setIsLoading] = useState(false);

  const [isDecodeModalOpen, setIsDecodeModalOpen] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string>();
  const [decoded, setDecoded] = useState<any>();
  const decodedFunctionName = useMemo(
    () =>
      getDisplayFunctionName(
        decoded?.functionName,
        decoded?.guessedFunctionName
      ),
    [decoded]
  );

  // Shared ENS, GNS and WNS resolution for recipient previews.
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingEns, setIsResolvingEns] = useState(false);
  const [lastResolvedValue, setLastResolvedValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    setEnsName("");
    setResolvedAddress("");
    setLastResolvedValue("");
    const canResolve = isResolvableName(to) || isAddress(to);
    setIsResolvingEns(canResolve);
    if (!canResolve) return;

    const timer = setTimeout(async () => {
      try {
        const isRawAddress = isAddress(to);
        const address = isRawAddress ? to : await resolveNameToAddress(to);
        const name = isRawAddress
          ? await resolveAddressToName(to)
          : address
            ? to
            : "";
        if (cancelled) return;
        setResolvedAddress(address || "");
        setEnsName(name || "");
        setLastResolvedValue(to);
      } finally {
        if (!cancelled) setIsResolvingEns(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [to]);

  useEffect(() => {
    let cancelled = false;
    setEnsAvatar("");
    if (ensName) {
      getNameAvatar(ensName).then((avatar) => {
        if (!cancelled) setEnsAvatar(avatar || "");
      });
    }
    return () => {
      cancelled = true;
    };
  }, [ensName]);

  const recipientAddress = isAddress(to)
    ? to
    : lastResolvedValue === to
      ? resolvedAddress
      : "";
  const summaryKey = JSON.stringify([
    calldata,
    recipientAddress,
    chainId,
    connectedAddress,
    ethValue,
  ]);
  const [summaryPreview, setSummaryPreview] = useState<{
    key: string;
    request: ClearSigningRequest;
  } | null>(null);
  const summaryRequest =
    summaryPreview?.key === summaryKey ? summaryPreview.request : null;
  useEffect(() => {
    if (
      !recipientAddress ||
      !/^0x[\da-f]{8}(?:[\da-f]{2})*$/i.test(startHexWith0x(calldata))
    )
      return;
    let value: string;
    try {
      value = parseEther(ethValue || "0").toString();
    } catch {
      return;
    }
    const timer = setTimeout(
      () =>
        setSummaryPreview({
          key: summaryKey,
          request: {
            calldata: startHexWith0x(calldata),
            to: recipientAddress,
            chainId,
            from: connectedAddress,
            allowMissingSender: !connectedAddress,
            value,
          },
        }),
      400
    );
    return () => clearTimeout(timer);
  }, [calldata, recipientAddress, chainId, connectedAddress, ethValue]);

  const decodeRequestId = useRef(0);
  useEffect(() => {
    decodeRequestId.current++;
    setDecoded(undefined);
    setDecodeError(undefined);
    setIsDecoding(false);
  }, [calldata, to, chainId]);

  const requestKeyRef = useRef("");
  const requestKey = JSON.stringify([
    to,
    calldata,
    ethValue,
    chainId,
    connectedAddress,
  ]);
  requestKeyRef.current = requestKey;

  const primaryAction = async () => {
    if (busy.current) return;
    if (!connectedAddress) return;
    const targetChainId = chainId;
    const targetChain = chainIdToChain[targetChainId];
    if (!targetChain) {
      setStatus({
        phase: "error",
        title: "Unsupported network",
        detail: `No network configuration for chain ${targetChainId}.`,
        chainId: targetChainId,
      });
      return;
    }
    busy.current = true;
    if (needsNetworkSwitch) {
      setIsSwitching(true);
      setStatus({
        phase: "network",
        title: `Switch to ${targetChain.name}`,
        detail: "Confirm the network switch in your wallet.",
        chainId: targetChainId,
      });
      try {
        await switchChainAsync({ chainId: targetChainId });
        setLiveMismatch(null);
        setStatus({
          phase: "success",
          title: `Switched to ${targetChain.name}`,
          detail: "Review the transaction, then select Send Transaction.",
          chainId: targetChainId,
        });
      } catch (error: any) {
        setStatus({
          phase: "error",
          title: "Network switch cancelled or failed",
          detail:
            error.shortMessage ||
            error.message ||
            "Try switching networks again.",
          chainId: targetChainId,
        });
      } finally {
        busy.current = false;
        setIsSwitching(false);
      }
      return;
    }
    if (!walletClient) {
      busy.current = false;
      return;
    }
    const submittedKey = requestKey;
    const deploying = !to;
    let hash: `0x${string}` | undefined;
    setIsLoading(true);
    setStatus({
      phase: "wallet",
      title: "Preparing transaction",
      chainId: targetChainId,
    });
    try {
      const value = parseEther(ethValue || "0");
      if (value < 0n) throw new Error("Value cannot be negative.");
      const data = startHexWith0x(calldata);
      if (!/^0x(?:[\da-f]{2})*$/i.test(data))
        throw new Error("Calldata must contain complete hexadecimal bytes.");
      const recipient = to
        ? isAddress(to)
          ? to
          : (lastResolvedValue === to && resolvedAddress) ||
            (await resolveNameToAddress(to))
        : undefined;
      if (to && !recipient)
        throw new Error("Invalid address or unresolved name.");
      // Check the live wallet immediately before the signing request, including
      // after asynchronous name resolution. Pin viem and receipt tracking to
      // this exact chain rather than whatever the wallet switches to later.
      const walletChainId = await walletClient.getChainId();
      if (walletChainId !== targetChainId) {
        setLiveMismatch(targetChainId);
        throw new Error(
          `Switch your wallet to ${targetChain.name} before sending.`
        );
      }
      if (requestKeyRef.current !== submittedKey)
        throw new Error(
          "Transaction inputs changed. Review them and send again."
        );
      setStatus({
        phase: "wallet",
        title: deploying
          ? "Confirm deployment in your wallet"
          : "Confirm transaction in your wallet",
        chainId: targetChainId,
      });
      hash = deploying
        ? await walletClient.deployContract({
            bytecode: data,
            value,
            abi: [],
            chain: targetChain,
          })
        : await walletClient.sendTransaction({
            to: recipient as `0x${string}`,
            data,
            value,
            chain: targetChain,
          });
      setStatus({
        phase: "pending",
        title: deploying ? "Deploying contract" : "Waiting for confirmation",
        hash,
        chainId: targetChainId,
      });
      const receipt = await waitForTransactionReceipt(config, {
        hash,
        chainId: targetChainId,
      });
      if (receipt.status === "reverted") {
        setStatus({
          phase: "error",
          title: deploying
            ? "Contract deployment reverted"
            : "Transaction reverted",
          detail: "The transaction was mined but execution failed.",
          hash,
          chainId: targetChainId,
        });
      } else {
        setStatus({
          phase: "success",
          title: deploying
            ? "Contract deployed successfully"
            : "Transaction confirmed",
          hash,
          chainId: targetChainId,
        });
      }
    } catch (error: any) {
      setStatus({
        phase: "error",
        title: hash
          ? "Unable to confirm transaction"
          : "Transaction request failed",
        detail:
          error.shortMessage ||
          error.message ||
          "The wallet request failed. Please try again.",
        hash,
        chainId: targetChainId,
      });
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  };

  const decode = useCallback(async () => {
    const requestId = ++decodeRequestId.current;
    setIsDecodeModalOpen(true);
    setIsDecoding(true);
    setDecoded(undefined);
    setDecodeError(undefined);
    console.log("DECODING...");
    try {
      const address = to
        ? isAddress(to)
          ? to
          : await resolveNameToAddress(to)
        : undefined;
      if (requestId !== decodeRequestId.current) return;
      if (to && !address)
        throw new Error("Unable to resolve the recipient address");
      const res = await decodeRecursive({
        calldata: startHexWith0x(calldata),
        address: address || undefined,
        chainId: chainId,
      });
      if (requestId !== decodeRequestId.current) return;
      console.log({ DECODED_RESULT: res });
      setDecoded(res);

      if (res === null) {
        throw new Error("Unable to decode this calldata");
      }
    } catch (e: any) {
      if (requestId !== decodeRequestId.current) return;
      console.log("Error Decoding");
      setDecodeError(e.message || "Unable to decode this calldata");
    } finally {
      if (requestId === decodeRequestId.current) setIsDecoding(false);
    }
  }, [calldata, to, chainId]);

  return (
    <Box
      data-tx-review-layout
      display="grid"
      gridTemplateColumns="minmax(0, 1fr)"
      gridTemplateAreas={'"form"'}
      alignItems="start"
      gap={6}
      w="full"
      minW={0}
      maxW="800px"
      mx="auto"
      sx={{
        "&:has(> [data-tx-clear-signing] > section)": {
          gridTemplateAreas: '"form" "summary"',
        },
        "@media (min-width: 1100px)": {
          "&:has(> [data-tx-clear-signing] > section)": {
            maxWidth: "1200px",
            gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
            gridTemplateAreas: '"summary form"',
          },
        },
      }}
    >
      {summaryRequest && (
        <Box
          data-tx-clear-signing
          gridArea="summary"
          minW={0}
          sx={{ "&:not(:has(> section))": { display: "none" } }}
        >
          <HStack h={8} mb={4}>
            <Text fontSize="sm" fontWeight="semibold" color="text.secondary">
              Clear Signing
            </Text>
          </HStack>
          <ClearSigningSummary {...summaryRequest} />
        </Box>
      )}
      <Box
        data-tx-send-form
        gridArea="form"
        minW={0}
        p={{ base: 4, md: 6 }}
        bg="rgba(0, 0, 0, 0.05)"
        backdropFilter="blur(5px)"
        borderRadius="xl"
        border="1px solid"
        borderColor="whiteAlpha.50"
        w="full"
      >
        {/* Page Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" spacing={3} mb={4}>
            <Icon as={FiSend} color="blue.400" boxSize={8} />
            <Heading
              as="h1"
              size="xl"
              color="gray.100"
              fontWeight="bold"
              letterSpacing="tight"
            >
              Send Transaction
            </Heading>
          </HStack>
          <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
            Send a transaction or deploy a contract with custom calldata
          </Text>
          <Text color="gray.500" fontSize="sm" maxW="600px" mx="auto" mt={2}>
            A more human readable experience now at{" "}
            <Link
              href={getPath(subdomains.CONTRACT.base)}
              color="gray.300"
              textDecoration="underline"
              textUnderlineOffset="3px"
            >
              Contract Explorer
            </Link>
          </Text>
        </Box>

        <VStack spacing={6} align="stretch">
          <Box
            as="section"
            aria-label="Transaction network"
            w="full"
            maxW="800px"
            mx="auto"
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <HStack spacing={3} justify="space-between" align="center" flexWrap="wrap">
              <HStack spacing={2} flexShrink={0}>
                <Icon as={FiGlobe} color="blue.400" boxSize={5} />
                <Text color="gray.300" fontWeight="medium">Network</Text>
              </HStack>
              <HStack spacing={2} minW={0} justify="flex-end" ml="auto">
                {isEditingNetwork ? (
                  <>
                    <NetworkSelect
                      ariaLabel="Target network"
                      chainId={chainId}
                      autoFocus
                      openMenuOnFocus
                      size="sm"
                      menuAlign="right"
                      menuMinWidth={340}
                      boxProps={{ w: { base: "180px", sm: "240px" }, minW: 0 }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") closeNetworkEditor();
                      }}
                      onChange={(nextChainId) => {
                        adoptedWalletChain.current = true;
                        setLiveMismatch(null);
                        setStatus(null);
                        setChainId(nextChainId);
                        closeNetworkEditor();
                      }}
                    />
                    <IconButton
                      aria-label="Cancel network change"
                      icon={<FiX />}
                      variant="ghost"
                      size="sm"
                      onClick={closeNetworkEditor}
                    />
                  </>
                ) : (
                  <>
                    {getNetworkIcon(chainId) && (
                      <Image src={getNetworkIcon(chainId)} alt="" boxSize={6} flexShrink={0} />
                    )}
                    <VStack align="end" spacing={0} minW={0}>
                      <Text fontWeight="medium" textAlign="right" overflowWrap="anywhere">{networkName}</Text>
                      <Text fontSize="xs" color="text.tertiary" fontFamily="mono">Chain ID: {chainId}</Text>
                    </VStack>
                    <IconButton
                      ref={networkEditRef}
                      aria-label="Change target network"
                      icon={<FiEdit2 size={14} />}
                      variant="ghost"
                      size="sm"
                      color="text.secondary"
                      isDisabled={isLoading || isSwitching}
                      onClick={() => setEditingNetwork(true)}
                    />
                  </>
                )}
              </HStack>
            </HStack>
          </Box>
          {/* To Address Section */}
          <Box
            w="full"
            maxW="800px"
            mx="auto"
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <VStack spacing={4} align="stretch">
              <HStack spacing={2} align="center">
                <Icon as={FiUser} color="blue.400" boxSize={5} />
                <Text color="gray.300" fontWeight="medium">
                  To Address
                </Text>
                <Spacer />
                {isResolvingEns && <Spinner size="xs" color="blue.400" />}
                {ensName && !isResolvingEns && (
                  <HStack px={2} py={1} bg="whiteAlpha.100" rounded="md">
                    {ensAvatar && (
                      <Avatar
                        src={ensAvatar}
                        w="1.2rem"
                        h="1.2rem"
                        ignoreFallback
                      />
                    )}
                    <Text fontSize="sm" color="gray.200">
                      {ensName}
                    </Text>
                  </HStack>
                )}
                {resolvedAddress &&
                  !isResolvingEns &&
                  resolvedAddress !== to && (
                    <HStack spacing={1}>
                      <Tooltip label={resolvedAddress} placement="top">
                        <Text fontSize="xs" color="gray.500" cursor="default">
                          {slicedText(resolvedAddress)}
                        </Text>
                      </Tooltip>
                      <CopyToClipboard textToCopy={resolvedAddress} size="xs" />
                    </HStack>
                  )}
                {(resolvedAddress || isAddress(to ?? "")) &&
                  chain?.blockExplorers?.default?.url && (
                    <IconButton
                      as={Link}
                      href={`${chain.blockExplorers.default.url}/address/${resolvedAddress || to}`}
                      isExternal
                      aria-label="View on explorer"
                      icon={<ExternalLinkIcon />}
                      size="xs"
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: "blue.400" }}
                    />
                  )}
              </HStack>
              <InputField
                aria-label="To Address"
                placeholder="Address or .eth, .gwei, .wei name.    Leave blank to deploy contract"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value.trim());
                }}
              />
            </VStack>
          </Box>

          {/* Value Section */}
          <Box
            w="full"
            maxW="800px"
            mx="auto"
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <VStack spacing={4} align="stretch">
              <HStack spacing={2} align="center">
                <Icon as={FiDollarSign} color="blue.400" boxSize={5} />
                <Text color="gray.300" fontWeight="medium">
                  Value
                </Text>
                <DarkSelect
                  boxProps={{
                    w: "7rem",
                  }}
                  selectedOption={selectedEthFormatOption}
                  setSelectedOption={(value) =>
                    setSelectedEthFormatOption(value as ETHSelectedOptionState)
                  }
                  options={ethFormatOptions.map((str) => ({
                    label: str,
                    value: str,
                  }))}
                />
              </HStack>
              <InputField
                type="number"
                aria-label="Value"
                placeholder="Enter value to send"
                value={
                  selectedEthFormatOption?.value === "ETH"
                    ? ethValue
                    : parseEther(ethValue ?? "0").toString()
                }
                onChange={(e) => {
                  const value = e.target.value;

                  if (selectedEthFormatOption?.value === "ETH") {
                    setEthValue(value);
                  } else {
                    // convert wei to eth
                    setEthValue(formatEther(BigInt(value)));
                  }
                }}
              />
            </VStack>
          </Box>

          {/* Calldata Section */}
          <Box w="full" minW={0}>
            <VStack spacing={4} align="stretch" minW={0}>
              <HStack spacing={2} align="center" minH={8}>
                <Icon as={FiCode} color="blue.400" boxSize={5} />
                <Text color="gray.300" fontWeight="medium">
                  Calldata
                </Text>
                <Spacer />
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="ghost"
                    onClick={() => decode()}
                    isLoading={isDecoding}
                  >
                    Decode
                  </Button>
                  <CopyToClipboard textToCopy={calldata ?? ""} size="xs" />
                </HStack>
              </HStack>
              <Textarea
                aria-label="Calldata"
                placeholder="Enter calldata (hex)"
                value={calldata}
                onChange={(e) => {
                  setCalldata(e.target.value);
                }}
                spellCheck={false}
                data-gramm="false"
                minH="280px"
                borderRadius="lg"
                resize="vertical"
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                _hover={{ borderColor: "whiteAlpha.300" }}
                _focus={{
                  borderColor: "blue.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                }}
                color="gray.100"
                _placeholder={{ color: "gray.500" }}
                fontSize="sm"
                fontFamily="mono"
              />
            </VStack>
          </Box>

          {/* Decode Modal */}
          <Modal
            isOpen={isDecodeModalOpen}
            onClose={() => setIsDecodeModalOpen(false)}
            isCentered
            scrollBehavior="inside"
          >
            <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
            <ModalContent
              w="calc(100% - 2rem)"
              maxW="1200px"
              my={{ base: 4, md: 8 }}
              maxH={{ base: "calc(100dvh - 2rem)", md: "calc(100dvh - 4rem)" }}
              bg="bg.900"
            >
              <ModalHeader color="gray.100" px={{ base: 5, md: 8 }} pt={6}>
                Decoded Calldata
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody
                {...scrollbars}
                px={{ base: 5, md: 8 }}
                pb={{ base: 5, md: 8 }}
              >
                {isDecoding ? (
                  <DecodedCalldataSkeleton />
                ) : decodeError ? (
                  <VStack align="start" spacing={4} py={4}>
                    <Text role="alert" color="red.300">
                      {decodeError}
                    </Text>
                    <Button size="sm" onClick={decode}>
                      Try again
                    </Button>
                  </VStack>
                ) : decoded ? (
                  <Box>
                    <HStack mb={2} justify="flex-end">
                      <CopyToClipboard
                        textToCopy={JSON.stringify(
                          {
                            function: decoded.signature,
                            params: JSON.parse(stringify(decoded.rawArgs)),
                          },
                          undefined,
                          2
                        )}
                        labelText="Copy params"
                      />
                    </HStack>
                    <Box minW={0}>
                      <CalldataTree
                        args={decoded.args}
                        chainId={chainId}
                        functionName={
                          decodedFunctionName.name ?? decoded.functionName
                        }
                        isFunctionNameGuessed={decodedFunctionName.isGuessed}
                      />
                    </Box>
                  </Box>
                ) : null}
              </ModalBody>
            </ModalContent>
          </Modal>

          {/* Action Buttons */}
          <HStack spacing={3} justify="center" pt={2} flexWrap="wrap">
            <Button
              variant="outline"
              size="md"
              borderColor="whiteAlpha.300"
              _hover={{
                borderColor: "whiteAlpha.400",
                bg: "whiteAlpha.100",
              }}
              onClick={() => {
                const targetAddress =
                  (lastResolvedValue === to && resolvedAddress) || to || "";
                const url = generateTenderlyUrl(
                  {
                    from: connectedAddress || zeroAddress,
                    to: targetAddress,
                    value: parseEther(ethValue ?? "0").toString(),
                    data: startHexWith0x(calldata) || "0x",
                  },
                  chainId
                );
                window.open(url, "_blank");
              }}
            >
              <HStack spacing={2}>
                <Image
                  src="/external/tenderly-favicon.ico"
                  alt="Tenderly"
                  w={4}
                  h={4}
                />
                <Text color="gray.300">Simulate</Text>
              </HStack>
            </Button>
            <Button
              colorScheme="blue"
              size="md"
              leftIcon={<Icon as={FiSend} boxSize={4} />}
              onClick={primaryAction}
              isDisabled={
                !connectedAddress || (!walletClient && !needsNetworkSwitch)
              }
              isLoading={isLoading || isSwitching}
              loadingText={
                isSwitching
                  ? "Switching network"
                  : status?.phase === "pending"
                    ? "Confirming"
                    : "Waiting for wallet"
              }
            >
              {needsNetworkSwitch
                ? `Switch to ${networkName}`
                : "Send Transaction"}
            </Button>
          </HStack>
          {status && (
            <Box
              ref={statusRef}
              role="status"
              aria-live="polite"
              w="full"
              p={4}
              bg="bg.subtle"
              border="1px solid"
              borderColor="border.default"
              borderRadius="lg"
              scrollMarginBottom={6}
            >
              <HStack align="start" spacing={3}>
                {["wallet", "pending", "network"].includes(status.phase) && (
                  <Spinner size="sm" mt={1} color="text.secondary" />
                )}
                <VStack align="start" spacing={1} minW={0}>
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color={
                      status.phase === "error"
                        ? "red.300"
                        : status.phase === "success"
                          ? "green.300"
                          : "text.primary"
                    }
                  >
                    {status.title}
                  </Text>
                  {status.detail && (
                    <Text
                      fontSize="sm"
                      color="text.secondary"
                      overflowWrap="anywhere"
                    >
                      {status.detail.slice(0, 400)}
                    </Text>
                  )}
                  {status.hash && (
                    <HStack spacing={2} flexWrap="wrap">
                      <Text
                        fontSize="xs"
                        color="text.tertiary"
                        fontFamily="mono"
                      >
                        {slicedText(status.hash)}
                      </Text>
                      <CopyToClipboard textToCopy={status.hash} size="xs" />
                      {chainIdToChain[status.chainId]?.blockExplorers?.default
                        .url && (
                        <Link
                          fontSize="xs"
                          href={`${chainIdToChain[status.chainId].blockExplorers!.default.url}/tx/${status.hash}`}
                          isExternal
                        >
                          View on explorer <ExternalLinkIcon boxSize={3} />
                        </Link>
                      )}
                    </HStack>
                  )}
                </VStack>
              </HStack>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
}

export default function SendTx() {
  return (
    <Suspense
      fallback={
        <ToolLoading
          title="Send Transaction"
          description="Send custom calldata to contracts or deploy raw bytecode."
        />
      }
    >
      <SendTxContent />
    </Suspense>
  );
}
