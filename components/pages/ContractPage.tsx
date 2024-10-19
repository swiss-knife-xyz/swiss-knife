"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DarkSelect } from "@/components/DarkSelect";
import {
  ExtendedJsonFragmentType,
  HighlightedContent,
  SelectedOptionState,
} from "@/types";
import { chainIdToChain, networkOptions } from "@/data/common";
import {
  Box,
  Button,
  Center,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Spacer,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { parseAsInteger, useQueryState } from "next-usequerystate";
import { JsonFragment } from "ethers";
import { PublicClient, createPublicClient, http } from "viem";
import { whatsabi } from "@shazow/whatsabi";
import { fetchContractAbi } from "@/lib/decoder";
import { ReadFunction } from "@/components/fnParams/ReadFunction";
// import { WriteFunction } from "@/components/fnParams/WriteFunction";

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

export const ContractPage = ({
  params: { address },
}: {
  params: {
    address: string;
  };
}) => {
  // url params
  // FIXME: use segment to get chainId (currently reverts to mainnet when new address is pasted, even though different networks was selected)
  const searchParams = useSearchParams();
  const chainIdFromURL = searchParams.get("chainId");
  const networkOptionsIndex = chainIdFromURL
    ? networkOptions.findIndex(
        (option) => option.value === parseInt(chainIdFromURL)
      )
    : 0;

  // url state
  const [chainId, setChainId] = useQueryState<number>(
    "chainId",
    parseAsInteger.withDefault(1)
  );

  // state
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[networkOptionsIndex]);
  const [client, setClient] = useState<PublicClient | null>(null);

  const [abi, setAbi] = useState<{
    abi: JsonFragment[];
    name: string;
  } | null>(null);
  const [isFetchingAbi, setIsFetchingAbi] = useState<boolean>(false);
  const [unableToFetchAbi, setUnableToFetchAbi] = useState<boolean>(false);

  const [readFunctions, setReadFunctions] = useState<JsonFragment[]>([]);
  const [writeFunctions, setWriteFunctions] = useState<JsonFragment[]>([]);

  const [readAllCollapsed, setReadAllCollapsed] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [searchResults, setSearchResults] = useState<number[]>([]);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const readFunctionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length === 1) {
      scrollStickyHeaderToTop();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setCurrentResultIndex(0);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleSearchFocus = () => {
    scrollStickyHeaderToTop();
  };

  const scrollToFunction = useCallback((index: number) => {
    if (
      readFunctionRefs.current[index] &&
      stickyHeaderRef.current &&
      scrollContainerRef.current
    ) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const headerRect = stickyHeaderRef.current.getBoundingClientRect();
      const functionRect =
        readFunctionRefs.current[index]!.getBoundingClientRect();

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

  const fetchSetAbi = async () => {
    try {
      setIsFetchingAbi(true);
      setUnableToFetchAbi(false);
      // try fetching if contract is verified
      const _fetchedAbi = await fetchContractAbi({ address, chainId });
      const fetchedAbi = {
        abi: [
          {
            inputs: [
              {
                internalType: "address",
                name: "_factory",
                type: "address",
              },
              {
                internalType: "address",
                name: "_WETH9",
                type: "address",
              },
            ],
            stateMutability: "nonpayable",
            type: "constructor",
          },
          {
            inputs: [],
            name: "WETH9",
            outputs: [
              {
                internalType: "address",
                name: "",
                type: "address",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "factory",
            outputs: [
              {
                internalType: "address",
                name: "",
                type: "address",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              {
                internalType: "bytes",
                name: "path",
                type: "bytes",
              },
              {
                internalType: "uint256",
                name: "amountIn",
                type: "uint256",
              },
            ],
            name: "quoteExactInput",
            outputs: [
              {
                internalType: "uint256",
                name: "amountOut",
                type: "uint256",
              },
              {
                internalType: "uint160[]",
                name: "sqrtPriceX96AfterList",
                type: "uint160[]",
              },
              {
                internalType: "uint32[]",
                name: "initializedTicksCrossedList",
                type: "uint32[]",
              },
              {
                internalType: "uint256",
                name: "gasEstimate",
                type: "uint256",
              },
            ],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              {
                components: [
                  {
                    internalType: "address",
                    name: "tokenIn",
                    type: "address",
                  },
                  {
                    internalType: "address",
                    name: "tokenOut",
                    type: "address",
                  },
                  {
                    internalType: "uint256",
                    name: "amountIn",
                    type: "uint256",
                  },
                  {
                    internalType: "uint24",
                    name: "fee",
                    type: "uint24",
                  },
                  {
                    internalType: "uint160",
                    name: "sqrtPriceLimitX96",
                    type: "uint160",
                  },
                ],
                internalType: "struct IQuoterV2.QuoteExactInputSingleParams",
                name: "params",
                type: "tuple",
              },
            ],
            name: "quoteExactInputSingle",
            outputs: [
              {
                internalType: "uint256",
                name: "amountOut",
                type: "uint256",
              },
              {
                internalType: "uint160",
                name: "sqrtPriceX96After",
                type: "uint160",
              },
              {
                internalType: "uint32",
                name: "initializedTicksCrossed",
                type: "uint32",
              },
              {
                internalType: "uint256",
                name: "gasEstimate",
                type: "uint256",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [
              {
                internalType: "bytes",
                name: "path",
                type: "bytes",
              },
              {
                internalType: "uint256",
                name: "amountOut",
                type: "uint256",
              },
            ],
            name: "quoteExactOutput",
            outputs: [
              {
                internalType: "uint256",
                name: "amountIn",
                type: "uint256",
              },
              {
                internalType: "uint160[]",
                name: "sqrtPriceX96AfterList",
                type: "uint160[]",
              },
              {
                internalType: "uint32[]",
                name: "initializedTicksCrossedList",
                type: "uint32[]",
              },
              {
                internalType: "uint256",
                name: "gasEstimate",
                type: "uint256",
              },
            ],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              {
                components: [
                  {
                    internalType: "address",
                    name: "tokenIn",
                    type: "address",
                  },
                  {
                    internalType: "address",
                    name: "tokenOut",
                    type: "address",
                  },
                  {
                    internalType: "uint256",
                    name: "amount",
                    type: "uint256",
                  },
                  {
                    internalType: "uint24",
                    name: "fee",
                    type: "uint24",
                  },
                  {
                    internalType: "uint160",
                    name: "sqrtPriceLimitX96",
                    type: "uint160",
                  },
                ],
                internalType: "struct IQuoterV2.QuoteExactOutputSingleParams",
                name: "params",
                type: "tuple",
              },
            ],
            name: "quoteExactOutputSingle",
            outputs: [
              {
                internalType: "uint256",
                name: "amountIn",
                type: "uint256",
              },
              {
                internalType: "uint160",
                name: "sqrtPriceX96After",
                type: "uint160",
              },
              {
                internalType: "uint32",
                name: "initializedTicksCrossed",
                type: "uint32",
              },
              {
                internalType: "uint256",
                name: "gasEstimate",
                type: "uint256",
              },
            ],
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            inputs: [
              {
                internalType: "int256",
                name: "amount0Delta",
                type: "int256",
              },
              {
                internalType: "int256",
                name: "amount1Delta",
                type: "int256",
              },
              {
                internalType: "bytes",
                name: "path",
                type: "bytes",
              },
            ],
            name: "uniswapV3SwapCallback",
            outputs: [],
            stateMutability: "view",
            type: "function",
          },
        ],
        name: "QuoterV2",
      };
      console.log(_fetchedAbi);
      setAbi({
        abi: fetchedAbi.abi as JsonFragment[],
        name: fetchedAbi.name,
      });
    } catch (e) {
      try {
        // try to determine abi using whatsabi
        const client = createPublicClient({
          chain: chainIdToChain[chainId],
          transport: http(),
        });
        const result = await whatsabi.autoload(address, { provider: client });
        console.log({ whatsabi: result });
        // FIXME: handle whatsabi result (stateMutability doesn't exist)
        // we can surely filter write functions if they are payable
        // have the UI render differently, by listing all the functions, without read & write divide
        // the write functions would be displayed with a button that allows to call as view function
      } catch {
        setUnableToFetchAbi(true);
        console.log("Failed to fetch abi");
      }
    } finally {
      setIsFetchingAbi(false);
    }
  };

  useEffect(() => {
    if (selectedNetworkOption) {
      setChainId(parseInt(selectedNetworkOption.value.toString()));
      setClient(
        createPublicClient({
          chain: chainIdToChain[chainId],
          transport: http(),
        })
      );
    }
  }, [selectedNetworkOption]);

  useEffect(() => {
    fetchSetAbi();
  }, [address, chainId]);

  useEffect(() => {
    if (abi) {
      if (abi.name && abi.name.length > 0) {
        document.title = `${abi.name} - ${address} | Swiss-Knife.xyz`;
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
  }, [abi]);

  const computedSearchResults = useMemo(() => {
    if (debouncedSearchQuery) {
      return readFunctions
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
  }, [debouncedSearchQuery, readFunctions]);

  useEffect(() => {
    setSearchResults(computedSearchResults);
    setCurrentResultIndex(0);
  }, [computedSearchResults]);

  useEffect(() => {
    if (searchResults.length > 0) {
      scrollToFunction(searchResults[currentResultIndex]);
    }
  }, [currentResultIndex, searchResults, scrollToFunction]);

  return (
    <Box flexDir={"column"} minW={abi ? "60rem" : "40rem"}>
      <Center flexDir={"column"}>
        <DarkSelect
          boxProps={{
            w: "20rem",
          }}
          selectedOption={selectedNetworkOption}
          setSelectedOption={setSelectedNetworkOption}
          options={networkOptions}
        />
        {isFetchingAbi && (
          <HStack mt={5}>
            <Box>Fetching ABI...</Box>
            <Spinner />
          </HStack>
        )}
        {unableToFetchAbi && (
          <HStack mt={5} color="red.300">
            <Box>Unable to Fetch ABI for this address</Box>
          </HStack>
        )}
      </Center>
      {abi && (
        <>
          {abi.name.length > 0 && (
            <Box
              position="sticky"
              top="0"
              zIndex={1}
              p={2}
              boxShadow="md"
              bg="bg.900"
            >
              Contract Name: <b>{abi.name}</b>
            </Box>
          )}
          <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={5}>
            {/* Read Contract Section */}
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
                  <Box fontWeight="bold">Read Contract</Box>
                  <Spacer />
                  <Button
                    size="sm"
                    onClick={() => {
                      setReadAllCollapsed(!readAllCollapsed);
                    }}
                  >
                    {readAllCollapsed ? "Uncollapse" : "Collapse"} All
                  </Button>
                </HStack>
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
                              (prevIndex) =>
                                (prevIndex + 1) % searchResults.length
                            )
                          }
                        >
                          &darr;
                        </Button>
                      </>
                    )}
                  </HStack>
                </Center>
              </Box>
              <Box
                ref={scrollContainerRef}
                overflowY="auto"
                maxHeight="calc(100vh - 1px)"
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
                {client &&
                  readFunctions?.map((func, index) => (
                    <Box
                      key={index}
                      ref={(el) => (readFunctionRefs.current[index] = el)}
                    >
                      <ReadFunction
                        key={index}
                        client={client}
                        index={index}
                        func={{
                          ...func,
                          name: ensureHighlightedContent(
                            func.name,
                            searchQuery,
                            searchResults[currentResultIndex] === index
                          ),
                          outputs: func.outputs?.map(
                            (output): ExtendedJsonFragmentType => ({
                              ...output,
                              name: ensureHighlightedContent(
                                output.name,
                                searchQuery,
                                searchResults[currentResultIndex] === index
                              ),
                            })
                          ),
                        }}
                        address={address}
                        chainId={chainId}
                        readAllCollapsed={readAllCollapsed}
                      />
                    </Box>
                  ))}
              </Box>
            </Box>
            {/* Write Contract Section */}
            {/* <Box>
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
                  <Box fontWeight="bold">Write Contract</Box>
                  <Spacer />
                  <Button
                    size="sm"
                    onClick={() => {
                      setReadAllCollapsed(!readAllCollapsed);
                    }}
                  >
                    {readAllCollapsed ? "Uncollapse" : "Collapse"} All
                  </Button>
                </HStack>
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
                              (prevIndex) =>
                                (prevIndex + 1) % searchResults.length
                            )
                          }
                        >
                          &darr;
                        </Button>
                      </>
                    )}
                  </HStack>
                </Center>
              </Box>
              <Box
                ref={scrollContainerRef}
                overflowY="auto"
                maxHeight="calc(100vh - 1px)"
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
                {client &&
                  writeFunctions?.map((func, index) => (
                    <Box
                      key={index}
                      ref={(el) => (readFunctionRefs.current[index] = el)}
                    >
                      <WriteFunction
                        key={index}
                        client={client}
                        index={index}
                        func={{
                          ...func,
                          name: ensureHighlightedContent(
                            func.name,
                            searchQuery,
                            searchResults[currentResultIndex] === index
                          ),
                          outputs: func.outputs?.map(
                            (output): ExtendedJsonFragmentType => ({
                              ...output,
                              name: ensureHighlightedContent(
                                output.name,
                                searchQuery,
                                searchResults[currentResultIndex] === index
                              ),
                            })
                          ),
                        }}
                        address={address}
                        chainId={chainId}
                        readAllCollapsed={readAllCollapsed}
                      />
                    </Box>
                  ))}
              </Box>
            </Box> */}
          </Grid>
        </>
      )}
    </Box>
  );
};
