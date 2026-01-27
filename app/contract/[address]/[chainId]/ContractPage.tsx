"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DarkSelect } from "@/components/DarkSelect";
import {
  ExtendedJsonFragmentType,
  HighlightedContent,
  SelectedOptionState,
} from "@/types";
import { chainIdToChain, networkOptions } from "@/data/common";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Collapse,
  Grid,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Select,
  Skeleton,
  Spacer,
  Spinner,
  Tag,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { AddIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, EditIcon } from "@chakra-ui/icons";
import { BookOpen } from "lucide-react";
import { useAddressBook } from "@/hooks/useAddressBook";
import { AddressLabelModal } from "@/components/AddressBook";
import { parseAsInteger, useQueryState } from "nuqs";
import { JsonFragment } from "ethers";
import { Address, PublicClient, createPublicClient, http } from "viem";
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
import { Code, FileText } from "lucide-react";

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
};

type SourceCodeType = Record<string, string> | undefined;

// Small toggle button for ABI & Source Code
const AbiSourceCodeToggle = ({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onToggle}
      color="text.secondary"
      borderColor="whiteAlpha.300"
      bg="whiteAlpha.50"
      _hover={{ color: "text.primary", bg: "whiteAlpha.100", borderColor: "whiteAlpha.400" }}
      leftIcon={<Code size={14} />}
      rightIcon={isExpanded ? <ChevronUpIcon boxSize={4} /> : <ChevronDownIcon boxSize={4} />}
      px={3}
      h={7}
      fontSize="xs"
      ml={4}
    >
      ABI & Source Code
    </Button>
  );
};

