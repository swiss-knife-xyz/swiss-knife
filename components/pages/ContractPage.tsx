"use client";

import { useRouter } from "next/navigation";
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
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { parseAsInteger, useQueryState } from "next-usequerystate";
import { JsonFragment } from "ethers";
import { Address, PublicClient, createPublicClient, http } from "viem";
import { whatsabi } from "@shazow/whatsabi";
import { ConnectButton } from "@/components/ConnectButton";
import { ReadWriteFunction } from "@/components/fnParams/ReadWriteFunction";
import { fetchContractAbi, getPath, slicedText, startHexWith0x } from "@/utils";
import { ABIFunction } from "@shazow/whatsabi/lib.types/abi";
import { StorageSlot } from "../fnParams/StorageSlot";
import { RawCalldata } from "../fnParams/RawCalldata";
import subdomains from "@/subdomains";
import { fetchFunctionInterface } from "@/lib/decoder";

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
            <Box key={index} ref={(el) => (functionRefs.current[index] = el)}>
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

const parseEVMoleInputTypes = (argsString: string): EVMParameter[] => {
  // Parse individual types recursively
  const parseType = (input: string, index?: number): EVMParameter => {
    input = input.trim();
    if (!input) throw new Error("Empty input type");

    // Extract array suffix if present
    const arrayMatch = input.match(/(\[\d*\])+$/);
    const arraySuffix = arrayMatch ? arrayMatch[0] : "";
    const baseType = arrayMatch ? input.slice(0, -arraySuffix.length) : input;

    // For tuples, recursively parse components
    if (baseType.startsWith("(") && baseType.endsWith(")")) {
      const inner = baseType.slice(1, -1);
      const components = splitComponents(inner).map((comp, idx) =>
        parseType(comp, arrayMatch ? undefined : idx)
      );

      return {
        type: `tuple${arraySuffix}`,
        ...(index !== undefined && { name: `arg${index}` }),
        components,
      };
    }

    // For basic types
    return {
      type: input,
      ...(index !== undefined && { name: `arg${index}` }),
    };
  };

  // Split tuple components while respecting nesting
  const splitComponents = (input: string): string[] => {
    const components: string[] = [];
    let current = "";
    let parenDepth = 0;
    let bracketDepth = 0;

    for (const char of input) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      else if (char === "[") bracketDepth++;
      else if (char === "]") bracketDepth--;
      else if (char === "," && parenDepth === 0 && bracketDepth === 0) {
        components.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }

    if (current.trim()) {
      components.push(current.trim());
    }

    return components;
  };

  // Start parsing from the top
  const trimmed = argsString.trim();
  if (trimmed === "" || trimmed === "()") return [];

  return [parseType(trimmed)];
};

export const ContractPage = ({
  params: { address, chainId },
}: {
  params: {
    address: string;
    chainId: number;
  };
}) => {
  const router = useRouter();

  const networkOptionsIndex = networkOptions.findIndex(
    (option) => option.value === chainId
  );

  // dynamic imports
  const [evmole, setEvmole] = useState<any>(null);

  useEffect(() => {
    import("evmole").then((module) => {
      setEvmole(module);
    });
  }, []);

  // state
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[networkOptionsIndex]);
  const [client, setClient] = useState<PublicClient | null>(null);

  const [abi, setAbi] = useState<AbiType | null>(null);
  const [isAbiDecoded, setIsAbiDecoded] = useState<boolean>(false);
  const [isFetchingAbi, setIsFetchingAbi] = useState<boolean>(false);
  const [unableToFetchAbi, setUnableToFetchAbi] = useState<boolean>(false);

  const [readFunctions, setReadFunctions] = useState<JsonFragment[]>([]);
  const [writeFunctions, setWriteFunctions] = useState<JsonFragment[]>([]);

  const fetchSetAbi = useCallback(async () => {
    if (!evmole) return;

    try {
      setIsFetchingAbi(true);
      setUnableToFetchAbi(false);

      // try fetching if contract is verified
      const fetchedAbi = await fetchContractAbi({ address, chainId });
      console.log("Verified contract ABI:", fetchedAbi);
      setAbi({
        abi: fetchedAbi.abi as JsonFragment[],
        name: fetchedAbi.name,
      });
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

        // Get function selectors using evmole
        console.log("Attempting evmole decode...");
        const selectors = evmole.functionSelectors(contractCode);
        console.log("Function selectors:", selectors);

        if (!selectors || !Array.isArray(selectors)) {
          throw new Error("Invalid selectors format");
        }

        setIsAbiDecoded(true);

        // Process and sort functions
        const processedAbi = await Promise.all(
          selectors.map(async (selector) => {
            const args = evmole.functionArguments(contractCode, selector);
            const stateMutability = evmole.functionStateMutability(
              contractCode,
              selector,
              0
            );

            console.log({
              selector,
              args,
              stateMutability,
            });

            // Try to fetch function interface
            const functionInterface = await fetchFunctionInterface({
              selector: startHexWith0x(selector),
            });

            let name: string | undefined;
            if (functionInterface) {
              name = functionInterface.split("(")[0].trim();
            }

            return {
              type: "function",
              name: name || `selector: ${startHexWith0x(selector)}`,
              inputs: args ? parseEVMoleInputTypes(args) : [],
              stateMutability,
              selector: startHexWith0x(selector),
            };
          })
        );

        const sortedAbi = processedAbi.sort((a, b) => {
          const nameA = a.name?.toLowerCase();
          const nameB = b.name?.toLowerCase();
          const isSelectorA = nameA?.startsWith("selector: ");
          const isSelectorB = nameB?.startsWith("selector: ");
          if (isSelectorA && !isSelectorB) return 1;
          if (!isSelectorA && isSelectorB) return -1;
          return nameA && nameB ? nameA.localeCompare(nameB) : 0;
        });

        console.log("Processed ABI:", sortedAbi);

        setAbi({
          abi: sortedAbi as JsonFragment[],
          name: slicedText(address),
        });
      } catch (evmoleError) {
        console.error("Error using evmole:", evmoleError);
        setUnableToFetchAbi(true);
      }
    } finally {
      setIsFetchingAbi(false);
    }
  }, [address, chainId, evmole]);

  // Set chainId and client when network option changes
  useEffect(() => {
    if (selectedNetworkOption) {
      const newChainId = parseInt(selectedNetworkOption.value.toString());

      router.push(
        `${getPath(subdomains.EXPLORER.base)}contract/${address}/${newChainId}`
      );

      setClient(
        createPublicClient({
          chain: chainIdToChain[newChainId],
          transport: http(),
        })
      );
    }
  }, [selectedNetworkOption]);

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
              <ConnectButton expectedChainId={chainId} />
            </HStack>
          )}
          <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={5}>
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
