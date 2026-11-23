"use client";

import { useCustomChains } from "@/lib/customChains/store";
import { getRpcUrlsForChain } from "@/data/networks";
import { NetworkSelect } from "@/components/NetworkSelect";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { DarkSelect } from "@/components/DarkSelect";
import {
  ExtendedJsonFragmentType,
  HighlightedContent,
  SelectedOptionState,
} from "@/types";
import { parseContractAddressInput } from "@/lib/contractExplorerInput";
import { chainIdToChain, networkOptions } from "@/data/common";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Collapse,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Select,
  Skeleton,
  Spacer,
  Spinner,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from "@chakra-ui/icons";
import { useAddressBook } from "@/hooks/useAddressBook";
import { AddressBookInlineButton } from "@/components/AddressBook";
import { parseAsInteger, useQueryState } from "nuqs";
import { JsonFragment } from "ethers";
import { Address, PublicClient, isAddress } from "viem";
import { getPublicClient } from "@/lib/publicClient";
import { whatsabi } from "@shazow/whatsabi";
import { ConnectButton } from "@/components/ConnectButton";
import { ReadWriteFunction } from "@/components/fnParams/ReadWriteFunction";
import {
  fetchContractAbi,
  fetchContractAbiRaw,
  getImplementationFromBytecodeIfProxy,
  getPath,
  getSourceCode,
  slicedText,
  startHexWith0x,
} from "@/utils";
import { StorageSlot } from "@/components/fnParams/StorageSlot";
import { RawCalldata } from "@/components/fnParams/RawCalldata";
import subdomains from "@/subdomains";
import { fetchFunctionInterface } from "@/lib/decoder";
import { DarkButton } from "@/components/DarkButton";
import { processContractBytecode } from "@/utils/index";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { Editor } from "@monaco-editor/react";
import { Code, CornerDownLeft, Download, ExternalLink, FileText, Maximize2, Minimize2 } from "lucide-react";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { SourceCodeExplorer } from "@/components/SourceCodeExplorer";
import { ContractCallPrefill, type PrefilledCall } from "@/components/fnParams/ContractCallPrefill";
import { contractFunctionSignature } from "@/lib/contractCall";

import { ContractAbiEditor, type ContractAbiEditorState } from "@/components/ContractAbiEditor";
import { mergeContractAbi, contractAbiFunctionSelector, compareContractFunctions, contractFunctionStateKey } from "@/lib/contractAbi";

import { ContractTabs, ContractAddressLink, useContractTab } from "@/components/ContractTabs";

const useDebouncedValue = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

type AbiType = {
  abi: JsonFragment[];
  name: string;
  // Provenance belongs to this ABI, not the outer proxy/address.
  isDecoded?: boolean;
  isCustom?: boolean;
  customFunctionSelectors?: string[];
  addedFunctionSelectors?: string[];
  functionEdits?: { base: AbiType; declarations: string };
};

type SourceCodeType = Record<string, string> | undefined;

// Context for ABI section expanded state - prevents parent re-renders
const AbiExpandedContext = createContext<{
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
} | null>(null);

/**
 * Provider component that manages ABI expanded state.
 * Wrap both the toggle button and content with this provider.
 */
const AbiExpandedProvider = ({ children }: { children: React.ReactNode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <AbiExpandedContext.Provider value={{ isExpanded, setIsExpanded }}>
      {children}
    </AbiExpandedContext.Provider>
  );
};

/**
 * Toggle button for ABI & Source Code section.
 * Must be used inside AbiExpandedProvider.
 */
const AbiSourceCodeToggle = ({ isCustom }: { isCustom?: boolean }) => {
  const context = useContext(AbiExpandedContext);
  if (!context) return null;
  const { isExpanded, setIsExpanded } = context;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setIsExpanded(!isExpanded)}
      aria-expanded={isExpanded}
      color="text.secondary"
      borderColor="whiteAlpha.300"
      bg="whiteAlpha.50"
      _hover={{ color: "text.primary", bg: "whiteAlpha.100", borderColor: "whiteAlpha.400" }}
      leftIcon={<Code size={14} />}
      rightIcon={isExpanded ? <ChevronUpIcon boxSize={4} /> : <ChevronDownIcon boxSize={4} />}
      px={3}
      h={{ base: 9, md: 7 }}
      fontSize="xs"
      position="relative"
      aria-description={isCustom ? "Custom ABI applied" : undefined}
      data-custom-abi={Boolean(isCustom)}
    >
      ABI & Source Code
      {isCustom && <Box position="absolute" top="-3px" right="2px" boxSize="6px" bg="blue.400" borderRadius="full" aria-hidden="true" />}
    </Button>
  );
};

/**
 * Content component for ABI & Source Code section.
 * Must be used inside AbiExpandedProvider.
 * Always mounted but hidden via CSS to avoid Monaco Editor re-initialization lag.
 */
