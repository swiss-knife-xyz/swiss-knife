"use client";

import { useCustomChains } from "@/lib/customChains/store";
import { NetworkSelect } from "@/components/NetworkSelect";
import dynamic from "next/dynamic";
import { ClearSigningScrollArea } from "@/components/ClearSigning/ClearSigningScrollArea";
import type { ClearSigningRequest } from "@/lib/clearSigning/resolve";
import { createContractCallLink } from "@/lib/contractCall";
import { parseJsonAbi } from "@/lib/parseJsonAbi";
import { ToolLoading } from "@/components/ToolLoading";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useBeforeFooterSlot } from "@/components/BeforeFooterSlot";
import {
  Heading,
  Box,
  useToast,
  Stack,
  FormControl,
  FormLabel,
  Switch,
  Tooltip,
  Collapse,
  useDisclosure,
  HStack,
  VStack,
  Spacer,
  Text,
  useUpdateEffect,
  Link,
  Button,
  Icon,
  Tabs,
  TabList,
  Tab,
  IconButton,
  SimpleGrid,
  Skeleton,
  Input,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  LinkIcon,
  InfoOutlineIcon,
} from "@chakra-ui/icons";
import {
  FiCode,
  FiFileText,
  FiMapPin,
  FiLink,
  FiSettings,
  FiArrowRight,
} from "react-icons/fi";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { Hex, stringify } from "viem";
import { parseTransactionExplorerUrl } from "@/lib/contractExplorerInput";
import { getPublicClient } from "@/lib/publicClient";
import {
  DecodeRecursiveResult,
  SelectedOptionState,
  DecodeEventResult,
} from "@/types";
import {
  chainIdToChain,
  erc3770ShortNameToChain,
  networkOptions,
} from "@/data/common";
import { getPath, resolveERC3770Address, startHexWith0x } from "@/utils";
import subdomains from "@/subdomains";
import { ContentSizedEditor } from "@/components/ContentSizedEditor";

import { InputField } from "@/components/InputField";
import { AddressBookButton } from "@/components/AddressBook/AddressBookButton";
import { CalldataTree } from "@/components/decodedParams/CalldataTree";
import { EditableCalldata } from "@/components/calldata/EditableCalldata";
import { SignatureRegistryForm } from "@/components/SignatureRegistryForm";
import { DarkButton } from "@/components/DarkButton";
import TabsSelector from "@/components/Tabs/TabsSelector";

import { CopyToClipboard } from "@/components/CopyToClipboard";
import { createDecoderResultLink, createDecoderShareLink, parseDecoderShareFragment } from "@/lib/decoderShare";
import { decodeEvents, decodeRecursive } from "@/lib/decoder";
import { getDisplayFunctionName } from "@/utils/functionNames";
import { decoderSamples, decoderRevertSample } from "./samples";
import { findExampleDeepLink, getExampleSnapshot } from "./exampleSnapshots";
import { ExampleSnapshotContext } from "@/components/decodedParams/ExampleSnapshotContext";

const noMetadataNetwork = { label: "None", value: 0 };

// Presentation only; the sample data and click behavior come from decoderSamples.
const decoderExamples = [...decoderSamples, decoderRevertSample];
type DecoderSamplePreview = (typeof decoderExamples)[number]["preview"];

// Purely visual pause before revealing a saved example; nothing is fetched.
const EXAMPLE_PREPARE_DELAY_MS = 450;

const skeletonMotionSx = {
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
};

