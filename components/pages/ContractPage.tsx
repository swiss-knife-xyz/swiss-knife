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
  Alert,
  AlertIcon,
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
import { ConnectButton } from "@/components/ConnectButton";
import { ReadWriteFunction } from "@/components/fnParams/ReadWriteFunction";
import { slicedText } from "@/utils";

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

const ReadWriteSection = ({
  type,
  abi,
  client,
  functions,
  address,
  chainId,
  isWhatsAbiDecoded,
}: {
  type: "read" | "write";
  abi: AbiType;
  client: PublicClient | null;
  functions: JsonFragment[];
  address: string;
  chainId: number;
  isWhatsAbiDecoded?: boolean;
}) => {
  const stickyHeaderRef = useRef<HTMLDivElement>(null);

  const [allCollapsed, setAllCollapsed] = useState<boolean>(false);
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
            {!isWhatsAbiDecoded ? (
              <>{type === "read" ? "Read" : "Write"} Contract</>
            ) : (
              "Functions"
            )}
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
        {client &&
          functions?.map((func, index) => (
            <Box key={index} ref={(el) => (functionRefs.current[index] = el)}>
              {type === "read" ? (
                <ReadWriteFunction
                  key={index}
                  client={client}
                  index={index}
                  type={"read"}
                  func={getFunc(func, index)}
                  address={address}
                  chainId={chainId}
                  isWhatsAbiDecoded={isWhatsAbiDecoded || false}
                  readAllCollapsed={allCollapsed}
                />
              ) : (
                <ReadWriteFunction
                  key={index}
                  client={client}
                  index={index}
                  type={"write"}
                  func={getFunc(func, index)}
                  address={address}
                  chainId={chainId}
                  isWhatsAbiDecoded={isWhatsAbiDecoded || false}
                  readAllCollapsed={allCollapsed}
                />
              )}
            </Box>
          ))}
      </Box>
    </Box>
  );
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

  const [abi, setAbi] = useState<AbiType | null>(null);
  const [isWhatsAbiDecoded, setIsWhatsAbiDecoded] = useState<boolean>(false);
  const [isFetchingAbi, setIsFetchingAbi] = useState<boolean>(false);
  const [unableToFetchAbi, setUnableToFetchAbi] = useState<boolean>(false);

  const [readFunctions, setReadFunctions] = useState<JsonFragment[]>([]);
  const [writeFunctions, setWriteFunctions] = useState<JsonFragment[]>([]);

  const fetchSetAbi = useCallback(async () => {
    try {
      setIsFetchingAbi(true);
      setUnableToFetchAbi(false);
      // try fetching if contract is verified
      const fetchedAbi = await fetchContractAbi({ address, chainId });
      console.log(fetchedAbi);
      setAbi({
        abi: fetchedAbi.abi as JsonFragment[],
        name: fetchedAbi.name,
      });
      setIsWhatsAbiDecoded(false);
    } catch (e) {
      try {
        // try to determine abi using whatsabi
        const client = createPublicClient({
          chain: chainIdToChain[chainId],
          transport: http(),
        });
        const result = await whatsabi.autoload(address, { provider: client });
        console.log({ whatsabi: result });
        setIsWhatsAbiDecoded(true);
        // sort functions names alphabetically
        setAbi({
          abi: result.abi
            .filter((fragment) => fragment.type === "function")
            .map((fragment) => ({
              ...fragment,
              name: fragment.name ?? `selector: ${fragment.selector}`,
            }))
            .sort((a, b) => {
              const nameA = a.name.toLowerCase();
              const nameB = b.name.toLowerCase();

              const isSelectorA = nameA.startsWith("selector: ");
              const isSelectorB = nameB.startsWith("selector: ");

              if (isSelectorA && !isSelectorB) return 1;
              if (!isSelectorA && isSelectorB) return -1;
              return nameA.localeCompare(nameB);
            }) as JsonFragment[],
          name: slicedText(address),
        });
      } catch {
        setUnableToFetchAbi(true);
        console.log("Failed to fetch abi");
      }
    } finally {
      setIsFetchingAbi(false);
    }
  }, [address, chainId]);

  // Set chainId and client when network option changes
  useEffect(() => {
    if (selectedNetworkOption) {
      const newChainId = parseInt(selectedNetworkOption.value.toString());
      setChainId(newChainId);
      setClient(
        createPublicClient({
          chain: chainIdToChain[newChainId],
          transport: http(),
        })
      );
    }
  }, [selectedNetworkOption, setChainId]);

  // Fetch ABI when address or chainId changes
  useEffect(() => {
    fetchSetAbi();
  }, [address, chainId, fetchSetAbi]);

  // Set functions from abi
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
  }, [abi, address]);

  const renderFunctions = () => {
    return (
      abi && (
        <Box mt="1rem">
          {isWhatsAbiDecoded && (
            <Alert status="info" mb={"1rem"} rounded={"lg"}>
              <AlertIcon />
              Contract not verified, used whatsabi to determine functions
              (choose &quot;Call as View Fn&quot; or &quot;Write&quot; as
              required)
            </Alert>
          )}
          {abi.name.length > 0 && (
            <HStack>
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
              <Spacer />
              <ConnectButton />
            </HStack>
          )}
          {!isWhatsAbiDecoded ? (
            <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={5}>
              <ReadWriteSection
                type="read"
                abi={abi}
                client={client}
                functions={readFunctions}
                address={address}
                chainId={chainId}
              />
              <ReadWriteSection
                type="write"
                abi={abi}
                client={client}
                functions={writeFunctions}
                address={address}
                chainId={chainId}
              />
            </Grid>
          ) : (
            <Box px={"10rem"}>
              <ReadWriteSection
                type="write"
                abi={abi}
                client={client}
                functions={writeFunctions}
                address={address}
                chainId={chainId}
                isWhatsAbiDecoded={isWhatsAbiDecoded}
              />
            </Box>
          )}
        </Box>
      )
    );
  };

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
      {renderFunctions()}
    </Box>
  );
};