const AbiSourceCodeContent = ({
  abi,
  proxyAbi,
  implementationAbi,
  sourceCode,
  proxySourceCode,
  implementationSourceCode,
  implementationAddress,
  isLoadingSourceCode,
  renderAbiEditor,
}: {
  abi: AbiType | null;
  proxyAbi: AbiType | null;
  implementationAbi: AbiType | null;
  sourceCode: SourceCodeType;
  proxySourceCode: SourceCodeType;
  implementationSourceCode: SourceCodeType;
  implementationAddress: string | null;
  isLoadingSourceCode: boolean;
  renderAbiEditor: (mode: "contract" | "implementation", onOpen?: () => void, onSubmitted?: () => void) => React.ReactNode;
}) => {
  const context = useContext(AbiExpandedContext);
  const isExpanded = context?.isExpanded ?? false;

  // 0 = Source Code, 1 = ABI
  const [contentTabIndex, setContentTabIndex] = useState(0);
  // 0 = Implementation, 1 = Proxy (only shown for proxy contracts)
  const [contractTabIndex, setContractTabIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Escape key exits fullscreen; lock body scroll while fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const isProxy = implementationAddress !== null;

  // Get the current ABI to display based on selected contract tab
  const currentAbi = useMemo(() => {
    if (!isProxy) return abi;
    return contractTabIndex === 0 ? implementationAbi : proxyAbi;
  }, [isProxy, contractTabIndex, abi, implementationAbi, proxyAbi]);

  // Get the current source code based on selected contract tab
  const currentSourceCode = useMemo(() => {
    if (!isProxy) return sourceCode;
    return contractTabIndex === 0 ? implementationSourceCode : proxySourceCode;
  }, [isProxy, contractTabIndex, sourceCode, implementationSourceCode, proxySourceCode]);

  const abiContent = useMemo(() => {
    if (!currentAbi) return "";
    try {
      return JSON.stringify(currentAbi.abi, null, 2);
    } catch {
      return "";
    }
  }, [currentAbi]);

  const sourceFileEntries = useMemo(() => {
    if (!currentSourceCode) return [];
    return Object.entries(currentSourceCode);
  }, [currentSourceCode]);

  const handleDownloadZip = useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const [filePath, content] of sourceFileEntries) {
      zip.file(filePath, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentAbi?.name || "source-code"}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sourceFileEntries, currentAbi?.name]);

  return (
    <Box
      display={isExpanded ? "flex" : "none"}
      flexDirection="column"
      mb={isFullscreen ? 0 : 4}
      border={isFullscreen ? "none" : "1px solid"}
      borderColor="whiteAlpha.200"
      borderRadius={isFullscreen ? 0 : "lg"}
      overflow="hidden"
      bg="bg.subtle"
      p={3}
      position={isFullscreen ? "fixed" : "relative"}
      inset={isFullscreen ? 0 : undefined}
      zIndex={isFullscreen ? 10000 : undefined}
      h={isFullscreen ? "100vh" : undefined}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      {/* Compact tabs row */}
      <HStack spacing={4} mb={3} flexWrap="wrap" flexShrink={0}>
        {/* Contract tabs for proxy */}
        {isProxy && (
          <TabsSelector
            tabs={["Implementation", "Proxy"]}
            selectedTabIndex={contractTabIndex}
            setSelectedTabIndex={setContractTabIndex}
            mt={0}
          />
        )}

        {/* Content tabs */}
        <TabsSelector
          tabs={["Source Code", "ABI"]}
          selectedTabIndex={contentTabIndex}
          setSelectedTabIndex={setContentTabIndex}
          mt={0}
        />

        <Spacer />

        {renderAbiEditor(
          isProxy && contractTabIndex === 0 ? "implementation" : "contract",
          () => setIsFullscreen(false),
          () => context?.setIsExpanded(false)
        )}

        {/* Copy / Download action buttons */}
        {abiContent && (
          <CopyToClipboard textToCopy={abiContent} labelText="Copy ABI" />
        )}
        {contentTabIndex === 0 && !isLoadingSourceCode && sourceFileEntries.length === 1 && (
          <CopyToClipboard textToCopy={sourceFileEntries[0][1]} labelText="Copy Code" />
        )}
        {contentTabIndex === 0 && !isLoadingSourceCode && sourceFileEntries.length > 1 && (
          <Button
            size="sm"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ color: "white", bg: "whiteAlpha.200" }}
            onClick={handleDownloadZip}
            leftIcon={<Download size={16} />}
          >
            Download Zip
          </Button>
        )}

        {/* Fullscreen toggle */}
        <Tooltip label={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"} placement="bottom" hasArrow>
          <IconButton
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            icon={<Icon as={isFullscreen ? Minimize2 : Maximize2} boxSize={4} />}
            size="sm"
            variant="ghost"
            color="text.tertiary"
            _hover={{ color: "text.primary", bg: "whiteAlpha.200" }}
            onClick={() => setIsFullscreen((prev) => !prev)}
          />
        </Tooltip>
      </HStack>

      {/* Content */}
      <Box flex={isFullscreen ? 1 : undefined} overflow={isFullscreen ? "hidden" : undefined}>
        {contentTabIndex === 0 ? (
          // Source Code View - VS Code-like file explorer
          <Box h={isFullscreen ? "100%" : undefined}>
            {isLoadingSourceCode ? (
              <HStack justify="center" py={8}>
                <Spinner size="sm" />
                <Text color="text.secondary">Loading source code...</Text>
              </HStack>
            ) : !currentSourceCode || Object.keys(currentSourceCode).length === 0 ? (
              <Text color="text.secondary" fontSize="sm" py={2}>
                Source code not available (contract may not be verified)
              </Text>
            ) : (
              <Box
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                overflow="hidden"
                h={isFullscreen ? "100%" : undefined}
              >
                <SourceCodeExplorer
                  sourceCode={currentSourceCode}
                  contractName={currentAbi?.name}
                  isFullscreen={isFullscreen}
                />
              </Box>
            )}
          </Box>
        ) : (
          // ABI View
          <Box h={isFullscreen ? "100%" : undefined} display="flex" flexDirection="column">
            {currentAbi?.isDecoded ? (
              <Alert status="info" mb={3} rounded="lg" fontSize="sm" flexShrink={0}>
                <AlertIcon />
                This contract isn’t verified. Its functions were inferred from bytecode and signature lookups, so some names or input types may differ from the original contract.
              </Alert>
            ) : null}
            <Box
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              overflow="hidden"
              flex={isFullscreen ? 1 : undefined}
            >
              <Editor
                theme="vs-dark"
                defaultLanguage="json"
                value={abiContent}
                height={isFullscreen ? "100%" : "400px"}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                  lineNumbers: "on",
                  folding: true,
                  renderLineHighlight: "all",
                  scrollbar: {
                    useShadows: false,
                    vertical: "visible",
                    horizontal: "visible",
                    verticalScrollbarSize: 12,
                    horizontalScrollbarSize: 12,
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const ReadWriteSection = ({
  type,
  abi,
  client,
  functions,
  address,
  chainId,
  isAbiDecoded,
  prefilledCall,
  prefillRevision,
  onPrefillScrollStart,
  mobileActive,
  abiMode,
  addedFunctionFocus,
}: {
  type: "read" | "write";
  abi: AbiType;
  client: PublicClient | null;
  functions: JsonFragment[];
  address: string;
  chainId: number;
  isAbiDecoded?: boolean;
  prefilledCall: PrefilledCall | null;
  prefillRevision: number;
  onPrefillScrollStart?: () => void;
  mobileActive: boolean;
  abiMode: "contract" | "implementation";
  addedFunctionFocus: { selector: string; revision: number } | null;
}) => {
  const stickyHeaderRef = useRef<HTMLDivElement>(null);

  const [allCollapsed, setAllCollapsed] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<number[]>([]);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const functionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrolledPrefillRevision = useRef<number | null>(null);

  useEffect(() => {
    if (!prefilledCall || !client || !mobileActive || scrolledPrefillRevision.current === prefillRevision) return;
    const index = functions.findIndex(func => {
      try { return contractFunctionSignature(func) === prefilledCall.signature; }
      catch { return false; }
    });
    if (index < 0) return;
    const frame = requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const target = functionRefs.current[index];
      if (!target) return;
      scrolledPrefillRevision.current = prefillRevision;
      target.scrollIntoView?.({
        behavior: reduceMotion ? "instant" : "smooth",
        block: "start",
      });
      onPrefillScrollStart?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [prefilledCall, prefillRevision, functions, client, onPrefillScrollStart, mobileActive]);

  const scrolledAddedRevision = useRef<number | null>(null);
  useEffect(() => {
    if (!addedFunctionFocus || !client || !mobileActive || scrolledAddedRevision.current === addedFunctionFocus.revision) return;
    const index = functions.findIndex(func => contractAbiFunctionSelector(func) === addedFunctionFocus.selector);
    if (index < 0) return;
    const frame = requestAnimationFrame(() => {
      const target = functionRefs.current[index];
      if (!target) return;
      scrolledAddedRevision.current = addedFunctionFocus.revision;
      target.scrollIntoView?.({
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [addedFunctionFocus, functions, client, mobileActive]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length === 1) {
      scrollStickyHeaderToTop();
    }
  };

  const handleSearchFocus = () => {
    scrollStickyHeaderToTop();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setCurrentResultIndex(0);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      cycleSearchResults(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      cycleSearchResults(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      cycleSearchResults(e.shiftKey);
    }
  };

  const cycleSearchResults = useCallback(
    (reverse: boolean = false) => {
      if (searchResults.length > 0) {
        setCurrentResultIndex((prevIndex) => {
          if (reverse) {
            return (
              (prevIndex - 1 + searchResults.length) % searchResults.length
            );
          } else {
            return (prevIndex + 1) % searchResults.length;
          }
        });
      }
    },
    [searchResults]
  );

  const scrollStickyHeaderToTop = useCallback(() => {
    if (stickyHeaderRef.current) {
      const headerRect = stickyHeaderRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset + headerRect.top - 10; // Subtract 10px to ensure it's fully visible

      window.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  }, []);

  const scrollToFunction = useCallback((index: number) => {
    if (
      functionRefs.current[index] &&
      stickyHeaderRef.current &&
      scrollContainerRef.current
    ) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const headerRect = stickyHeaderRef.current.getBoundingClientRect();
      const functionRect = functionRefs.current[index]!.getBoundingClientRect();

      const yOffset = headerRect.height - 90; // Add extra 20px for padding
      const scrollTop =
        functionRect.top -
        containerRect.top -
        yOffset +
        scrollContainerRef.current.scrollTop;

      scrollContainerRef.current.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  }, []);

  const highlightText = (
    text: string,
    highlight: string,
    isCurrent: boolean
  ): HighlightedContent => {
    if (!highlight.trim()) {
      return [{ text, isHighlighted: false, isCurrentResult: false }];
    }

    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);

    return parts.map((part) => {
      const isHighlighted = regex.test(part);
      const isCurrentResult = isHighlighted && isCurrent;

      return {
        text: part,
        isHighlighted: isHighlighted,
        isCurrentResult: isCurrentResult,
      };
    });
  };

  const ensureHighlightedContent = (
    content: string | undefined,
    highlight: string,
    isCurrent: boolean
  ): HighlightedContent => {
    if (content === undefined) {
      return [{ text: "", isHighlighted: false, isCurrentResult: false }];
    }
    return highlightText(content, highlight, isCurrent);
  };

  const getFunc = (func: JsonFragment, index: number) => {
    return {
      ...func,
      name: ensureHighlightedContent(
        func.name,
        searchQuery,
        searchResults[currentResultIndex] === index
      ),
      highlightedOutputs: func.outputs?.map(
        (output): ExtendedJsonFragmentType => ({
          ...output,
          name: ensureHighlightedContent(
            output.name,
            searchQuery,
            searchResults[currentResultIndex] === index
          ),
        })
      ),
    };
  };

  // Memoize highlighted functions so ReadWriteFunction children
  // receive stable references and React.memo can skip re-renders
  const highlightedFunctions = useMemo(
    () => functions.map((func, index) => getFunc(func, index)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [functions, searchQuery, searchResults, currentResultIndex]
  );

  const computedSearchResults = useMemo(() => {
    if (debouncedSearchQuery) {
      return functions
        .map((func, index) => {
          const functionNameMatch = func.name
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase());
          const outputNamesMatch =
            func.outputs &&
            func.outputs.length > 1 &&
            func.outputs.some((output) =>
              output.name
                ?.toLowerCase()
                .includes(debouncedSearchQuery.toLowerCase())
            );
          return functionNameMatch || outputNamesMatch ? index : -1;
        })
        .filter((index) => index !== -1);
    } else {
      return [];
    }
  }, [debouncedSearchQuery, functions]);

  useEffect(() => {
    setSearchResults(computedSearchResults);
    setCurrentResultIndex(0);
  }, [computedSearchResults]);

  useEffect(() => {
    if (searchResults.length > 0) {
      scrollToFunction(searchResults[currentResultIndex]);
    }
  }, [currentResultIndex, searchResults, scrollToFunction]);

  const renderSearchBox = () => {
    return (
      <Center w="full">
        <HStack w={{ base: "full", md: "70%" }} minW={0}>
          <InputGroup minW={0}>
            <Input
              placeholder="Search functions"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              ref={searchInputRef}
            />
            <InputRightElement>
              <Button
                size="sm"
                onClick={handleClearSearch}
                variant="ghost"
                visibility={searchQuery ? "visible" : "hidden"}
              >
                <CloseIcon />
              </Button>
            </InputRightElement>
          </InputGroup>

          {searchResults.length > 1 && (
            <>
              <Button
                size="sm"
                onClick={() =>
                  setCurrentResultIndex(
                    (prevIndex) =>
                      (prevIndex - 1 + searchResults.length) %
                      searchResults.length
                  )
                }
              >
                &uarr;
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setCurrentResultIndex(
                    (prevIndex) => (prevIndex + 1) % searchResults.length
                  )
                }
              >
                &darr;
              </Button>
            </>
          )}
        </HStack>
      </Center>
    );
  };

  return (
    <Box
      minW={0}
      w="full"
      id={`contract-${chainId}-${address.toLowerCase()}-${type}-functions`}
      role="tabpanel"
      aria-labelledby={`contract-${chainId}-${address.toLowerCase()}-${type}-tab`}
      display={{ base: mobileActive ? "block" : "none", lg: "block" }}
    >
      <Box
        ref={stickyHeaderRef}
        position="sticky"
        top={{ base: 12, md: 0 }}
        zIndex={1}
        p={2}
        boxShadow="md"
        bg="bg.base"
      >
        <HStack mb={3} justify="space-between" flexWrap="wrap" gap={2}>
          <Box fontWeight="bold">
            <>{type === "read" ? "Read" : "Write"} Contract</>
          </Box>
          <Button
            size="sm"
            flexShrink={0}
            onClick={() => {
              setAllCollapsed(!allCollapsed);
            }}
          >
            {allCollapsed ? "Uncollapse" : "Collapse"} All
          </Button>
        </HStack>
        {renderSearchBox()}
      </Box>
      <Box
        ref={scrollContainerRef}
        overflowY="auto"
        // maxHeight="calc(100vh - 1px)" // FIXME: set height such that scrollable on search, but still shows all functions
        rounded="lg"
        p={2}
        boxSizing="border-box"
        sx={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#888",
            borderRadius: "10px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#555",
          },
        }}
      >
        {client && type === "read" && (
          <StorageSlot
            address={address}
            chainId={chainId}
            readAllCollapsed={allCollapsed}
          />
        )}
        {client && type === "write" && (
          <RawCalldata
            readAllCollapsed={allCollapsed}
            chainId={chainId}
            address={address}
            client={client}
          />
        )}
        {client &&
          functions?.map((func, index) => {
            const selector = contractAbiFunctionSelector(func) ?? "";
            const inferred = Boolean(isAbiDecoded && !abi.customFunctionSelectors?.includes(selector));
            const customAdded = abi.addedFunctionSelectors?.includes(selector);
            let initialCall: PrefilledCall | undefined;
            try {
              if (prefilledCall?.signature === contractFunctionSignature(func)) initialCall = prefilledCall;
            } catch { /* Unknown inferred shapes cannot be prefilled. */ }
            return (
            <Box
              key={`${contractFunctionStateKey(func, inferred)}:${initialCall ? prefillRevision : "ordinary"}`}
              data-prefilled={initialCall ? "true" : undefined}
              data-function-selector={selector || undefined}
              data-custom-added={customAdded ? "true" : undefined}
              scrollMarginTop="8rem"
              ref={(el) => { functionRefs.current[index] = el; }}
            >
              <ReadWriteFunction
                client={client}
                index={index + 1}
                type={type}
                func={highlightedFunctions[index]}
                address={address}
                chainId={chainId}
                isAbiDecoded={inferred}
                isCustomAdded={customAdded}
                readAllCollapsed={allCollapsed}
                initialCall={initialCall}
                abiMode={abiMode}
              />
            </Box>
          ); })}
      </Box>
    </Box>
  );
};

interface EVMParameter {
  type: string;
  name?: string;
  components?: EVMParameter[];
}

const proxyOptions = [
  { label: "Proxy", value: "proxy" },
  { label: "Contract", value: "contract" },
] as const;

const LoadedContractPage = ({
  params: { address, chainId },
}: {
  params: {
    address: string;
    chainId: number;
  };
}) => {
  const contractTab = useContractTab();
  const setTabName = contractTab?.setName;
  const router = useTopLoaderRouter();
  // Use the loaded route, never the editable address or pending network selection.
  const explorer = chainIdToChain[chainId]?.blockExplorers?.default;
  const explorerUrl = explorer?.url && isAddress(address)
    ? `${explorer.url}/address/${address}`
    : undefined;

  // Find network option, default to first option (mainnet) if not found
  const getNetworkOption = useCallback(() => {
    const index = networkOptions.findIndex((option) => option.value === chainId);
    return index >= 0 ? networkOptions[index] : { value: chainId, label: `Chain ${chainId}` };
  }, [chainId]);

  // dynamic imports
  const [evmole, setEvmole] = useState<any>(null);

  useEffect(() => {
    let active = true;
    import("evmole").then((module) => {
      if (active) setEvmole(module);
    });
    return () => { active = false; };
  }, []);

  // state
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(() => getNetworkOption());
  const [client, setClient] = useState<PublicClient | null>(() => {
    // Initialize client immediately with chainId from props
    if (chainIdToChain[chainId]) {
      return getPublicClient(chainId);
    }
    return null;
  });

  const [loadedAbi, setAbi] = useState<AbiType | null>(null);
  const [isInteractingAsProxy, setIsInteractingAsProxy] = useState(false);
  const [customAbis, setCustomAbis] = useState<{ contract: AbiType | null; implementation: AbiType | null }>({ contract: null, implementation: null });
  const [abiEditorStates, setAbiEditorStates] = useState<Partial<Record<"contract" | "implementation", ContractAbiEditorState>>>({});
  const selectedAbiMode = isInteractingAsProxy ? "implementation" : "contract";
  const abi = customAbis[selectedAbiMode] ?? loadedAbi;
  useEffect(() => {
    if (abi?.name) setTabName?.(abi.name);
  }, [abi?.name, setTabName]);
  const isAbiDecoded = abi?.isDecoded === true;
  const [isFetchingAbi, setIsFetchingAbi] = useState<boolean>(false);
  const [unableToFetchAbi, setUnableToFetchAbi] = useState<boolean>(false);
  const [implementationAddress, setImplementationAddress] = useState<
    string | null
  >(null);
  const [implementationAbi, setImplementationAbi] = useState<AbiType | null>(
    null
  );
  const [proxyAbi, setProxyAbi] = useState<AbiType | null>(null);
  const [prefill, setPrefill] = useState<{ call: PrefilledCall | null; revision: number; onScrollStart?: () => void }>({ call: null, revision: 0 });
  const handlePrefill = useCallback((call: PrefilledCall | null, onScrollStart?: () => void) => {
    if (call && proxyAbi && implementationAbi) {
      const implementation = call.abiMode === "implementation";
      setAbi(implementation ? implementationAbi : proxyAbi);
      setIsInteractingAsProxy(implementation);
    }
    setPrefill(previous => ({ call, revision: previous.revision + 1, onScrollStart }));
  }, [proxyAbi, implementationAbi]);

  const [addedFunctionFocus, setAddedFunctionFocus] = useState<{
    selector: string; revision: number; mode: "contract" | "implementation"; type: "read" | "write";
  } | null>(null);
  const addedFocusRevision = useRef(0);
  const orderedFunctions = useMemo(() => (abi?.abi ?? []).filter(item => item.type === "function").sort(compareContractFunctions), [abi]);
  const readFunctions = useMemo(() => orderedFunctions.filter(item => item.stateMutability === "view" || item.stateMutability === "pure"), [orderedFunctions]);
  const writeFunctions = useMemo(() => orderedFunctions.filter(item => item.stateMutability !== "view" && item.stateMutability !== "pure"), [orderedFunctions]);

  // Address Book integration
  const { getLabel, isReady: isAddressBookReady } = useAddressBook();
  const addressBookLabel = isAddressBookReady ? getLabel(address) : null;

  // Check if contract name is a real name or just a truncated address
  const isRealContractName = useMemo(() => {
    if (!abi?.name) return false;
    // If name contains "..." it's likely a truncated address (from slicedText)
    return !abi.name.includes("...");
  }, [abi?.name]);
  const [mobileFunctionType, setMobileFunctionType] = useState<"read" | "write">("read");

  // Shared links and decoded calldata reveal their destination before scrolling.
  useEffect(() => {
    if (!prefill.call) return;
    const func = abi?.abi.find(func => {
      try { return func.type === "function" && contractFunctionSignature(func) === prefill.call!.signature; }
      catch { return false; }
    });
    if (func) setMobileFunctionType(
      func.stateMutability === "view" || func.stateMutability === "pure" ? "read" : "write"
    );
  }, [prefill.call, prefill.revision, abi]);

  // Source code state
  const [sourceCode, setSourceCode] = useState<SourceCodeType>(undefined);
  const [proxySourceCode, setProxySourceCode] = useState<SourceCodeType>(undefined);
  const [implementationSourceCode, setImplementationSourceCode] = useState<SourceCodeType>(undefined);
  const [isLoadingSourceCode, setIsLoadingSourceCode] = useState<boolean>(false);

  const fetchSetAbi = useCallback(async () => {
    if (!evmole) return;

    try {
      setIsFetchingAbi(true);
      setUnableToFetchAbi(false);

      // try fetching if contract is verified
      const fetchedAbi = await fetchContractAbiRaw({ address, chainId });
      console.log("Verified contract ABI:", fetchedAbi);
      if (fetchedAbi.implementation) {
        setImplementationAddress(fetchedAbi.implementation.address);
        setImplementationAbi({
          abi: fetchedAbi.implementation.abi as JsonFragment[],
          name: fetchedAbi.implementation.name,
        });
        setProxyAbi({
          abi: fetchedAbi.abi as JsonFragment[],
          name: fetchedAbi.name,
        });

        setIsInteractingAsProxy(true);
        setAbi({
          abi: fetchedAbi.implementation.abi as JsonFragment[],
          name: fetchedAbi.implementation.name,
        });
      } else {
        setAbi({
          abi: fetchedAbi.abi as JsonFragment[],
          name: fetchedAbi.name,
        });
      }
    } catch (e) {
      console.log("Error fetching verified ABI:", e);

      try {
        // Create client for bytecode fetch
        const client = getPublicClient(chainId);

        // Fetch contract bytecode
        const contractCode = await client.getCode({
          address: address as Address,
        });

        if (contractCode === "0x") {
          throw new Error("No contract code found at address");
        }

        // check if contract is a proxy
        const resGetImplementation = await getImplementationFromBytecodeIfProxy(
          {
            client,
            address,
          }
        );

        if (resGetImplementation) {
          const { implementationAddress, proxyName } = resGetImplementation;

          let implementation: AbiType = {
            abi: [],
            name: slicedText(implementationAddress),
          };

          try {
            // fetch implementation abi if verified
            const fetchedImplementation = await fetchContractAbiRaw({
              address: implementationAddress,
              chainId,
            });
            implementation = {
              abi: fetchedImplementation.abi as JsonFragment[],
              name: fetchedImplementation.name,
            };
            console.log("Fetched implementation ABI:", implementation);
          } catch (e) {
            // if not verified, use evmole
            // fetch implementation bytecode
            const implementationCode = await client.getCode({
              address: implementationAddress as Address,
            });

            // get implementation abi
            const processedImplementation = await processContractBytecode({
              contractCode: implementationCode as string,
              evmole,
            });
            console.log(
              "Processed implementation ABI:",
              processedImplementation
            );
            implementation = {
              abi: processedImplementation as JsonFragment[],
              name: slicedText(implementationAddress),
              isDecoded: true,
            };
          }
          // get proxy abi
          const proxyAbi = await processContractBytecode({
            contractCode: contractCode as string,
            evmole,
          });
          console.log("Proxy ABI:", proxyAbi);

          setImplementationAddress(implementationAddress);
          setImplementationAbi(implementation);
          setProxyAbi({
            abi: proxyAbi as JsonFragment[],
            name: proxyName,
            isDecoded: true,
          });

          setIsInteractingAsProxy(true);
          setAbi(implementation);
        } else {
          const sortedAbi = await processContractBytecode({
            contractCode: contractCode as string,
            evmole,
          });

          console.log("Processed ABI:", sortedAbi);

          setAbi({
            abi: sortedAbi as JsonFragment[],
            name: slicedText(address),
            isDecoded: true,
          });
        }
      } catch (evmoleError) {
        console.error("Error using evmole:", evmoleError);
        setUnableToFetchAbi(true);
      }
    } finally {
      setIsFetchingAbi(false);
    }
  }, [address, chainId, evmole]);

  // Track the current chainId to avoid unnecessary client updates
  const currentChainIdRef = useRef<number>(chainId);

  // Keep the client bound to the loaded route, never the network draft.
  useEffect(() => {
    if (chainId !== currentChainIdRef.current) {
      currentChainIdRef.current = chainId;
      setClient(chainIdToChain[chainId] ? getPublicClient(chainId) : null);
    }
  }, [chainId]);

  // Fetch ABI when address or chainId changes
  useEffect(() => {
    fetchSetAbi();
  }, [address, chainId, fetchSetAbi]);

  // Fetch source code when address, chainId, or implementationAddress changes
  useEffect(() => {
    const fetchSourceCodes = async () => {
      setIsLoadingSourceCode(true);
      setSourceCode(undefined);
      setProxySourceCode(undefined);
      setImplementationSourceCode(undefined);

      try {
        // Fetch main contract source code
        const mainSource = await getSourceCode(chainId, address);
        setSourceCode(mainSource);
        setProxySourceCode(mainSource);

        // If there's an implementation address, fetch its source code too
        if (implementationAddress) {
          const implSource = await getSourceCode(chainId, implementationAddress);
          setImplementationSourceCode(implSource);
        }
      } catch (error) {
        console.error("Error fetching source code:", error);
      } finally {
        setIsLoadingSourceCode(false);
      }
    };

    fetchSourceCodes();
  }, [address, chainId, implementationAddress]);

  useEffect(() => {
    if (abi?.name) document.title = `${abi.name} - ${address} | ETH.sh`;
  }, [abi?.name, address]);

  const renderFunctions = () => {
    return (
        <Box w="full" maxW="70rem" mx="auto">
          {/* ABI & Source Code Content - above alerts */}
          <AbiSourceCodeContent
            abi={abi}
            proxyAbi={customAbis.contract ?? proxyAbi}
            implementationAbi={customAbis.implementation ?? implementationAbi}
            sourceCode={sourceCode}
            proxySourceCode={proxySourceCode}
            implementationSourceCode={implementationSourceCode}
            implementationAddress={implementationAddress}
            isLoadingSourceCode={isLoadingSourceCode}
            renderAbiEditor={renderAbiEditor}
          />

          {abi && <>
          {/* Proxy and inferred ABI details */}
          <VStack spacing={3} align="stretch" mb={implementationAddress || isAbiDecoded ? 4 : 0}>
            {implementationAddress && (
              <Alert
                status="info"
                rounded="lg"
                display="grid"
                gridTemplateColumns={{ base: "auto minmax(0, 1fr)", lg: "auto minmax(0, 1fr) auto" }}
                gap={2}
                alignItems="start"
                bg="rgba(59,130,246,0.08)"
                borderWidth="1px"
                borderColor="rgba(59,130,246,0.20)"
              >
                <AlertIcon color="primary.400" mr={0} mt={1} />
                <Box minW={0}>
                  <Text color="text.secondary" fontSize="sm">
                    Proxy implementation:
                  </Text>
                  <ContractAddressLink
                    address={implementationAddress}
                    chainId={chainId}
                    href={`${getPath(subdomains.CONTRACT.base)}${chainId}/${implementationAddress}`}
                    fontWeight="semibold"
                    color="primary.400"
                    fontSize="sm"
                    fontFamily="mono"
                    overflowWrap="anywhere"
                    _hover={{ color: "primary.300" }}
                    isExternal
                  >
                    <Text as="span">{implementationAddress}</Text>{" "}
                    <Icon as={ExternalLink} boxSize={3} verticalAlign="middle" />
                  </ContractAddressLink>
                </Box>
                <HStack spacing={2} gridColumn={{ base: 2, lg: "auto" }} minW={0} flexWrap="wrap">
                  <Text color="text.primary" fontSize="sm">Interact as</Text>
                  <DarkSelect
                    boxProps={{
                      minW: { base: 0, sm: "120px" },
                      flex: { base: 1, sm: "initial" },
                    }}
                    selectedOption={{
                      label: isInteractingAsProxy ? "Proxy" : "Contract",
                      value: isInteractingAsProxy ? "proxy" : "contract",
                    }}
                    setSelectedOption={(option) => {
                      if (option) {
                        setPrefill(previous => ({ call: null, revision: previous.revision + 1 }));
                        const isProxy = option.value === "proxy";
                        setAbi(isProxy ? implementationAbi : proxyAbi);
                        setIsInteractingAsProxy(isProxy);
                      }
                    }}
                    options={proxyOptions}
                  />
                </HStack>
              </Alert>
            )}
            {isAbiDecoded && (
              <Alert
                status="info"
                rounded="lg"
                bg="rgba(59,130,246,0.08)"
                borderWidth="1px"
                borderColor="rgba(59,130,246,0.20)"
              >
                <AlertIcon color="primary.400" />
                <Text color="text.secondary" fontSize="sm">
                  This contract isn’t verified. Its functions were inferred from bytecode and signature lookups, so some names or input types may differ from the original contract.
                </Text>
              </Alert>
            )}
          </VStack>

          <HStack
            role="tablist"
            aria-label="Contract functions"
            display={{ base: "flex", lg: "none" }}
            spacing={1}
            p={1}
            mb={3}
            bg="whiteAlpha.100"
            rounded="lg"
            onKeyDown={event => {
              const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const index = event.key === "Home" ? 0 : event.key === "End" ? 1 : mobileFunctionType === "read" ? 1 : 0;
              setMobileFunctionType(index === 0 ? "read" : "write");
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
            }}
          >
            {(["read", "write"] as const).map(type => (
              <Button
                key={type}
                id={`contract-${chainId}-${address.toLowerCase()}-${type}-tab`}
                role="tab"
                aria-controls={`contract-${chainId}-${address.toLowerCase()}-${type}-functions`}
                aria-selected={mobileFunctionType === type}
                tabIndex={mobileFunctionType === type ? 0 : -1}
                flex={1}
                minH={10}
                size="sm"
                variant="ghost"
                bg={mobileFunctionType === type ? "whiteAlpha.200" : "transparent"}
                color={mobileFunctionType === type ? "text.primary" : "text.secondary"}
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={() => setMobileFunctionType(type)}
              >
                {type === "read" ? "Read" : "Write"}
              </Button>
            ))}
          </HStack>

          <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }} gap={6} w="full" minW={0}>
            <ReadWriteSection
              key={`read:${chainId}:${address.toLowerCase()}:${isInteractingAsProxy}`}
              prefilledCall={prefill.call?.abiMode === (isInteractingAsProxy ? "implementation" : "contract") ? prefill.call : null}
              prefillRevision={prefill.revision}
              onPrefillScrollStart={prefill.onScrollStart}
              abiMode={isInteractingAsProxy ? "implementation" : "contract"}
              type="read"
              addedFunctionFocus={addedFunctionFocus?.mode === selectedAbiMode && addedFunctionFocus.type === "read" ? addedFunctionFocus : null}
              mobileActive={mobileFunctionType === "read"}
              abi={abi}
              client={client}
              functions={readFunctions}
              address={address}
              chainId={chainId}
              isAbiDecoded={isAbiDecoded}
            />
            <ReadWriteSection
              key={`write:${chainId}:${address.toLowerCase()}:${isInteractingAsProxy}`}
              prefilledCall={prefill.call?.abiMode === (isInteractingAsProxy ? "implementation" : "contract") ? prefill.call : null}
              prefillRevision={prefill.revision}
              onPrefillScrollStart={prefill.onScrollStart}
              abiMode={isInteractingAsProxy ? "implementation" : "contract"}
              type="write"
              addedFunctionFocus={addedFunctionFocus?.mode === selectedAbiMode && addedFunctionFocus.type === "write" ? addedFunctionFocus : null}
              mobileActive={mobileFunctionType === "write"}
              abi={abi}
              client={client}
              functions={writeFunctions}
              address={address}
              chainId={chainId}
              isAbiDecoded={isAbiDecoded}
            />
          </Grid>
          </>}
        </Box>
    );
  };

  // Draft inputs never drive clients or fetches; the loaded route remains authoritative.
  const [addressInput, setAddressInput] = useState(address);
  const [inputError, setInputError] = useState<string | null>(null);
  const pendingRouteRef = useRef<string | null>(null);

  // Back/forward and deep-link navigation replace both drafts together.
  useEffect(() => {
    setAddressInput(address);
    setSelectedNetworkOption(getNetworkOption());
    setInputError(null);
    pendingRouteRef.current = null;
  }, [address, chainId, getNetworkOption]);

  const submitAddress = (input: string, selectedChainId = Number(selectedNetworkOption?.value)) => {
    const explorer = parseContractAddressInput(input);
    const trimmedAddress = explorer?.address ?? input.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      setInputError("Please enter a valid contract address");
      return;
    }
    const draftChainId = explorer?.chainId ?? selectedChainId;
    if (!chainIdToChain[draftChainId] || !networkOptions.some(option => option.value === draftChainId)) {
      setInputError("Please select a valid network");
      return;
    }
    setInputError(null);
    if (trimmedAddress.toLowerCase() === address.toLowerCase() && draftChainId === chainId) return;

    const route = `${getPath(subdomains.CONTRACT.base)}${draftChainId}/${trimmedAddress}`;
    // Ignore a double click / repeated Enter while Next is applying this route.
    if (pendingRouteRef.current === route) return;
    pendingRouteRef.current = route;
    router.push(route);
  };

  const handleAddressSubmit = () => submitAddress(addressInput);

  const handleAddressPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const explorer = parseContractAddressInput(event.clipboardData.getData("text"));
    if (!explorer) return;
    event.preventDefault();
    setAddressInput(explorer.address);
    setSelectedNetworkOption(networkOptions.find(option => option.value === explorer.chainId) ?? null);
    submitAddress(explorer.address, explorer.chainId);
  };

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing && !e.repeat) {
      e.preventDefault();
      handleAddressSubmit();
    }
  };

  const renderAbiEditor = (mode: "contract" | "implementation", onOpen?: () => void, onSubmitted?: () => void) => {
    const originalAbi = mode === "implementation" ? implementationAbi : proxyAbi ?? loadedAbi;
    const editedAbi = customAbis[mode] ?? originalAbi;
    return <ContractAbiEditor
      editorState={abiEditorStates[mode]}
      onEditorStateChange={state => setAbiEditorStates(previous => ({ ...previous, [mode]: state }))}
      abi={editedAbi?.abi ?? []}
      chainId={chainId}
      isCustom={editedAbi?.isCustom === true}
      disabled={isFetchingAbi}
      onOpen={onOpen}
      onSubmitted={onSubmitted}
      baseAbi={editedAbi?.functionEdits?.base.abi ?? editedAbi?.abi ?? []}
      functionDeclarations={editedAbi?.functionEdits?.declarations}
      onApplyFunctions={(incoming, declarations) => {
        const base = editedAbi?.functionEdits?.base ?? editedAbi ?? {
          abi: [], name: slicedText(address),
        };
        const selectors = incoming.map(contractAbiFunctionSelector).filter((selector): selector is string => selector !== null);
        setAddedFunctionFocus(null);
        setCustomAbis(previous => ({ ...previous, [mode]: {
          ...base,
          abi: mergeContractAbi(base.abi, incoming),
          isCustom: incoming.length > 0 || base.isCustom === true,
          customFunctionSelectors: [...new Set([...(base.customFunctionSelectors ?? []), ...selectors])],
          addedFunctionSelectors: selectors,
          functionEdits: { base, declarations },
        } }));
        setUnableToFetchAbi(false);
      }}
      onApply={(incoming, merge) => {
        setAddedFunctionFocus(null);
        const updated: AbiType = {
          name: editedAbi?.name ?? slicedText(address),
          abi: merge ? mergeContractAbi(editedAbi?.abi ?? [], incoming) : incoming,
          isDecoded: merge && editedAbi?.isDecoded === true,
          isCustom: true,
          functionEdits: merge && editedAbi?.functionEdits ? {
            declarations: editedAbi.functionEdits.declarations,
            base: {
              ...editedAbi.functionEdits.base,
              abi: mergeContractAbi(editedAbi.functionEdits.base.abi, incoming),
              isCustom: true,
              customFunctionSelectors: [...new Set([
                ...(editedAbi.functionEdits.base.customFunctionSelectors ?? []),
                ...incoming.map(contractAbiFunctionSelector).filter((selector): selector is string => selector !== null),
              ])],
            },
          } : undefined,
          addedFunctionSelectors: merge ? editedAbi?.addedFunctionSelectors : [],
          customFunctionSelectors: [...new Set([
            ...(merge ? editedAbi?.customFunctionSelectors ?? [] : []),
            ...incoming.map(contractAbiFunctionSelector).filter((selector): selector is string => selector !== null),
          ])],
        };
        setCustomAbis(previous => ({ ...previous, [mode]: updated }));
        setUnableToFetchAbi(false);
      }}
      onFunctionsAdded={added => {
        const first = [...added].sort(compareContractFunctions)[0];
        const selector = first && contractAbiFunctionSelector(first);
        if (!selector) return;
        if (mode !== selectedAbiMode) {
          setAbi(originalAbi);
          setIsInteractingAsProxy(mode === "implementation");
        }
        const type = first.stateMutability === "view" || first.stateMutability === "pure" ? "read" : "write";
        setMobileFunctionType(type);
        setAddedFunctionFocus({ selector, mode, type, revision: ++addedFocusRevision.current });
      }}
      onReset={() => {
        setAddedFunctionFocus(null);
        setUnableToFetchAbi(!loadedAbi);
        setCustomAbis(previous => ({ ...previous, [mode]: null }));
      }}
    />;
  };

  return (
    <AbiExpandedProvider>
      <Box flexDir="column" w="full" minW={0}>
        <Center flexDir={"column"}>
          {/* Contract Header Card */}
          <Box
            sx={{ containerType: "inline-size" }}
            w="full"
            maxW="70rem"
          bg="bg.subtle"
          border="1px solid"
          borderColor="border.default"
          borderRadius="xl"
          p={{ base: 3, md: 5 }}
          mb={4}
        >
          {/* Top row: Address and Chain */}
          <Grid templateColumns={{ base: "minmax(0, 1fr) auto", md: "minmax(0, 1fr) 200px auto" }} gap={{ base: 3, md: 4 }} mb={4} alignItems="end">
            <Box gridColumn={{ base: "1 / -1", md: "auto" }} minW={0}>
              <HStack spacing={2} mb={1.5} align="center">
                <Text color="text.tertiary" fontSize="xs" fontWeight="medium" textTransform="uppercase" letterSpacing="0.05em">
                  Contract Address
                </Text>
                {explorer && explorerUrl && (
                  <Link
                    href={explorerUrl}
                    isExternal
                    rel="noopener noreferrer"
                    aria-label={`View contract on ${explorer.name} (opens in a new tab)`}
                    title={`View contract on ${explorer.name} (opens in a new tab)`}
                    display="inline-flex"
                    color="text.tertiary"
                    _hover={{ color: "text.primary" }}
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                  </Link>
                )}
                {/* Address Book Button - self-contained to avoid parent re-renders */}
                <AddressBookInlineButton
                  address={address}
                  existingLabel={addressBookLabel}
                  defaultLabel={isRealContractName ? abi?.name : ""}
                  isReady={isAddressBookReady}
                />
              </HStack>
              <InputGroup>
                <Input
                  placeholder="0x..."
                  title="Contract address or explorer URL"
                  value={addressInput}
                  aria-label="Contract Address"
                  h={10}
                  isInvalid={Boolean(inputError)}
                  aria-describedby={inputError ? "contract-load-error" : undefined}
                  onChange={(e) => {
                    const explorer = parseContractAddressInput(e.target.value);
                    setAddressInput(explorer?.address ?? e.target.value);
                    if (explorer) {
                      setSelectedNetworkOption(networkOptions.find(option => option.value === explorer.chainId) ?? null);
                    }
                    setInputError(null);
                  }}
                  onPaste={handleAddressPaste}
                  onKeyDown={handleAddressKeyDown}
                  fontFamily="mono"
                  fontSize="sm"
                  bg="bg.muted"
                  border="1px solid"
                  borderColor="border.default"
                  _hover={{ borderColor: "border.strong" }}
                  _focus={{ borderColor: "primary.500", boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)" }}
                />
              </InputGroup>
            </Box>
            <Box minW={0}>
              <Text color="text.tertiary" fontSize="xs" fontWeight="medium" mb={1.5} textTransform="uppercase" letterSpacing="0.05em">
                Network
              </Text>
              <NetworkSelect
                ariaLabel="Network"
                controlProps={{ h: 10, minH: 10 }}
                selectedOption={selectedNetworkOption}
                setSelectedOption={(option) => {
                  setSelectedNetworkOption(option);
                  setInputError(null);
                }}
                options={networkOptions}
              />
            </Box>
            <Button type="button" onClick={handleAddressSubmit} h={10} flexShrink={0} rightIcon={<CornerDownLeft size={14} aria-hidden="true" />}>
              Load
            </Button>
          </Grid>
          {inputError && (
            <Text id="contract-load-error" role="alert" color="red.400" fontSize="sm" mb={4}>
              {inputError}
            </Text>
          )}

          {/* Contract tools remain available when no ABI was found. */}
            <>
              <Box h="1px" bg="border.default" mb={4} />
              <Flex
                flexWrap="wrap"
                gap={3}
                alignItems="center"
              >
                {/* Left side: Contract name + proxy selector */}
                {abi && <HStack spacing={3} minW="min(100%, 12rem)" maxW="full" flex="0 1 auto">
                  <HStack spacing={2} minW={0}>
                    <Text color="text.secondary" fontSize="sm" flexShrink={0}>Contract:</Text>
                    <Text color="text.primary" fontWeight="semibold" fontSize="sm" isTruncated minW={0}>{abi.name || slicedText(address)}</Text>
                  </HStack>
                </HStack>}

                {/* Contract tools */}
                <HStack spacing={2} flexWrap="wrap" minW={0} flex="1 1 20rem" justify="flex-start" sx={{ "@container (min-width: 620px)": { justifyContent: "center" } }} rowGap={2}>
                  <AbiSourceCodeToggle isCustom={abi?.isCustom} />
                  {abi && <ContractCallPrefill
                    restoreFromUrl={contractTab?.initial ?? true}
                    address={address}
                    chainId={chainId}
                    selectedAbi={abi.abi}
                    contractAbi={(customAbis.contract ?? proxyAbi ?? abi).abi}
                    implementationAbi={(customAbis.implementation ?? implementationAbi)?.abi ?? null}
                    abiMode={isInteractingAsProxy ? "implementation" : "contract"}
                    onPrefill={handlePrefill}
                    hasActivePrefill={prefill.call !== null}
                  />}
                </HStack>

                {/* Right side: Connect button */}
                {abi && <Box minW={0} maxW="full" flexShrink={0} sx={{ "@container (min-width: 620px)": { marginLeft: "auto" } }}>
                  <ConnectButton expectedChainId={chainId} />
                </Box>}
              </Flex>
            </>
        </Box>
        {isFetchingAbi && (
          <Box w="full" maxW="70rem" mt={4}>
            {/* Alerts skeleton */}
            <VStack spacing={3} align="stretch" mb={4}>
              <Skeleton height="48px" borderRadius="lg" />
            </VStack>

            {/* Read/Write sections skeleton */}
            <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }} gap={6} w="full" minW={0}>
              {/* Read section skeleton */}
              <Box>
                <Box p={3} bg="bg.muted" rounded="lg" mb={3} border="1px solid" borderColor="border.default">
                  <HStack justify="space-between" mb={3}>
                    <Skeleton height="20px" width="100px" />
                    <Skeleton height="32px" width="100px" borderRadius="md" />
                  </HStack>
                  <Skeleton height="40px" width="70%" mx="auto" borderRadius="md" />
                </Box>
                <VStack spacing={3}>
                  {[1, 2, 3, 4].map((i) => (
                    <Box key={i} w="full" p={3} bg="bg.subtle" rounded="lg" border="1px solid" borderColor="border.default">
                      <HStack justify="space-between">
                        <Skeleton height="18px" width={`${80 + i * 20}px`} />
                        <Skeleton height="24px" width="24px" borderRadius="md" />
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>

              {/* Write section skeleton */}
              <Box>
                <Box p={3} bg="bg.muted" rounded="lg" mb={3} border="1px solid" borderColor="border.default">
                  <HStack justify="space-between" mb={3}>
                    <Skeleton height="20px" width="100px" />
                    <Skeleton height="32px" width="100px" borderRadius="md" />
                  </HStack>
                  <Skeleton height="40px" width="70%" mx="auto" borderRadius="md" />
                </Box>
                <VStack spacing={3}>
                  {[1, 2, 3, 4].map((i) => (
                    <Box key={i} w="full" p={3} bg="bg.subtle" rounded="lg" border="1px solid" borderColor="border.default">
                      <HStack justify="space-between">
                        <Skeleton height="18px" width={`${100 + i * 15}px`} />
                        <Skeleton height="24px" width="24px" borderRadius="md" />
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            </Grid>
          </Box>
        )}
        {unableToFetchAbi && !abi?.isCustom && (
          <Box
            mt={4}
            p={4}
            bg="rgba(239,68,68,0.08)"
            border="1px solid"
            borderColor="rgba(239,68,68,0.20)"
            borderRadius="lg"
          >
            <Text color="red.300" fontSize="sm">
              Unable to fetch ABI for this address. The contract may not exist or the network may be unavailable.
            </Text>
          </Box>
        )}
        </Center>
        {renderFunctions()}
      </Box>
    </AbiExpandedProvider>
  );
};

// Never pair a new route with the previous route's ABI, prefill or pending preview.
function SavedRpcContract(props: { params: { address: string; chainId: number } }) {
  const saved = useCustomChains();
  const endpointKey = getRpcUrlsForChain(props.params.chainId).join("|");
  if (!saved.ready && !chainIdToChain[props.params.chainId]) return <Text color="text.secondary">Loading saved network…</Text>;
  return <LoadedContractPage key={`${props.params.chainId}:${endpointKey}`} {...props} />;
}
export const ContractPage = (props: { params: { address: string; chainId: number } }) =>
  <ContractTabs key={`${props.params.chainId}:${props.params.address.toLowerCase()}`} initial={props.params} renderContract={params => <SavedRpcContract params={params} />} />;

export const ContractWorkspace = () => (
  <ContractTabs renderContract={params => <SavedRpcContract params={params} />} />
);
