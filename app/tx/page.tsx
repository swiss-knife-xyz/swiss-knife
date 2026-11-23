"use client";

import dynamic from "next/dynamic";
import { TransactionSummaryRail } from "@/components/ClearSigning/TransactionSummaryRail";
import { createContractCallLink } from "@/lib/contractCall";
import { transactionExamples } from "./examples";
import type { DecodeRecursiveResult } from "@/types";
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
import { FiSend, FiUser, FiCode, FiDollarSign, FiGlobe, FiEdit2, FiX, FiArrowUpRight } from "react-icons/fi";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
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
import { createDecoderResultLink } from "@/lib/decoderShare";
import { config } from "@/app/providers";
import { getDisplayFunctionName } from "@/utils/functionNames";

const loadEditableCalldata = () => import("@/components/calldata/EditableCalldata")
  .then(module => ({ default: module.EditableCalldata }));
const EditableCalldata = dynamic(
  loadEditableCalldata,
  { ssr: false, loading: () => <DecodedCalldataSkeleton /> }
);

const ClearSigningSummary = dynamic(
  () => import("@/components/ClearSigning/ClearSigningSummary"),
  { ssr: false }
);

function SendTxContent() {
  const savedChains = useCustomChains();
  const scrollbars = useAutoHideScrollbars();
  const { data: walletClient } = useWalletClient();
  const { chain, address: connectedAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const searchParams = useSearchParams();

  const [{ to, calldata, eth: ethValue, chainId }, setTransaction] = useQueryStates({
    to: parseAsString.withDefault(""),
    calldata: parseAsString.withDefault(""),
    eth: parseAsString.withDefault(""),
    chainId: parseAsInteger.withDefault(1).withOptions({ clearOnDefault: false }),
  });
  const setTo = useCallback((to: string) => setTransaction({ to }), [setTransaction]);
  const setCalldata = useCallback((calldata: string) => setTransaction({ calldata }), [setTransaction]);
  const setEthValue = useCallback((eth: string) => setTransaction({ eth }), [setTransaction]);
  const setChainId = useCallback((chainId: number) => setTransaction({ chainId }), [setTransaction]);
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
  const calldataInputRef = useRef<HTMLTextAreaElement>(null);
  const pendingCalldataReveal = useRef(false);
  const calldataRevealFrame = useRef<number | undefined>(undefined);
  const calldataHighlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isCalldataHighlighted, setCalldataHighlighted] = useState(false);
  useEffect(() => () => {
    if (calldataRevealFrame.current !== undefined) cancelAnimationFrame(calldataRevealFrame.current);
    if (calldataHighlightTimer.current !== undefined) clearTimeout(calldataHighlightTimer.current);
  }, []);
  const revealUpdatedCalldata = () => {
    if (!pendingCalldataReveal.current) return;
    pendingCalldataReveal.current = false;
    calldataRevealFrame.current = requestAnimationFrame(() => {
      const input = calldataInputRef.current;
      if (!input) return;
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      input.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "center" });
      setCalldataHighlighted(true);
      if (calldataHighlightTimer.current !== undefined) clearTimeout(calldataHighlightTimer.current);
      calldataHighlightTimer.current = setTimeout(() => setCalldataHighlighted(false), 1400);
    });
  };
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string>();
  const [decoded, setDecoded] = useState<any>();
  const [decodedRequest, setDecodedRequest] = useState<ClearSigningRequest>();
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
  const explorerHref = useMemo(() => {
    const base = getPath(subdomains.CONTRACT.base);
    if (!recipientAddress) return base;
    const route = `${base}${chainId}/${recipientAddress}`;
    try {
      if (!calldata.trim()) return route;
      const link = new URL(createContractCallLink(new URL(base, "https://eth.sh").href,
        chainId, recipientAddress, {
          data: startHexWith0x(calldata.trim()),
          value: parseEther(ethValue || "0").toString(),
        }));
      return base.startsWith("/") ? `${link.pathname}${link.hash}` : link.href;
    } catch {
      // Incomplete edits can still open the contract without importing invalid data.
      return route;
    }
  }, [recipientAddress, chainId, calldata, ethValue]);
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
  const lastSuccessfulDecode = useRef<{
    key: string;
    result: NonNullable<DecodeRecursiveResult>;
    request: ClearSigningRequest;
  } | undefined>(undefined);
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
    // Start the editor chunk while recipient/ABI/nested decoding is in flight.
    void loadEditableCalldata().catch(() => {});
    const requestId = ++decodeRequestId.current;
    const key = JSON.stringify([calldata, to, chainId, savedChains.ready, savedChains.revision]);
    const cached = lastSuccessfulDecode.current;
    setIsDecodeModalOpen(true);
    if (cached?.key === key && (!recipientAddress || cached.request.to?.toLowerCase() === recipientAddress.toLowerCase())) {
      setDecodedRequest(cached.request);
      setDecoded(cached.result);
      setDecodeError(undefined);
      setIsDecoding(false);
      return;
    }
    setIsDecoding(true);
    setDecoded(undefined);
    setDecodeError(undefined);
    console.log("DECODING...");
    try {
      // recipientAddress already rejects resolutions belonging to an older input.
      const address = recipientAddress || (to ? await resolveNameToAddress(to) : undefined);
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
      if (res === null) {
        throw new Error("Unable to decode this calldata");
      }
      const request = { calldata: startHexWith0x(calldata), to: address || undefined, chainId };
      lastSuccessfulDecode.current = { key, result: res, request };
      setDecodedRequest(request);
      setDecoded(res);
    } catch (e: any) {
      if (requestId !== decodeRequestId.current) return;
      console.log("Error Decoding");
      setDecodeError(e.message || "Unable to decode this calldata");
    } finally {
      if (requestId === decodeRequestId.current) setIsDecoding(false);
    }
  }, [calldata, to, chainId, recipientAddress, savedChains.ready, savedChains.revision]);

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
        "&:has(> [data-tx-clear-signing] section)": {
          gridTemplateAreas: '"form" "summary"',
        },
        "@media (min-width: 1100px)": {
          "&:has(> [data-tx-clear-signing] section)": {
            maxWidth: "1200px",
            gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
            gridTemplateAreas: '"summary form"',
          },
        },
      }}
    >
      {summaryRequest && (
        <TransactionSummaryRail>
          <ClearSigningSummary {...summaryRequest} />
        </TransactionSummaryRail>
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
          <HStack justify="center" spacing={3} mb={3}>
            <Icon as={FiSend} color="blue.400" boxSize={8} flexShrink={0} />
            <Heading
              as="h1"
              size="xl"
              color="text.primary"
              fontWeight="bold"
              letterSpacing="tight"
            >
              <Button
                variant="unstyled"
                h="auto"
                fontSize="inherit"
                fontWeight="inherit"
                lineHeight="inherit"
                whiteSpace="normal"
                aria-label="Reset transaction form"
                title="Reset transaction form"
                isDisabled={isLoading || isSwitching}
                onClick={() => {
                  adoptedWalletChain.current = true;
                  initialChainInUrl.current = false;
                  setTransaction({ to: null, calldata: null, eth: null, chainId: null });
                  setSelectedEthFormatOption({ label: "ETH", value: "ETH" });
                  setEditingNetwork(false);
                  setLiveMismatch(null);
                  setStatus(null);
                  setSummaryPreview(null);
                  decodeRequestId.current++;
                  lastSuccessfulDecode.current = undefined;
                  setIsDecodeModalOpen(false);
                  setIsDecoding(false);
                  setDecoded(undefined);
                  setDecodeError(undefined);
                }}
              >
                Send Transaction
              </Button>
            </Heading>
          </HStack>
          <Text color="text.secondary" fontSize="md">
            Send calldata or deploy a contract.
          </Text>
          <HStack justify="center" spacing={2} mt={5} flexWrap="wrap" rowGap={2}>
            <Text fontSize="xs" color="text.tertiary">Example</Text>
            {transactionExamples.map((example) => (
              <Button
                key={example.label}
                size="sm"
                variant="outline"
                fontWeight="normal"
                borderRadius="full"
                borderColor="whiteAlpha.200"
                isDisabled={isLoading || isSwitching}
                onClick={() => {
                  adoptedWalletChain.current = true;
                  setLiveMismatch(null);
                  setStatus(null);
                  setEditingNetwork(false);
                  setIsDecodeModalOpen(false);
                  setDecoded(undefined);
                  setDecodeError(undefined);
                  setSelectedEthFormatOption({ label: "ETH", value: "ETH" });
                  setTransaction({
                    chainId: example.chainId,
                    to: example.to,
                    eth: example.eth,
                    calldata: example.calldata,
                  });
                }}
              >
                {example.label}
                <Text as="span" ml={2} color="text.tertiary" fontSize="xs">
                  {example.network}
                </Text>
              </Button>
            ))}
          </HStack>
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
              </HStack>
              <HStack spacing={2} align="stretch">
                <InputField
                  aria-label="To Address"
                  placeholder="Address or .eth, .gwei, .wei name.    Leave blank to deploy contract"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value.trim());
                  }}
                />
                {recipientAddress && (
                  <Tooltip label="Open in Contract Explorer">
                    <IconButton
                      as={Link}
                      href={explorerHref}
                      isExternal
                      aria-label="Open recipient in Contract Explorer"
                      icon={<ExternalLinkIcon boxSize={4} />}
                      variant="outline"
                      borderColor="whiteAlpha.200"
                      borderRadius="lg"
                      color="text.secondary"
                      flexShrink={0}
                      _hover={{ color: "text.primary", bg: "whiteAlpha.100" }}
                    />
                  </Tooltip>
                )}
              </HStack>
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
              <HStack spacing={2} align="center" minH={8} flexWrap="wrap">
                <Icon as={FiCode} color="blue.400" boxSize={5} />
                <Text color="gray.300" fontWeight="medium">
                  Calldata
                </Text>
                <Spacer />
                <HStack spacing={2} flexWrap="wrap" justify="flex-end" minW={0} flex={{ base: "1 1 100%", md: "0 1 auto" }}>
                  {recipientAddress && (
                    <Tooltip label="Open Contract Explorer with this calldata decoded into editable parameters.">
                      <Button
                        as="a"
                        href={explorerHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        variant="ghost"
                        color="primary.300"
                        rightIcon={<Icon as={FiArrowUpRight} boxSize={4} aria-hidden="true" />}
                      >
                        Edit in Contract Explorer
                      </Button>
                    </Tooltip>
                  )}
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
                ref={calldataInputRef}
                data-calldata-updated={isCalldataHighlighted ? "true" : undefined}
                aria-label="Calldata"
                placeholder="Enter calldata (hex)"
                value={calldata}
                onChange={(e) => {
                  setCalldata(e.target.value);
                }}
                spellCheck={false}
                data-gramm="false"
                minH="100px"
                borderRadius="lg"
                resize="vertical"
                bg={isCalldataHighlighted ? "blue.900" : "whiteAlpha.50"}
                border="1px solid"
                borderColor={isCalldataHighlighted ? "blue.400" : "whiteAlpha.200"}
                _hover={{ borderColor: isCalldataHighlighted ? "blue.300" : "whiteAlpha.300" }}
                boxShadow={isCalldataHighlighted ? "0 0 0 2px var(--chakra-colors-blue-400)" : "none"}
                transition="background-color 0.2s, border-color 0.2s, box-shadow 0.2s"
                sx={{ "@media (prefers-reduced-motion: reduce)": { transition: "none" } }}
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
            onCloseComplete={revealUpdatedCalldata}
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
                  <Suspense fallback={<DecodedCalldataSkeleton />}>
                    <EditableCalldata
                      result={decoded}
                      onUseCalldata={(encoded) => {
                        pendingCalldataReveal.current = true;
                        setCalldata(encoded);
                        setIsDecodeModalOpen(false);
                      }}
                      calldata={decodedRequest?.calldata}
                      chainId={decodedRequest?.chainId ?? chainId}
                      functionName={decodedFunctionName.name ?? decoded.functionName}
                      isFunctionNameGuessed={decodedFunctionName.isGuessed}
                      renderToolbar={(editButton, isEditing) => isEditing ? null : (
                        <HStack mb={2} justify="space-between" flexWrap="wrap">
                          <Box>{editButton}</Box>
                          <HStack flexWrap="wrap">
                            <CopyToClipboard
                              textToCopy={JSON.stringify({ function: decoded.signature, params: JSON.parse(stringify(decoded.rawArgs)) }, undefined, 2)}
                              labelText="Copy params"
                            />
                            <CopyToClipboard textToCopy={stringify(decoded, undefined, 2)} labelText="Copy decoded JSON" />
                          </HStack>
                        </HStack>
                      )}
                      getDecodeHref={(encoded, definitions) => createDecoderResultLink(
                        new URL(`${getPath(subdomains.CALLDATA.base)}decoder`, window.location.origin).toString(),
                        encoded, decoded, definitions,
                        { address: decodedRequest?.to, chainId: decodedRequest?.chainId }
                      )}
                    />
                  </Suspense>
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
              position="relative"
              w="full"
              p={4}
              bg="bg.subtle"
              border="1px solid"
              borderColor="border.default"
              borderRadius="lg"
              scrollMarginBottom={6}
            >
              <IconButton
                aria-label="Dismiss transaction status"
                icon={<FiX />}
                variant="ghost"
                size="sm"
                position="absolute"
                top={2}
                right={2}
                onClick={() => setStatus(null)}
              />
              <HStack align="start" spacing={3} pr={8}>
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