// Component to display ABI and Source Code content
const AbiSourceCodeContent = ({
  abi,
  proxyAbi,
  implementationAbi,
  sourceCode,
  proxySourceCode,
  implementationSourceCode,
  implementationAddress,
  isAbiDecoded,
  isLoadingSourceCode,
  isExpanded,
}: {
  abi: AbiType | null;
  proxyAbi: AbiType | null;
  implementationAbi: AbiType | null;
  sourceCode: SourceCodeType;
  proxySourceCode: SourceCodeType;
  implementationSourceCode: SourceCodeType;
  implementationAddress: string | null;
  isAbiDecoded: boolean;
  isLoadingSourceCode: boolean;
  isExpanded: boolean;
}) => {
  // 0 = ABI, 1 = Source Code
  const [contentTabIndex, setContentTabIndex] = useState(0);
  // 0 = Implementation, 1 = Proxy (only shown for proxy contracts)
  const [contractTabIndex, setContractTabIndex] = useState(0);
  // For source code with multiple files
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

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

  const sourceCodeFiles = useMemo(() => {
    if (!currentSourceCode) return [];
    return Object.keys(currentSourceCode);
  }, [currentSourceCode]);

  const sourceCodeContent = useMemo(() => {
    if (!currentSourceCode || sourceCodeFiles.length === 0) return "";
    const file = sourceCodeFiles[selectedFileIndex] || sourceCodeFiles[0];
    return currentSourceCode[file] || "";
  }, [currentSourceCode, sourceCodeFiles, selectedFileIndex]);

  // Reset file selection when source code changes
  useEffect(() => {
    setSelectedFileIndex(0);
  }, [currentSourceCode]);

  const abiContent = useMemo(() => {
    if (!currentAbi) return "";
    try {
      return JSON.stringify(currentAbi.abi, null, 2);
    } catch {
      return "";
    }
  }, [currentAbi]);

  if (!abi || !isExpanded) return null;

  return (
    <Box
      mb={4}
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      overflow="hidden"
      bg="bg.subtle"
      p={3}
    >
      {/* Compact tabs row */}
      <HStack spacing={4} mb={3} flexWrap="wrap">
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
          tabs={["ABI", "Source Code"]}
          selectedTabIndex={contentTabIndex}
          setSelectedTabIndex={setContentTabIndex}
          mt={0}
        />
      </HStack>

      {/* Content */}
      {contentTabIndex === 0 ? (
        // ABI View
        <Box>
          {isAbiDecoded && !isProxy ? (
            <Alert status="info" mb={3} rounded="lg" fontSize="sm">
              <AlertIcon />
              ABI reconstructed from bytecode (contract not verified)
            </Alert>
          ) : null}
          <Box
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            overflow="hidden"
          >
            <Editor
              theme="vs-dark"
              defaultLanguage="json"
              value={abiContent}
              height="350px"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
              }}
            />
          </Box>
        </Box>
      ) : (
          // Source Code View
          <Box>
            {isLoadingSourceCode ? (
              <HStack justify="center" py={8}>
                <Spinner size="sm" />
                <Text color="text.secondary">Loading source code...</Text>
              </HStack>
            ) : !currentSourceCode || sourceCodeFiles.length === 0 ? (
              <Text color="text.secondary" fontSize="sm" py={2}>
                Source code not available (contract may not be verified)
              </Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {/* File selector for multiple files */}
                {sourceCodeFiles.length > 1 && (
                  <Box>
                    <Text color="text.secondary" fontSize="sm" mb={2}>
                      File ({sourceCodeFiles.length} files)
                    </Text>
                    <DarkSelect
                      placeholder="Select file"
                      options={sourceCodeFiles.map((file, idx) => ({
                        label: file,
                        value: idx,
                      }))}
                      selectedOption={{
                        label: sourceCodeFiles[selectedFileIndex],
                        value: selectedFileIndex,
                      }}
                      setSelectedOption={(option) => {
                        if (option) {
                          setSelectedFileIndex(option.value as number);
                        }
                      }}
                    />
                  </Box>
                )}
                <Box
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="lg"
                  overflow="hidden"
                >
                  <Editor
                    theme="vs-dark"
                    defaultLanguage="solidity"
                    value={sourceCodeContent}
                    height="400px"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: "on",
                    }}
                  />
                </Box>
              </VStack>
            )}
          </Box>
        )}
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
}: {
  type: "read" | "write";
  abi: AbiType;
  client: PublicClient | null;
  functions: JsonFragment[];
  address: string;
  chainId: number;
  isAbiDecoded?: boolean;
}) => {
  const stickyHeaderRef = useRef<HTMLDivElement>(null);

  const [allCollapsed, setAllCollapsed] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<number[]>([]);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const functionRefs = useRef<(HTMLDivElement | null)[]>([]);
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
        <HStack w="70%">
          <InputGroup>
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
    <Box>
      <Box
        ref={stickyHeaderRef}
        position="sticky"
        top={abi.name.length > 0 ? "40px" : "0"}
        zIndex={1}
        p={2}
        boxShadow="md"
        bg="bg.900"
      >
        <HStack mb={2}>
          <Spacer />
          <Box fontWeight="bold" mr={allCollapsed ? "-9rem" : "-8rem"}>
            <>{type === "read" ? "Read" : "Write"} Contract</>
          </Box>
          <Spacer />
          <Button
            size="sm"
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
          functions?.map((func, index) => (
            <Box key={index} ref={(el) => { functionRefs.current[index] = el; }}>
              {type === "read" ? (
                <ReadWriteFunction
                  key={index}
                  client={client}
                  index={index + 1}
                  type={"read"}
                  func={getFunc(func, index)}
                  address={address}
                  chainId={chainId}
                  isAbiDecoded={isAbiDecoded || false}
                  readAllCollapsed={allCollapsed}
                />
              ) : (
                <ReadWriteFunction
                  key={index}
                  client={client}
                  index={index + 1}
                  type={"write"}
                  func={getFunc(func, index)}
                  address={address}
                  chainId={chainId}
                  isAbiDecoded={isAbiDecoded || false}
                  readAllCollapsed={allCollapsed}
                />
              )}
            </Box>
          ))}
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