// Preview-shaped placeholder matching the decoded result block.
function ExamplePreviewSkeleton() {
  return (
    <Box
      role="status"
      aria-label="Preparing example preview"
      aria-busy="true"
      w="full"
      minW={0}
    >
      <Box aria-hidden>
        <HStack mb={3} justify="space-between">
          <Skeleton h={4} w="120px" borderRadius="md" sx={skeletonMotionSx} />
          <Skeleton h={6} w="180px" borderRadius="md" sx={skeletonMotionSx} />
        </HStack>
        <Stack
          spacing={3}
          p={4}
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
        >
          <Skeleton h={5} w="40%" borderRadius="md" sx={skeletonMotionSx} />
          {["85%", "70%", "78%", "55%"].map((width, index) => (
            <HStack key={index} spacing={3} pl={4}>
              <Skeleton h={4} w="80px" borderRadius="md" sx={skeletonMotionSx} />
              <Skeleton h={4} w={width} borderRadius="md" sx={skeletonMotionSx} />
            </HStack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

// Static, fixture-verified excerpt of what decoding shows (see samples.test.ts).
// Rendered with spans because it lives inside the sample <button>.
function SampleCallPreview({
  id,
  preview,
}: {
  id: string;
  preview: DecoderSamplePreview;
}) {
  const calls = preview.calls as readonly {
    name: string;
    args: readonly string[];
  }[];
  const rows: { marker: string; content: React.ReactNode }[] = calls.map(
    (call, index) => ({
      marker: String(index + 1),
      content: (
        <>
          <Box as="span" color="blue.300">
            {call.name}
          </Box>
          <Box as="span" color="whiteAlpha.700">
            ({call.args.join(", ")})
          </Box>
        </>
      ),
    })
  );
  if ("detail" in preview) {
    rows.push({
      marker: "↳",
      content: (
        <Box as="span" color="whiteAlpha.600">
          {preview.detail.arg}: ({preview.detail.fields.join(", ")})
        </Box>
      ),
    });
  }

  return (
    <Box
      as="span"
      id={id}
      display="block"
      px={3}
      py={2}
      bg="blackAlpha.300"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="md"
      fontFamily="mono"
      fontSize="xs"
      lineHeight="1.5rem"
    >
      {rows.map((row, index) => (
        <Box as="span" key={index} display="flex" gap={3} minW={0}>
          <Box
            as="span"
            aria-hidden
            flexShrink={0}
            w="1ch"
            textAlign="right"
            color="whiteAlpha.400"
          >
            {row.marker}
          </Box>
          <Box
            as="span"
            display="block"
            flex={1}
            minW={0}
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {row.content}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function DecoderSettings({
  selectedOption,
  setSelectedOption,
  showNetwork,
  revertMode,
  onRevertModeChange,
  isDecoding,
}: {
  showNetwork: boolean;
  revertMode: boolean;
  onRevertModeChange: (checked: boolean) => void;
  isDecoding: boolean;
  selectedOption: SelectedOptionState;
  setSelectedOption: (value: SelectedOptionState) => void;
}) {
  const isActive = showNetwork && !!selectedOption?.value;
  const [isOpen, setIsOpen] = useState(false);
  const panelId = React.useId();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  // react-select consumes Escape to close its own list; keep the panel open then.
  const menuWasOpen = React.useRef(false);

  const close = (returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // Move focus into the panel once its select has mounted (DarkSelect renders
  // a non-focusable placeholder for its first commit).
  useEffect(() => {
    if (!isOpen) return;
    let frame = 0;
    let tries = 0;
    const focusFirst = () => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), button:not([disabled])"
      );
      if (target) target.focus();
      else if (tries++ < 10) frame = requestAnimationFrame(focusFirst);
      else panelRef.current?.focus();
    };
    focusFirst();
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  // Dismiss on a pointer press anywhere outside the gear and panel.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  return (
    <Box
      ref={wrapperRef}
      position="relative"
      flexShrink={0}
      onKeyDownCapture={(e) => {
        // The gear also carries aria-expanded; only nested list inputs count.
        menuWasOpen.current =
          e.key === "Escape" &&
          e.target !== triggerRef.current &&
          (e.target as HTMLElement).getAttribute?.("aria-expanded") === "true";
      }}
      onKeyDown={(e) => {
        const nestedListWasOpen = menuWasOpen.current;
        menuWasOpen.current = false;
        if (e.key !== "Escape" || !isOpen || nestedListWasOpen) return;
        e.preventDefault();
        e.stopPropagation();
        close(true);
      }}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (isOpen && next && !wrapperRef.current?.contains(next)) {
          close(false);
        }
      }}
    >
      <IconButton
        ref={triggerRef}
        aria-label="Decoder settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => (isOpen ? close(true) : setIsOpen(true))}
        title={
          isActive
            ? `Network lookup: ${selectedOption!.label}`
            : "Decoder settings"
        }
        icon={<Icon as={FiSettings} boxSize={4} />}
        size="sm"
        variant="ghost"
        position="relative"
        color={isActive ? "blue.400" : "whiteAlpha.700"}
        _hover={{ bg: "whiteAlpha.100", color: "white" }}
        _focusVisible={{
          outline: "none",
          boxShadow: "0 0 0 3px rgba(59,130,246,0.4)",
        }}
        _after={
          revertMode || isActive
            ? {
                content: '""',
                position: "absolute",
                top: "5px",
                right: "5px",
                w: "6px",
                h: "6px",
                borderRadius: "full",
                bg: revertMode ? "red.400" : "blue.400",
              }
            : undefined
        }
      />
      {isOpen && (
        <Box
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Decoder settings"
          tabIndex={-1}
          position="absolute"
          top="calc(100% + 8px)"
          right={0}
          zIndex="popover"
          w="280px"
          maxW="calc(100vw - 2rem)"
          p={3}
          bg="bg.muted"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          boxShadow="lg"
          textAlign="left"
          _focusVisible={{ outline: "none" }}
        >
          {showNetwork && <Box mb={3} pb={3} borderBottom="1px solid" borderColor="whiteAlpha.100">
          <Text fontSize="sm" fontWeight="medium" color="white" mb={1}>
            Network lookup
          </Text>
          <Text fontSize="xs" color="whiteAlpha.700" mb={2}>
            Optional: shows token and contract names. Decoding works without it.
          </Text>
          <NetworkSelect
            ariaLabel="Network lookup"
            size="sm"
            options={[noMetadataNetwork, ...networkOptions]}
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
          />
          </Box>}
          <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={3}>
            <HStack spacing={1}>
              <FormLabel htmlFor={`${panelId}-revert`} mb={0} mr={0} fontSize="sm" color="text.secondary">
                Interpret as revert data?
              </FormLabel>
              <Tooltip label="Decode a contract error instead of a function call. Resets for each new input." hasArrow>
                <IconButton
                  aria-label="About revert decoding"
                  icon={<InfoOutlineIcon boxSize={3.5} />}
                  size="xs"
                  variant="ghost"
                  color="text.tertiary"
                  minW={5}
                  h={5}
                />
              </Tooltip>
            </HStack>
            <Switch
              id={`${panelId}-revert`}
              aria-label="Interpret as revert data?"
              isChecked={revertMode}
              isDisabled={isDecoding}
              onChange={event => onRevertModeChange(event.target.checked)}
              colorScheme="blue"
            />
          </FormControl>
        </Box>
      )}
    </Box>
  );
}

function DecoderTabs({
  tabs,
  selectedTabIndex,
  setSelectedTabIndex,
}: {
  tabs: string[];
  selectedTabIndex: number;
  setSelectedTabIndex: (index: number) => void;
}) {
  return (
    <Tabs
      index={selectedTabIndex}
      onChange={setSelectedTabIndex}
      variant="unstyled"
    >
      <TabList
        w="full"
        maxW="full"
        flexWrap="wrap"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        gap={1}
      >
        {tabs.map((label) => (
          <Tab
            key={label}
            px={{ base: 2, md: 4 }}
            py={2}
            fontSize="sm"
            borderBottom="2px solid"
            borderColor="transparent"
            color="whiteAlpha.700"
            _selected={{ borderColor: "text.primary", color: "text.primary" }}
            _hover={{ bg: "whiteAlpha.100", color: "white" }}
            _focusVisible={{ outline: "2px solid", outlineColor: "blue.400" }}
          >
            {label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}

const ClearSigningSummary = dynamic(() => import("@/components/ClearSigning/ClearSigningSummary"), { ssr: false });

function CalldataDecoderPageContent({ headerText }: { headerText?: string }) {
  const savedChains = useCustomChains();
  const toast = useToast();
  const searchParams = useSearchParams();
  const beforeFooterSlot = useBeforeFooterSlot();
  const focusInputOnMount = React.useRef(searchParams.toString() === "");

  useEffect(() => {
    if (!focusInputOnMount.current) return;
    // Next's route transition can scroll the page heading above the navbar.
    // Run after that layout pass so an empty visit starts at the page top.
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("decoder-calldata")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // get data from URL
  const calldataFromURL = searchParams.get("calldata");
  const addressFromURL = searchParams.get("address");
  const chainIdFromURL = searchParams.get("chainId");
  const txFromURL = searchParams.get("tx");

  const networkOptionsIndex = chainIdFromURL
    ? networkOptions.findIndex(
        (option) => option.value === parseInt(chainIdFromURL)
      )
    : 0;

  const [calldata, setCalldata] = useQueryState<string>(
    "calldata",
    parseAsString.withDefault("")
  );
  // can be function calldata or abi.encode bytes
  const [liveResult, setResult] = useState<DecodeRecursiveResult>();
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareModalLink, setShareModalLink] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);
  const [liveEvents, setDecodedEvents] = useState<
    DecodeEventResult[] | null
  >(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Establish the URL's mode before effects synchronize or clear query params.
  const [selectedTabIndex, setSelectedTabIndex] = useState(() =>
    calldataFromURL ? (addressFromURL ? 2 : 0) : txFromURL ? 3 : 0
  );
  const [resultTabIndex, setResultTabIndex] = useState(0); // 0 = Calldata, 1 = Events

  const [abi, setAbi] = useState<any>();

  const [contractAddress, setContractAddress] = useQueryState<string>(
    "address",
    parseAsString.withDefault("")
  );
  const [chainId, setChainId] = useQueryState<number>(
    "chainId",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: false })
  );
  const [metadataNetwork, setMetadataNetwork] = useState<SelectedOptionState>(
    networkOptions.find((option) => String(option.value) === chainIdFromURL) ??
      noMetadataNetwork
  );
  const metadataChainId = metadataNetwork?.value
    ? Number(metadataNetwork.value)
    : undefined;
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[networkOptionsIndex]);

  useEffect(() => {
    if (!savedChains.ready || !chainIdFromURL) return;
    const option = networkOptions.find(option => option.value === Number(chainIdFromURL));
    if (option) { setSelectedNetworkOption(option); setMetadataNetwork(option); }
  }, [savedChains.ready]);

  const [fromTxInput, setFromTxInput] = useQueryState<string>(
    "tx",
    parseAsString.withDefault("")
  );
  const [decodeMode, setDecodeMode] = useQueryState("mode", parseAsString.withDefault("auto"));
  const requestId = React.useRef(0);
  const [clearSigningRequest, setClearSigningRequest] = useState<ClearSigningRequest>();
  const [draftSummary, setDraftSummary] = useState<{
    source: NonNullable<DecodeRecursiveResult>;
    calldata: string | null | undefined;
  }>();
  const [clearSigningVisibleFor, setClearSigningVisibleFor] = useState<DecodeRecursiveResult>();
  const updateDraftSummary = React.useCallback((source: NonNullable<DecodeRecursiveResult>, calldata: string | null | undefined) => {
    setDraftSummary(previous => previous?.source === source && previous.calldata === calldata ? previous : { source, calldata });
  }, []);
  const [example, setExample] = useState<{
    sample: (typeof decoderSamples)[number];
    input: string;
  } | undefined>(() => {
    if (!txFromURL || calldataFromURL) return undefined;
    const sample = findExampleDeepLink(txFromURL, chainIdFromURL);
    return sample ? { sample, input: txFromURL } : undefined;
  });
  const [txShowSelectNetwork, setTxShowSelectNetwork] = useState(Boolean(example));

  // Each selection (or repeat Decode) creates a new `example` object; its saved
  // snapshot is only revealed once this brief visual preparation delay has
  // elapsed for that exact object, so stale timers can never reveal anything.
  const [readyExample, setReadyExample] = useState<typeof example | undefined>(
    undefined
  );
  useEffect(() => {
    if (!example) return;
    const timer = setTimeout(
      () => setReadyExample(example),
      EXAMPLE_PREPARE_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [example]);

  const selectedSnapshot = example && selectedTabIndex === 3 &&
    fromTxInput === example.input &&
    Number(selectedNetworkOption?.value) === example.sample.chainId &&
    chainId === example.sample.chainId
    ? getExampleSnapshot(example.sample)
    : undefined;
  const isPreparingExample = !!selectedSnapshot && readyExample !== example;
  const snapshot = isPreparingExample ? undefined : selectedSnapshot;
  const result = isPreparingExample ? undefined : snapshot?.result ?? liveResult;
  const summaryRequest = snapshot?.clearSigningRequest ?? clearSigningRequest;
  const draftCalldata = draftSummary && draftSummary.source === result ? draftSummary.calldata : undefined;
  const hasDynamicSummary = draftCalldata !== undefined && draftCalldata !== summaryRequest?.calldata;
  const previewSummaryRequest = summaryRequest && typeof draftCalldata === "string"
    ? { ...summaryRequest, calldata: draftCalldata }
    : summaryRequest;
  const contractExplorerHref = useMemo(() => {
    const selectedChain = Number(selectedNetworkOption?.value);
    const transactionChain = parseTransactionExplorerUrl(fromTxInput)?.chainId ?? selectedChain;
    const request = selectedTabIndex === 3 && fromTxInput.trim() &&
      summaryRequest?.chainId === transactionChain ? summaryRequest : undefined;
    const destination = selectedTabIndex === 2 ? contractAddress : request?.to;
    const destinationChain = selectedTabIndex === 2 ? selectedChain : request?.chainId;
    if (!destination || !/^0x[\da-f]{40}$/i.test(destination) || !destinationChain) return undefined;
    const base = getPath(subdomains.CONTRACT.base);
    const route = `${base}${destinationChain}/${destination}`;
    const data = selectedTabIndex === 2 ? calldata : request?.calldata;
    if (!data?.trim()) return route;
    try {
      const link = new URL(createContractCallLink(new URL(base, "https://eth.sh").href,
        destinationChain, destination, { data: startHexWith0x(data.trim()), value: request?.value ?? "0" }));
      return base.startsWith("/") ? `${link.pathname}${link.hash}` : link.href;
    } catch {
      return route;
    }
  }, [selectedTabIndex, selectedNetworkOption, contractAddress, calldata, fromTxInput, summaryRequest]);

  const renderContractExplorerLink = () => contractExplorerHref ? (
    <HStack justify="flex-end" w="full">
      <Button as={Link} href={contractExplorerHref} isExternal size="sm" variant="ghost"
        color="primary.300" rightIcon={<ExternalLinkIcon boxSize={3} />}>
        Open in Contract Explorer
      </Button>
    </HStack>
  ) : null;

  const rememberSummaryVisibility = React.useCallback((visible: boolean) => {
    if (visible) setClearSigningVisibleFor(result);
  }, [result]);
  const decodedEvents = isPreparingExample
    ? null
    : snapshot?.events ?? liveEvents;

  const leaveExample = () => {
    if (example) {
      setExample(undefined);
      setResultTabIndex(0);
    }
  };

  const changeTransactionDraft = (value: string) => {
    if (value !== fromTxInput) {
      // Supersede the transaction lookup, decode and receipt/event work together.
      requestId.current++;
      leaveExample();
      setResult(undefined);
      setDecodedEvents(null);
      setClearSigningRequest(undefined);
      setIsLoading(false);
      setIsLoadingEvents(false);
      setResultTabIndex(0);
      setShareLink(null);
      setShareModalLink(null);
    }
    setFromTxInput(value);
  };

  const showExample = (sample: (typeof decoderSamples)[number], input: string) => {
    requestId.current++;
    setResult(undefined);
    setDecodedEvents(null);
    setIsLoading(false);
    setIsLoadingEvents(false);
    setResultTabIndex(0);
    setSelectedTabIndex(3);
    setFromTxInput(input);
    setSelectedNetworkOption(
      networkOptions.find((option) => option.value === sample.chainId)!
    );
    setTxShowSelectNetwork(true);
    setChainId(sample.chainId);
    setExample({ sample, input });
  };

  useEffect(() => {
    try {
      const functions = parseDecoderShareFragment(window.location.hash);
      if (functions) {
        if (!calldataFromURL) throw new Error("Shared decode link is missing calldata.");
        setSelectedTabIndex(1);
        setAbi(JSON.stringify(functions, null, 2));
        decode({ _calldata: calldataFromURL, _abi: functions });
        return;
      }
    } catch (error) {
      toast({ title: "Invalid shared decode link", description: error instanceof Error ? error.message : "Unable to restore function definitions.", status: "error", isClosable: true });
      return;
    }
    if (calldataFromURL && addressFromURL) {
      setSelectedTabIndex(2);
      decode({
        _calldata: calldataFromURL,
        _address: addressFromURL,
        // Use the same parsed chain (including the Ethereum default) as Decode.
        _chainId: chainId,
      });
    } else if (calldataFromURL) {
      decode({ _calldata: calldataFromURL });
    } else if (txFromURL && !example) {
      setSelectedTabIndex(3);
      decodeFromTx(
        txFromURL,
        chainIdFromURL === null ? undefined : parseInt(chainIdFromURL)
      );
    }
  }, []);

  useUpdateEffect(() => {
    if (selectedTabIndex === 0) {
      setContractAddress(null);
      setChainId(metadataChainId ?? null);
      setFromTxInput(null);
    } else if (selectedTabIndex === 1) {
      setContractAddress(null);
      setChainId(null);
      setFromTxInput(null);
    } else if (selectedTabIndex === 2) {
      setFromTxInput(null);
    } else if (selectedTabIndex === 3) {
      setCalldata(null);
      setContractAddress(null);
    }
    // Reset result tab when switching main tabs
    setResultTabIndex(0);
  }, [selectedTabIndex]);

  useEffect(() => {
    if (selectedTabIndex === 0) {
      setChainId(metadataChainId ?? null);
    } else if (selectedTabIndex === 2) {
      setChainId(parseInt(selectedNetworkOption!.value.toString()));
    } else if (selectedTabIndex === 3) {
      if (txShowSelectNetwork) {
        setChainId(parseInt(selectedNetworkOption!.value.toString()));
      } else {
        setChainId(null);
      }
    } else if (!abi) {
      setChainId(null);
    }
  }, [
    txShowSelectNetwork,
    selectedNetworkOption,
    selectedTabIndex,
    metadataChainId,
  ]);

  // not using useEffect because else it loads the page with selectedTabIndex = 0 as default, and removes the address & chainId
  useUpdateEffect(() => {
    if (pasted && selectedTabIndex === 0) {
      decode({});
      setPasted(false);
    }

    // remove from url params if calldata updated
    if (selectedTabIndex === 0 || selectedTabIndex === 1) {
      setContractAddress(null);
      if (selectedTabIndex === 1) setChainId(null);
    }
  }, [calldata]);

  const resolvedFunctionName = useMemo(
    () =>
      getDisplayFunctionName(result?.functionName, result?.guessedFunctionName),
    [result]
  );
  const decodedJson = useMemo(
    () => (result ? stringify(result, undefined, 2) : ""),
    [result]
  );
  const pageTitle = headerText ?? "Calldata Decoder";

  // Bring each newly revealed result into view, tab bar (tx) or header first.
  // Keyed on the result object itself: events, metadata, tab and expand state
  // never change it, while a new decode or a re-gated example reveal does.
  const resultAnchorRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result) return;
    const frame = requestAnimationFrame(() => {
      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const anchor = resultAnchorRef.current;
      if (typeof anchor?.scrollIntoView !== "function") return;
      anchor.scrollIntoView({
        // `auto` would inherit the site's CSS smooth scrolling.
        behavior: reduceMotion ? "instant" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [result]);

  useEffect(() => {
    document.title = `${
      resolvedFunctionName.name ? `${resolvedFunctionName.name} - ` : ""
    }${pageTitle} | ETH.sh`;
  }, [pageTitle, resolvedFunctionName.name]);

  const decode = async ({
    _calldata,
    _address,
    _chainId,
    _abi,
    _from,
    _value,
    _mode,
    id,
  }: {
    _calldata?: string;
    _address?: string;
    _chainId?: number;
    _abi?: any;
    _from?: string;
    _value?: string;
    _mode?: "auto" | "revert";
    id?: number;
  }) => {
    if (id === undefined) {
      id = ++requestId.current;
      setDecodedEvents(null);
      setResultTabIndex(0);
      setIsLoadingEvents(false);
    }
    const __calldata = _calldata || calldata;

    setShareLink(null);
    setShareModalLink(null);
    setResult(undefined);
    setIsLoading(true);
    console.log("DECODING...");
    try {
      const suppliedAbi = typeof _abi === "string" ? parseJsonAbi(_abi) : _abi;
      const res = await decodeRecursive({
        calldata: startHexWith0x(__calldata),
        address: _address,
        chainId: _chainId,
        abi: suppliedAbi,
        mode: _mode ?? (selectedTabIndex !== 3 && decodeMode === "revert" ? "revert" : "auto"),
      });
      if (id !== requestId.current) return;
      console.log({ DECODED_RESULT: res });
      setResult(res);
      setClearSigningRequest(res?.kind === "revert" ? undefined : { calldata: startHexWith0x(__calldata), to: _address, chainId: _chainId, from: _from, value: _value });
      try {
        const baseUrl = new URL(`${getPath(subdomains.CALLDATA.base)}decoder`, window.location.origin);
        setShareLink(createDecoderShareLink(baseUrl.toString(), startHexWith0x(__calldata), res, suppliedAbi));
      } catch {
        // A synthetic or oversized decode can still be viewed and copied as JSON.
        setShareLink(null);
      }

      if (res !== null) {
        toast({
          title: "Successfully Decoded",
          status: "success",
          isClosable: true,
          duration: 1000,
        });
      } else {
        throw new Error("Unable to decode this calldata");
      }
    } catch (e: any) {
      if (id !== requestId.current) return;
      console.log("Error Decoding");
      toast({
        title: "Error",
        description: e.message,
        status: "error",
        isClosable: true,
        duration: 4000,
      });
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  };

  const decodeFromTx = async (_fromTxInput?: string, _chainId?: number) => {
    if (!_fromTxInput && selectedSnapshot && example) {
      showExample(example.sample, example.input);
      return;
    }
    leaveExample();
    const id = ++requestId.current;
    setResult(undefined);
    console.log("decodeFromTx called");
    setIsLoading(true);
    setDecodedEvents(null);
    setIsLoadingEvents(false);
    setResultTabIndex(0); // Reset to Calldata tab for new decode

    const __fromTxInput = _fromTxInput || fromTxInput;

    console.log({ __fromTxInput, _chainId, selectedNetworkOption });

    let chain =
      chainIdToChain[
        _chainId ?? parseInt(selectedNetworkOption!.value.toString())
      ];
    try {
      let txHash: string;
      if (/^0x([A-Fa-f0-9]{64})$/.test(__fromTxInput)) {
        txHash = __fromTxInput;

        if (!txShowSelectNetwork) {
          setTxShowSelectNetwork(true);
          if (!_chainId) {
            setIsLoading(false);
            console.log("decodeFromTx early return: network not selected");
            return;
          }
        }
      } else {
        const explorer = parseTransactionExplorerUrl(__fromTxInput);
        if (!explorer) throw new Error("Enter a valid explorer transaction URL");
        txHash = explorer.hash;
        chain = chainIdToChain[explorer.chainId];
        setSelectedNetworkOption(networkOptions.find(option => option.value === explorer.chainId) ?? null);
        setTxShowSelectNetwork(true);
      }

      const publicClient = getPublicClient(chain.id);
      const transaction = await publicClient.getTransaction({
        hash: txHash as Hex,
      });

      if (id !== requestId.current) return;
      // Start decoding calldata first (priority)
      decode({
        _calldata: transaction.input,
        _mode: "auto",
        _address: transaction.to ?? undefined,
        _from: transaction.from,
        _value: transaction.value?.toString(),
        _chainId: chain.id,
        id,
      });

      // Decode events in the background (non-blocking)
      setIsLoadingEvents(true);
      publicClient
        .getTransactionReceipt({
          hash: txHash as Hex,
        })
        .then(async (txReceipt) => {
          if (id !== requestId.current) return;
          try {
            console.log("decodeEvents about to be called (background)");
            const events = await decodeEvents({
              logs: txReceipt.logs.map((log) => ({
                topics: log.topics,
                data: log.data,
              })),
              chainId: chain.id,
              address: transaction.to!,
            });
            console.log({ DECODED_EVENTS: events });
            if (id === requestId.current) setDecodedEvents(events);
          } catch (e: any) {
            console.log("Failed to decode events:", e.message);
            if (id === requestId.current) setDecodedEvents([]);
          } finally {
            if (id === requestId.current) setIsLoadingEvents(false);
          }
        })
        .catch((e) => {
          if (id !== requestId.current) return;
          console.log("Failed to get tx receipt:", e.message);
          setDecodedEvents([]);
          setIsLoadingEvents(false);
        });
    } catch {
      if (id !== requestId.current) return;
      setIsLoading(false);
      setIsLoadingEvents(false);
      toast({
        title: "Can't fetch transaction",
        status: "error",
        isClosable: true,
        duration: 4000,
      });
    }
  };

  const FromABIBody = () => {
    const handleAbiChange = (value: string | undefined) => {
      const newValue = value || "";

      // Try to prettify if it's valid JSON
      try {
        const parsed = JSON.parse(newValue);
        const prettified = JSON.stringify(parsed, null, 2);
        // Only update if the prettified version is different
        if (prettified !== newValue) {
          setAbi(prettified);
          return;
        }
      } catch (e) {
        // Not valid JSON or already formatted, just set as is
      }

      setAbi(newValue);
    };

    return (
      <Box w="full">
        <FormControl>
          <FormLabel color="gray.400" fontSize="sm" fontWeight="medium">
            Input ABI
          </FormLabel>
          <Box
            borderRadius="lg"
            overflow="hidden"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <ContentSizedEditor
              theme="vs-dark"
              defaultLanguage="json"
              value={abi}
              onChange={handleAbiChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </Box>
        </FormControl>
      </Box>
    );
  };

  const FromAddressBody = () => {
    const { isOpen, onToggle } = useDisclosure();

    return (
      <VStack spacing={4} w="full" align="stretch">
        <HStack
          spacing={4}
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
          flexWrap={{ base: "wrap", md: "nowrap" }}
        >
          <Box minW="140px">
            <VStack spacing={0} align="start">
              <HStack spacing={2}>
                <Icon as={FiMapPin} color="blue.400" boxSize={4} />
                <Text color="gray.300" fontWeight="medium">
                  Contract Address
                </Text>
              </HStack>
            </VStack>
          </Box>
          <Box flex={1} minW="200px">
            <HStack justify="flex-end" mb={1}>
              <AddressBookButton onSelect={setContractAddress} />
            </HStack>
            <InputField
              placeholder="0x... or eth:0x..."
              value={contractAddress}
              onChange={(e) => {
                const input = e.target.value;
                const res = resolveERC3770Address(input);
                setContractAddress(res.address);
                if (res.chainId) {
                  const _networkIndex = networkOptions.findIndex(
                    (option) => option.value === res.chainId
                  );
                  setSelectedNetworkOption(networkOptions[_networkIndex]);
                }
              }}
            />
          </Box>
        </HStack>

        <HStack
          spacing={4}
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
          flexWrap={{ base: "wrap", md: "nowrap" }}
        >
          <Box minW="140px">
            <HStack spacing={2}>
              <Icon as={FiLink} color="blue.400" boxSize={4} />
              <Text color="gray.300" fontWeight="medium">
                Chain
              </Text>
            </HStack>
          </Box>
          <Box flex={1} minW="200px">
            <NetworkSelect
              boxProps={{
                w: "100%",
              }}
              selectedOption={selectedNetworkOption}
              setSelectedOption={setSelectedNetworkOption}
              options={networkOptions}
            />
          </Box>
        </HStack>

        {abi && (
          <Box w="full">
            <FormControl>
              <HStack
                p={3}
                bg="whiteAlpha.100"
                borderRadius="lg"
                cursor="pointer"
                onClick={onToggle}
                _hover={{ bg: "whiteAlpha.200" }}
                mb={isOpen ? 2 : 0}
              >
                <HStack spacing={2}>
                  <Icon as={FiFileText} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    ABI
                  </Text>
                </HStack>
                <Spacer />
                <CopyToClipboard textToCopy={abi} />
                <Text fontSize="xl" fontWeight="bold" color="gray.400">
                  {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </Text>
              </HStack>
              <Collapse in={isOpen} animateOpacity>
                <Box
                  borderRadius="lg"
                  overflow="hidden"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  <ContentSizedEditor
                    theme="vs-dark"
                    defaultLanguage="json"
                    value={abi}
                    onChange={(value) => setAbi(value || "")}
                          options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </Box>
              </Collapse>
            </FormControl>
          </Box>
        )}
        {renderContractExplorerLink()}
      </VStack>
    );
  };

  const FromTxBody = () => {
    const value = fromTxInput.trim();
    const explorerBase = chainIdToChain[Number(selectedNetworkOption?.value)]?.blockExplorers?.default?.url;
    const explorerHref = /^0x[\da-f]{64}$/i.test(value)
      ? explorerBase ? `${explorerBase.replace(/\/$/, "")}/tx/${value}` : undefined
      : /^https?:\/\//i.test(value) ? value : undefined;
    return (
      <VStack spacing={4} w="full" align="stretch">
        <HStack
          spacing={4}
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
          flexWrap={{ base: "wrap", md: "nowrap" }}
        >
          <Box minW="140px">
            <HStack spacing={2}>
              <Icon as={FiLink} color="blue.400" boxSize={4} />
              <Text color="gray.300" fontWeight="medium">
                Transaction
              </Text>
            </HStack>
          </Box>
          <Box flex={1} minW="200px">
            <HStack>
              <InputField
                placeholder="etherscan link / tx hash"
                value={fromTxInput}
                onChange={(e) => {
                  changeTransactionDraft(e.target.value);
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  setPasted(true);
                  const _fromTxInput = e.clipboardData.getData("text");
                  changeTransactionDraft(_fromTxInput);
                  if (_fromTxInput.trim()) decodeFromTx(_fromTxInput);
                }}
              />
              {explorerHref && (
                <Link href={explorerHref} title="View on explorer" aria-label="View transaction on block explorer" isExternal>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    _hover={{ bg: "whiteAlpha.100" }}
                  >
                    <ExternalLinkIcon />
                  </Button>
                </Link>
              )}
            </HStack>
          </Box>
        </HStack>

        {txShowSelectNetwork && (
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
            flexWrap={{ base: "wrap", md: "nowrap" }}
          >
            <Box minW="140px">
              <HStack spacing={2}>
                <Icon as={FiLink} color="blue.400" boxSize={4} />
                <Text color="gray.300" fontWeight="medium">
                  Chain
                </Text>
              </HStack>
            </Box>
            <Box flex={1} minW="200px">
              <NetworkSelect
                boxProps={{
                  w: "100%",
                }}
                selectedOption={selectedNetworkOption}
                setSelectedOption={(option) => {
                  if (option?.value !== selectedNetworkOption?.value) leaveExample();
                  setSelectedNetworkOption(option);
                }}
                options={networkOptions}
              />
            </Box>
          </HStack>
        )}
        {renderContractExplorerLink()}
      </VStack>
    );
  };

  const renderTabsBody = () => {
    switch (selectedTabIndex) {
      case 0:
        // The optional metadata network lives behind the gear in the calldata row.
        return null;
      case 1:
        return FromABIBody();
      case 2:
        return <FromAddressBody />;
      case 3:
        return <FromTxBody />;
      default:
        return null;
    }
  };

  return (
    <Box p={{ base: 0, md: 2 }} w="full" minW={0} mx="auto">
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiCode} color="blue.400" boxSize={8} />
          <Heading
            as="h1"
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            {headerText ? (
              pageTitle
            ) : (
              // Native anchor: a full load of the query-free root clears all
              // form, query and result state.
              <Link
                href={`${getPath(subdomains.CALLDATA.base)}decoder`}
                color="inherit"
                borderRadius="md"
                _hover={{ textDecoration: "none", color: "white" }}
                _focusVisible={{
                  outline: "none",
                  boxShadow: "0 0 0 3px rgba(59,130,246,0.4)",
                }}
              >
                {pageTitle}
              </Link>
            )}
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Decode Ethereum calldata with or without ABI, from contract address,
          or directly from transaction
        </Text>
      </Box>

      <Box id="decoder-input">
        {/* Tab Selector */}
        <Box mb={6}>
          <TabsSelector
            tabs={["No ABI", "from ABI", "from Address", "from Tx"]}
            selectedTabIndex={selectedTabIndex}
            setSelectedTabIndex={(index) => {
              if (index !== selectedTabIndex) leaveExample();
              setSelectedTabIndex(index);
            }}
          />
        </Box>

        {/* Input Section */}
        <VStack
          spacing={4}
          align="stretch"
          w="full"
          maxW="800px"
          mx="auto"
          mb={6}
        >
          {/* Calldata Input - shown for all tabs except "from Tx" */}
          {selectedTabIndex !== 3 && (
            <HStack
              spacing={4}
              p={4}
              bg="whiteAlpha.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
              flexWrap={{ base: "wrap", md: "nowrap" }}
            >
              <Box minW="140px">
                <HStack spacing={2}>
                  <Icon as={FiCode} color="blue.400" boxSize={4} />
                  <Text
                    as="label"
                    htmlFor="decoder-calldata"
                    color="gray.300"
                    fontWeight="medium"
                  >
                    {decodeMode === "revert" ? "Revert data" : "Calldata"}
                  </Text>
                </HStack>
              </Box>
              <HStack flex={1} minW="200px" spacing={2}>
                <Box flex={1} minW={0}>
                  <InputField
                    id="decoder-calldata"
                    aria-label="Calldata"
                    spellCheck={false}
                    placeholder={selectedTabIndex === 0 ? "0x calldata or tx url" : "0x..."}
                    value={calldata}
                    onChange={(e) => { setDecodeMode("auto"); setCalldata(e.target.value); }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const input = e.clipboardData.getData("text").trim();
                      setDecodeMode("auto");
                      if (selectedTabIndex === 0 && parseTransactionExplorerUrl(input)) {
                        setPasted(false);
                        setSelectedTabIndex(3);
                        setFromTxInput(input);
                        void decodeFromTx(input);
                        return;
                      }
                      setPasted(true);
                      setCalldata(input);
                    }}
                  />
                </Box>
                <DecoderSettings
                  selectedOption={metadataNetwork}
                  setSelectedOption={setMetadataNetwork}
                  showNetwork={selectedTabIndex === 0}
                  revertMode={decodeMode === "revert"}
                  onRevertModeChange={checked => setDecodeMode(checked ? "revert" : "auto")}
                  isDecoding={isLoading}
                />
              </HStack>
            </HStack>
          )}

          {/* Tab-specific content */}
          {renderTabsBody()}

          {/* Decode Button */}
          <Box textAlign="center" pt={2}>
            <DarkButton
              onClick={() => {
                switch (selectedTabIndex) {
                  case 0:
                    return decode({});
                  case 1:
                    return decode({ _abi: abi });
                  case 2:
                    return decode({
                      _address: contractAddress,
                      _chainId: chainId,
                    });
                  case 3:
                    return decodeFromTx();
                }
              }}
              isLoading={isLoading || isPreparingExample}
            >
              Decode
            </DarkButton>
          </Box>
          {!result &&
            !isLoading &&
            !isPreparingExample &&
            !calldata &&
            !fromTxInput &&
            !contractAddress &&
            !abi && (
              <Box
                as="section"
                aria-labelledby="decoder-samples-heading"
                pt={4}
              >
                <Text
                  as="h2"
                  id="decoder-samples-heading"
                  fontSize="20px"
                  fontWeight="semibold"
                  color="text.secondary"
                  mb={3}
                >
                  Try decoding these:
                </Text>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                  {decoderExamples.map((sample) => {
                    const [title] = sample.label.split(" · ");
                    const idBase = `decoder-sample-${sample.id}`;
                    return (
                      <Box
                        as="button"
                        type="button"
                        key={sample.id}
                        data-group=""
                        aria-label={sample.label}
                        aria-describedby={`${idBase}-calls`}
                        disabled={isLoading}
                        display="flex"
                        flexDirection="column"
                        alignItems="stretch"
                        gap={3}
                        w="full"
                        minW={0}
                        p={4}
                        textAlign="left"
                        bg="whiteAlpha.50"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        borderRadius="lg"
                        cursor="pointer"
                        transition="background-color 0.2s, border-color 0.2s"
                        _hover={{
                          bg: "whiteAlpha.100",
                          borderColor: "blue.400",
                        }}
                        _active={{ bg: "whiteAlpha.200" }}
                        _focusVisible={{
                          outline: "none",
                          borderColor: "blue.400",
                          boxShadow: "0 0 0 3px rgba(59,130,246,0.4)",
                        }}
                        _disabled={{
                          opacity: 0.5,
                          cursor: "not-allowed",
                          _hover: {
                            bg: "whiteAlpha.50",
                            borderColor: "whiteAlpha.200",
                          },
                        }}
                        onClick={() => {
                          if ("calldata" in sample) {
                            setExample(undefined);
                            setSelectedTabIndex(1);
                            setAbi(JSON.stringify(sample.abi, null, 2));
                            setDecodeMode("revert");
                            setPasted(false);
                            setFromTxInput(null);
                            setContractAddress(null);
                            setCalldata(sample.calldata);
                            void decode({ _calldata: sample.calldata, _abi: sample.abi, _mode: "revert" });
                            return;
                          }
                          showExample(sample, sample.explorerUrl);
                        }}
                      >
                        <Text
                          as="span"
                          display="block"
                          fontSize="20px"
                          fontWeight="semibold"
                          color="white"
                        >
                          {title}
                        </Text>
                        <SampleCallPreview
                          id={`${idBase}-calls`}
                          preview={sample.preview}
                        />
                        <Box
                          as="span"
                          display="flex"
                          alignItems="center"
                          justifyContent="flex-end"
                        >
                          <Box
                            as="span"
                            aria-hidden
                            display="inline-flex"
                            alignItems="center"
                            gap={1}
                            flexShrink={0}
                            fontSize="xs"
                            fontWeight="medium"
                            color="blue.400"
                            _groupHover={{ color: "blue.300" }}
                          >
                            Decode
                            <Icon
                              as={FiArrowRight}
                              boxSize={3.5}
                              transition="transform 0.15s ease-out"
                              _groupHover={{ transform: "translateX(2px)" }}
                              sx={{
                                "@media (prefers-reduced-motion: reduce)": {
                                  transition: "none",
                                  transform: "none !important",
                                },
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Box>
            )}
        </VStack>
      </Box>

      {isPreparingExample && <ExamplePreviewSkeleton />}

      <ExampleSnapshotContext.Provider
        key={snapshot?.hash ?? "live"}
        value={snapshot ?? null}
      >
        {/* Scroll anchor: starts at the tx tab bar, else the result header. */}
        <Box ref={resultAnchorRef} w="full" minW={0}>
        {/* Result Tabs for "from Tx" mode */}
        {selectedTabIndex === 3 && result && (
          <Box mb={4}>
            <DecoderTabs
              tabs={[
                "Calldata",
                isLoadingEvents
                  ? "Events (...)"
                  : `Events (${decodedEvents?.length ?? 0})`,
              ]}
              selectedTabIndex={resultTabIndex}
              setSelectedTabIndex={setResultTabIndex}
            />
          </Box>
        )}

        {/* Calldata Result - show directly for non-Tx modes, or when Calldata tab selected for Tx mode */}
        {result && (
          <Box
            w="full"
            minW={0}
            display={selectedTabIndex === 3 && resultTabIndex !== 0 ? "none" : undefined}
          >
            <Box
              display="grid"
              gridTemplateColumns="minmax(0, 1fr)"
              alignItems="start"
              gap={6}
              sx={{
                "@media (min-width: 1200px)": {
                  "&:has(> [data-clear-signing-column] [data-clear-signing-content] > section)": {
                    gridTemplateColumns: "minmax(340px, 440px) minmax(0, 1fr)",
                  },
                },
              }}
            >
              {summaryRequest && (
                <Box
                  data-clear-signing-column
                  minW={0}
                  sx={{
                    "&:not(:has([data-clear-signing-content] > section))": { display: "none" },
                    "@media (min-width: 1200px)": {
                      position: "sticky",
                      top: 6,
                    },
                  }}
                >
                  <HStack minH={8} mb={3} w="full" maxW="640px" mx="auto">
                    <Text fontSize="sm" fontWeight="semibold" color="text.secondary">
                      Clear Signing
                    </Text>
                  </HStack>
                  <ClearSigningScrollArea>
                  {draftCalldata === null ? (
                    clearSigningVisibleFor === result && (
                      <Box as="section" aria-label="Clear signing" p={4} bg="bg.subtle" border="1px solid" borderColor="border.default" borderRadius="lg">
                        <Text role="status" fontSize="sm" color="text.secondary">Enter valid parameters to update the clear-signing summary.</Text>
                      </Box>
                    )
                  ) : (
                    <ExampleSnapshotContext.Provider value={hasDynamicSummary ? null : snapshot ?? null}>
                      <ClearSigningSummary
                        {...previewSummaryRequest!}
                        chainId={selectedTabIndex === 0 ? metadataChainId : previewSummaryRequest!.chainId}
                        showPending={hasDynamicSummary && clearSigningVisibleFor === result}
                        debounceMs={hasDynamicSummary ? 150 : 0}
                        onAvailabilityChange={rememberSummaryVisibility}
                      />
                    </ExampleSnapshotContext.Provider>
                  )}
                  </ClearSigningScrollArea>
                </Box>
              )}
              <Box minW={0}>
                <Box minW={0}>
                  <EditableCalldata
                    onDraftChange={updateDraftSummary}
                    renderToolbar={(editButton, isEditing) => (
                      <HStack minH={8} mb={3} justify="space-between" flexWrap="wrap">
                        <Text fontSize="sm" fontWeight="semibold" color="text.secondary">
                          {result.kind === "revert" ? "Decoded revert" : "Decoded calldata"}
                        </Text>
                        <HStack spacing={1} flexWrap="wrap">
                          {editButton}
                          {!isEditing && shareLink && !snapshot && (
                            <Button
                              size="sm"
                              variant="ghost"
                              color="whiteAlpha.700"
                              _hover={{ color: "white", bg: "whiteAlpha.200" }}
                              leftIcon={<LinkIcon boxSize={4} />}
                              onClick={() => setShareModalLink(shareLink)}
                            >
                              Share result
                            </Button>
                          )}
                          {!isEditing && (
                            <>
                              <CopyToClipboard
                                textToCopy={JSON.stringify(
                                  {
                                    [result.kind === "revert" ? "error" : "function"]: result.signature,
                                    params: JSON.parse(stringify(result.rawArgs)),
                                  },
                                  undefined,
                                  2
                                )}
                                labelText="Copy params"
                              />
                              <CopyToClipboard
                                textToCopy={decodedJson}
                                labelText="Copy decoded JSON"
                              />
                            </>
                          )}
                        </HStack>
                      </HStack>
                    )}
                    result={result}
                    calldata={summaryRequest?.calldata}
                    chainId={selectedTabIndex === 0 ? metadataChainId : chainId}
                    functionName={resolvedFunctionName.name ?? result.functionName}
                    isFunctionNameGuessed={resolvedFunctionName.isGuessed}
                    getTransactionHref={summaryRequest?.to ? (encoded) => {
                      const url = new URL(getPath(subdomains.TRANSACT.base), window.location.origin);
                      url.searchParams.set("to", summaryRequest.to!);
                      url.searchParams.set("chainId", String(summaryRequest.chainId ?? chainId));
                      url.searchParams.set("calldata", encoded);
                      return url.toString();
                    } : undefined}
                    getDecodeHref={(encoded, definitions) => createDecoderResultLink(
                      new URL(`${getPath(subdomains.CALLDATA.base)}decoder`, window.location.origin).toString(),
                      encoded, result, definitions,
                      { address: summaryRequest?.to, chainId: summaryRequest?.chainId }
                    )}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Decoded Events Section - only show when Events tab selected in Tx mode */}
        {selectedTabIndex === 3 && resultTabIndex === 1 && (
          <Box w="full" minW={0}>
            {isLoadingEvents ? (
              <Box
                p={6}
                bg="whiteAlpha.50"
                borderRadius="lg"
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <HStack spacing={3}>
                  <Box
                    w={4}
                    h={4}
                    borderRadius="full"
                    border="2px solid"
                    borderColor="blue.400"
                    borderTopColor="transparent"
                    animation="spin 1s linear infinite"
                    sx={{
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                  <Text color="whiteAlpha.700">Decoding events...</Text>
                </HStack>
              </Box>
            ) : (
              <DecodedEventsView events={decodedEvents || []} chainId={chainId} />
            )}
          </Box>
        )}
        </Box>
      </ExampleSnapshotContext.Provider>

      <Modal isOpen={shareModalLink !== null} onClose={() => setShareModalLink(null)} isCentered size="lg" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
        <ModalContent mx={{ base: 3, sm: 4 }} maxW={{ base: "calc(100vw - 1.5rem)", sm: "lg" }} bg="bg.base" border="1px solid" borderColor="border.subtle">
          <ModalHeader pb={2}>Share result</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={5} px={{ base: 3, sm: 6 }}>
            <Text fontSize="sm" color="text.secondary" mb={4}>
              Share this calldata with the function definitions needed to decode it.
            </Text>
            <Box position="relative">
              <Input aria-label="Decode link" value={shareModalLink ?? ""} isReadOnly pr={12} fontSize="sm" />
              <IconButton
                as="a"
                href={shareModalLink ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open decode link"
                icon={<ExternalLinkIcon />}
                variant="ghost"
                size="sm"
                position="absolute"
                top={1}
                right={1}
                color="text.secondary"
              />
            </Box>
            <Center mt={4}>
              <CopyToClipboard
                textToCopy={shareModalLink ?? ""}
                labelText="Copy link"
                aria-label="Copy decode link"
                variant="outline"
              />
            </Center>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Bottom-right, directly above the sitewide footer when the layout
          provides that slot; inline at the end of the tool otherwise. Also
          available when decoding fails; never seed a guessed signature. */}
      {(() => {
        const signatureRegistry = (
          <Box data-testid="signature-registry-slot" w="full" minW={0}>
            <SignatureRegistryForm
              key={`${selectedTabIndex}:${fromTxInput}:${chainId}:${contractAddress}`}
              selector={selectedTabIndex === 3 ? "" : calldata.slice(0, 10)}
            />
          </Box>
        );
        return beforeFooterSlot ? (
          createPortal(signatureRegistry, beforeFooterSlot)
        ) : (
          <Box mt={8}>{signatureRegistry}</Box>
        );
      })()}
    </Box>
  );
}

type DecodedEventsViewProps = {
  events: DecodeEventResult[];
  chainId: number;
};

function DecodedEventsView({ events, chainId }: DecodedEventsViewProps) {
  if (!events || events.length === 0) {
    return (
      <Box
        p={6}
        bg="whiteAlpha.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Text color="whiteAlpha.500" textAlign="center">
          No events found for this transaction
        </Text>
      </Box>
    );
  }

  return (
    <Stack spacing={4}>
      {events.map((event, idx) => (
        <EventItem key={idx} event={event} index={idx} chainId={chainId} />
      ))}
    </Stack>
  );
}

type EventItemProps = {
  event: DecodeEventResult;
  index: number;
  chainId: number;
};

function EventItem({ event, index, chainId }: EventItemProps) {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: index === 0 });

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      rounded="lg"
      overflow="hidden"
    >
      {/* Collapsible Header */}
      <HStack
        p={3}
        bg="whiteAlpha.100"
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: "whiteAlpha.200" }}
      >
        <HStack spacing={3}>
          <Box
            fontSize="xs"
            color="whiteAlpha.600"
            bg="whiteAlpha.200"
            px={2}
            py={0.5}
            rounded="md"
          >
            #{index + 1}
          </Box>
          <Box>
            <Box fontSize="xs" color="whiteAlpha.600">
              event
            </Box>
            <Box fontWeight="bold">{event.eventName}</Box>
          </Box>
        </HStack>

        <Spacer />

        <HStack spacing={2}>
          <Box onClick={(e) => e.stopPropagation()}>
            <CopyToClipboard
              textToCopy={event.signature}
              labelText="Copy signature"
            />
          </Box>
          <Text fontSize="xl" fontWeight="bold">
            {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Text>
        </HStack>
      </HStack>

      {/* Collapsible Content */}
      <Collapse in={isOpen} animateOpacity>
        <Box minW={0}>
          <CalldataTree args={event.args} chainId={chainId} />
        </Box>
      </Collapse>
    </Box>
  );
}

export const CalldataDecoderPage = ({
  headerText,
}: {
  headerText?: string;
}) => {
  return (
    <Suspense
      fallback={
        <ToolLoading
          title={headerText ?? "Calldata Decoder"}
          description="Decode Ethereum transaction calldata into human-readable parameters."
        />
      }
    >
      <CalldataDecoderPageContent headerText={headerText} />
    </Suspense>
  );
};