export const ContractPage = ({
  params: { address, chainId },
}: {
  params: {
    address: string;
    chainId: number;
  };
}) => {
  const router = useTopLoaderRouter();

  // Find network option, default to first option (mainnet) if not found
  const getNetworkOption = useCallback(() => {
    const index = networkOptions.findIndex((option) => option.value === chainId);
    return index >= 0 ? networkOptions[index] : networkOptions[0];
  }, [chainId]);

  // dynamic imports
  const [evmole, setEvmole] = useState<any>(null);

  useEffect(() => {
    import("evmole").then((module) => {
      setEvmole(module);
    });
  }, []);

  // state
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(() => getNetworkOption());
  const [client, setClient] = useState<PublicClient | null>(() => {
    // Initialize client immediately with chainId from props
    if (chainIdToChain[chainId]) {
      return createPublicClient({
        chain: chainIdToChain[chainId],
        transport: http(),
      });
    }
    return null;
  });

  const [abi, setAbi] = useState<AbiType | null>(null);
  const [isAbiDecoded, setIsAbiDecoded] = useState<boolean>(false);
  const [isFetchingAbi, setIsFetchingAbi] = useState<boolean>(false);
  const [unableToFetchAbi, setUnableToFetchAbi] = useState<boolean>(false);
  const [implementationAddress, setImplementationAddress] = useState<
    string | null
  >(null);
  const [implementationAbi, setImplementationAbi] = useState<AbiType | null>(
    null
  );
  const [proxyAbi, setProxyAbi] = useState<AbiType | null>(null);
  const [isInteractingAsProxy, setIsInteractingAsProxy] =
    useState<boolean>(false);

  const [readFunctions, setReadFunctions] = useState<JsonFragment[]>([]);

  // Address Book integration
  const { getLabel, isReady: isAddressBookReady } = useAddressBook();
  const addressBookLabel = isAddressBookReady ? getLabel(address) : null;
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Check if contract name is a real name or just a truncated address
  const isRealContractName = useMemo(() => {
    if (!abi?.name) return false;
    // If name contains "..." it's likely a truncated address (from slicedText)
    return !abi.name.includes("...");
  }, [abi?.name]);
  const [writeFunctions, setWriteFunctions] = useState<JsonFragment[]>([]);

  // Source code state
  const [sourceCode, setSourceCode] = useState<SourceCodeType>(undefined);
  const [proxySourceCode, setProxySourceCode] = useState<SourceCodeType>(undefined);
  const [implementationSourceCode, setImplementationSourceCode] = useState<SourceCodeType>(undefined);
  const [isLoadingSourceCode, setIsLoadingSourceCode] = useState<boolean>(false);
  const [isAbiExpanded, setIsAbiExpanded] = useState<boolean>(false);

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

      setIsAbiDecoded(false);
    } catch (e) {
      console.log("Error fetching verified ABI:", e);

      try {
        // Create client for bytecode fetch
        const client = createPublicClient({
          chain: chainIdToChain[chainId],
          transport: http(),
        });

        // Fetch contract bytecode
        const contractCode = await client.getCode({
          address: address as Address,
        });

        if (contractCode === "0x") {
          throw new Error("No contract code found at address");
        }

        setIsAbiDecoded(true);

        // check if contract is a proxy
        const resGetImplementation = await getImplementationFromBytecodeIfProxy(
          {
            client,
            address,
          }
        );

        if (resGetImplementation) {
          const { implementationAddress, proxyName } = resGetImplementation;

          let implementation: {
            abi: JsonFragment[];
            name: string;
          } = {
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

  // Sync selectedNetworkOption when chainId prop changes (e.g., navigation)
  useEffect(() => {
    const newOption = getNetworkOption();
    setSelectedNetworkOption(newOption);
    // Also update client when chainId changes from props
    if (chainIdToChain[chainId] && chainId !== currentChainIdRef.current) {
      currentChainIdRef.current = chainId;
      setClient(
        createPublicClient({
          chain: chainIdToChain[chainId],
          transport: http(),
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  // Set chainId and client when network option changes
  useEffect(() => {
    if (selectedNetworkOption) {
      const newChainId = parseInt(selectedNetworkOption.value.toString());

      // Only push new route and update client if chainId actually changed
      if (newChainId !== chainId) {
        router.push(
          `${getPath(
            subdomains.EXPLORER.base
          )}contract/${address}/${newChainId}`
        );
      }

      // Only create new client if chainId actually changed
      if (newChainId !== currentChainIdRef.current) {
        currentChainIdRef.current = newChainId;
        setClient(
          createPublicClient({
            chain: chainIdToChain[newChainId],
            transport: http(),
          })
        );
      }
    }
  }, [selectedNetworkOption, chainId, router, address]);

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

  // Set functions from abi
  useEffect(() => {
    if (abi) {
      if (abi.name && abi.name.length > 0) {
        document.title = `${abi.name} - ${address} | ETH.sh`;
      }

      const readFunctions = abi.abi.filter(
        (item: JsonFragment) =>
          item.stateMutability === "view" || item.stateMutability === "pure"
      );
      setReadFunctions(readFunctions);

      const writeFunctions = abi.abi.filter(
        (item: JsonFragment) =>
          item.stateMutability !== "view" &&
          item.stateMutability !== "pure" &&
          item.type === "function"
      );
      setWriteFunctions(writeFunctions);
    }
  }, [abi, address]);

  const renderFunctions = () => {
    return (
      abi && (
        <Box mt="1rem">
          {isAbiDecoded && (
            <Alert status="info" mb={"1rem"} rounded={"lg"}>
              <AlertIcon />
              Contract not verified, used whatsabi & evmole to determine
              functions
            </Alert>
          )}
          <Alert status="warning" mb={"1rem"} rounded={"lg"}>
            <AlertIcon />
            Tool is in beta, please verify connected chain and calldata before
            sending transactions
          </Alert>
          {implementationAddress && (
            <Alert status="info" mb={"1rem"} rounded={"lg"}>
              <AlertIcon />
              This is a Proxy Contract for implementation:
              <Link
                ml="0.2rem"
                href={`${getPath(
                  subdomains.EXPLORER.base
                )}contract/${implementationAddress}/${chainId}`}
                fontWeight="bold"
                isExternal
              >
                {implementationAddress}
              </Link>
            </Alert>
          )}
          {abi.name.length > 0 && (
            <HStack>
              <HStack
                position="sticky"
                top="0"
                zIndex={1}
                p={2}
                boxShadow="md"
                bg="bg.900"
                spacing={3}
              >
                <Text>
                  Contract Name: <b>{abi.name}</b>
                </Text>
                {/* Address Book Label */}
                {addressBookLabel ? (
                  <HStack spacing={1}>
                    <Tag size="sm" variant="solid" colorScheme="purple">
                      {addressBookLabel}
                    </Tag>
                    <Tooltip label="Edit Label" placement="top">
                      <IconButton
                        aria-label="Edit label"
                        icon={<EditIcon />}
                        size="xs"
                        variant="ghost"
                        color="whiteAlpha.600"
                        _hover={{ color: "white" }}
                        onClick={() => setIsLabelModalOpen(true)}
                      />
                    </Tooltip>
                  </HStack>
                ) : (
                  isAddressBookReady && (
                    <Tooltip label="Save to Address Book" placement="top">
                      <IconButton
                        aria-label="Save to address book"
                        icon={
                          <HStack spacing={0.5}>
                            <BookOpen size={12} />
                            <AddIcon boxSize={2} />
                          </HStack>
                        }
                        size="xs"
                        variant="ghost"
                        color="whiteAlpha.400"
                        _hover={{ color: "white", bg: "whiteAlpha.200" }}
                        onClick={() => setIsLabelModalOpen(true)}
                      />
                    </Tooltip>
                  )
                )}
                {/* ABI & Source Code Toggle */}
                <AbiSourceCodeToggle
                  isExpanded={isAbiExpanded}
                  onToggle={() => setIsAbiExpanded(!isAbiExpanded)}
                />
              </HStack>
              <Spacer />
              <ConnectButton expectedChainId={chainId} />
            </HStack>
          )}
          {implementationAddress && (
            <HStack p={2}>
              <Box fontStyle="italic">Interacting as</Box>
              <DarkSelect
                boxProps={{
                  w: "15rem",
                }}
                selectedOption={{
                  label: isInteractingAsProxy ? "Proxy" : "Contract",
                  value: isInteractingAsProxy ? "proxy" : "Contract",
                }}
                setSelectedOption={(option) => {
                  if (option) {
                    const isProxy = option.value === "proxy";
                    setAbi(isProxy ? implementationAbi : proxyAbi);
                    setIsInteractingAsProxy(isProxy);
                  }
                }}
                options={proxyOptions}
              />
            </HStack>
          )}
          {/* ABI & Source Code Content */}
          <AbiSourceCodeContent
            abi={abi}
            proxyAbi={proxyAbi}
            implementationAbi={implementationAbi}
            sourceCode={sourceCode}
            proxySourceCode={proxySourceCode}
            implementationSourceCode={implementationSourceCode}
            implementationAddress={implementationAddress}
            isAbiDecoded={isAbiDecoded}
            isLoadingSourceCode={isLoadingSourceCode}
            isExpanded={isAbiExpanded}
          />
          <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={2}>
            <ReadWriteSection
              type="read"
              abi={abi}
              client={client}
              functions={readFunctions}
              address={address}
              chainId={chainId}
              isAbiDecoded={isAbiDecoded}
            />
            <ReadWriteSection
              type="write"
              abi={abi}
              client={client}
              functions={writeFunctions}
              address={address}
              chainId={chainId}
              isAbiDecoded={isAbiDecoded}
            />
          </Grid>
        </Box>
      )
    );
  };

  // State for address input
  const [addressInput, setAddressInput] = useState(address);

  // Sync address input when address prop changes (e.g., navigation)
  useEffect(() => {
    setAddressInput(address);
  }, [address]);

  const handleAddressSubmit = () => {
    const trimmedAddress = addressInput.trim();
    if (trimmedAddress && trimmedAddress !== address) {
      router.push(
        `${getPath(subdomains.CONTRACT.base)}${trimmedAddress}/${chainId}`
      );
    }
  };

  const handleAddressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddressSubmit();
    }
  };

  return (
    <Box flexDir={"column"} minW={abi ? "60rem" : "40rem"}>
      <Center flexDir={"column"}>
        {/* Address Input and Chain Selector */}
        <VStack spacing={4} mb={4}>
          <InputGroup w="26rem">
            <Input
              placeholder="Contract Address (0x...)"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={handleAddressKeyDown}
              onBlur={handleAddressSubmit}
              fontFamily="mono"
              fontSize="sm"
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.400" }}
              _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
            />
          </InputGroup>
          <DarkSelect
            boxProps={{
              w: "20rem",
            }}
            selectedOption={selectedNetworkOption}
            setSelectedOption={setSelectedNetworkOption}
            options={networkOptions}
          />
        </VStack>
        {isFetchingAbi && (
          <Box w="full" maxW="70rem" mt={4}>
            {/* Contract name skeleton */}
            <HStack p={2} mb={4}>
              <HStack spacing={3}>
                <Skeleton height="20px" width="120px" />
                <Skeleton height="24px" width="180px" borderRadius="md" />
                <Skeleton height="28px" width="140px" borderRadius="md" />
              </HStack>
              <Spacer />
              <Skeleton height="36px" width="140px" borderRadius="md" />
            </HStack>

            {/* Read/Write sections skeleton */}
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              {/* Read section skeleton */}
              <Box>
                <Box p={2} bg="bg.900" rounded="lg" mb={2}>
                  <HStack justify="space-between" mb={2}>
                    <Skeleton height="20px" width="100px" />
                    <Skeleton height="32px" width="100px" borderRadius="md" />
                  </HStack>
                  <Skeleton height="40px" width="70%" mx="auto" borderRadius="md" />
                </Box>
                <VStack spacing={3} p={2}>
                  {[1, 2, 3, 4].map((i) => (
                    <Box key={i} w="full" p={3} bg="whiteAlpha.50" rounded="lg" border="1px solid" borderColor="whiteAlpha.100">
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
                <Box p={2} bg="bg.900" rounded="lg" mb={2}>
                  <HStack justify="space-between" mb={2}>
                    <Skeleton height="20px" width="100px" />
                    <Skeleton height="32px" width="100px" borderRadius="md" />
                  </HStack>
                  <Skeleton height="40px" width="70%" mx="auto" borderRadius="md" />
                </Box>
                <VStack spacing={3} p={2}>
                  {[1, 2, 3, 4].map((i) => (
                    <Box key={i} w="full" p={3} bg="whiteAlpha.50" rounded="lg" border="1px solid" borderColor="whiteAlpha.100">
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
        {unableToFetchAbi && (
          <HStack mt={2} color="red.300">
            <Box>Unable to Fetch ABI for this address</Box>
          </HStack>
        )}
      </Center>
      {renderFunctions()}

      {/* Address Label Modal for save/edit */}
      <AddressLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        address={address}
        existingLabel={addressBookLabel}
        defaultLabel={isRealContractName ? abi?.name || "" : ""}
      />
    </Box>
  );
};
