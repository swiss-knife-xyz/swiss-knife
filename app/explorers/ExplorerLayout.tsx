"use client";

import { parseChainPrefixedAddress } from "@/lib/contractExplorerInput";

import { ToolLoading } from "@/components/ToolLoading";

import {
  usePathname,
  useSearchParams,
  useSelectedLayoutSegments,
} from "next/navigation";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import NLink from "next/link";
import { ReactNode, Suspense, useState, useEffect } from "react";
import {
  Center,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Box,
  HStack,
  VStack,
  Text,
  Avatar,
  Tag,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { FiExternalLink, FiBook } from "react-icons/fi";
import { isAddress } from "viem";
import { useLocalStorage } from "usehooks-ts";
import {
  getPath,
  slicedText,
  resolveNameToAddress,
  getNameAvatar,
  resolveAddressToName,
} from "@/utils";
import subdomains from "@/subdomains";
import { Layout } from "@/components/Layout";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { fetchAddressLabels } from "@/utils/addressLabels";
import { useAddressBook } from "@/hooks/useAddressBook";

export interface RecentSearch {
  input: string;
  type: "address" | "tx";
  timestamp: number;
}

export const RECENT_SEARCHES_KEY = "explorer-recent-searches";
const MAX_RECENT_SEARCHES = 3;

const isValidTransaction = (tx: string) => {
  return /^0x([A-Fa-f0-9]{64})$/.test(tx);
};

function ExplorerLayoutContent({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const isExplorerHome = segments.length === 0;
  const router = useTopLoaderRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const userInputFromUrl = segments[1] ?? segments[0];

  const [userInput, setUserInput] = useState<string>(userInputFromUrl ?? "");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedEnsName, setResolvedEnsName] = useState<string | null>(null);
  const [resolvedEnsAvatar, setResolvedEnsAvatar] = useState<string | null>(
    null
  );
  const [isInputInvalid, setIsInputInvalid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addressLabels, setAddressLabels] = useState<string[]>([]);

  const [recentSearches, setRecentSearches] = useLocalStorage<RecentSearch[]>(
    RECENT_SEARCHES_KEY,
    []
  );

  const { openSelector, getLabel, isReady: isAddressBookReady } = useAddressBook();
  const addressBookLabel = isAddressBookReady && userInput ? getLabel(userInput) : null;

  const addRecentSearch = (input: string, type: "address" | "tx") => {
    const newSearch: RecentSearch = {
      input,
      type,
      timestamp: Date.now(),
    };

    setRecentSearches((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        (s) => s.input.toLowerCase() !== input.toLowerCase()
      );
      // Add new search at the beginning and keep only MAX_RECENT_SEARCHES
      return [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
  };

  // Preserve directory filters when resolving a bookmarked ENS/raw-address search.
  const navigateToSearch = (url: string, chainId?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (chainId !== undefined) params.set("chainId", String(chainId));
    const query = params.toString();
    router.push(`${url}${query ? `?${query}` : ""}`);
  };

  const handleSearch = async (_userInput?: string) => {
    setIsLoading(true);
    setResolvedEnsName(null);
    setResolvedEnsAvatar(null);

    const rawInput = (_userInput ?? userInput).trim();
    const prefixed = parseChainPrefixedAddress(rawInput);
    const __userInput = prefixed?.address ?? rawInput;
    if (prefixed) setUserInput(prefixed.address);

    if (__userInput) {
      if (isValidTransaction(__userInput)) {
        addRecentSearch(__userInput, "tx");
        const newUrl = `${getPath(
          subdomains.EXPLORER.base,
          subdomains.EXPLORER.isRelativePath
        )}tx/${__userInput}`;
        if (new URL(newUrl, "https://eth.sh").pathname.toLowerCase() !== pathname.toLowerCase()) {
          navigateToSearch(newUrl);
        } else {
          // Have a delay so the loading spinner shows up
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }
      } else if (isAddress(__userInput)) {
        addRecentSearch(__userInput, "address");
        const newUrl = `${getPath(subdomains.EXPLORER.base, subdomains.EXPLORER.isRelativePath)}address/${__userInput}`;
        if (prefixed || new URL(newUrl, "https://eth.sh").pathname.toLowerCase() !== pathname.toLowerCase()) {
          navigateToSearch(newUrl, prefixed?.chainId);
        } else {
          // Have a delay so the loading spinner shows up
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }

        resolveAddressToName(__userInput).then((res) => {
          if (res) {
            setResolvedEnsName(res);
          } else {
            setResolvedEnsName(null);
          }
        });
      } else {
        try {
          const ensResolvedAddress = await resolveNameToAddress(__userInput);
          if (ensResolvedAddress) {
            // Save the ENS name as the search input for better UX
            addRecentSearch(__userInput, "address");
            setResolvedAddress(ensResolvedAddress);
            const newUrl = `${getPath(
              subdomains.EXPLORER.base,
              subdomains.EXPLORER.isRelativePath
            )}address/${ensResolvedAddress}`;
            if (new URL(newUrl, "https://eth.sh").pathname.toLowerCase() !== pathname.toLowerCase()) {
              navigateToSearch(newUrl);
            } else {
              setIsLoading(false);
            }

            setResolvedEnsName(__userInput);
          } else {
            setIsInputInvalid(true);
            setIsLoading(false);
          }
        } catch (e) {
          setIsInputInvalid(true);
          setIsLoading(false);
        }
      }
    }
  };

  const fetchSetAddressLabel = async () => {
    try {
      const labels = await fetchAddressLabels(userInput);
      if (labels.length > 0) {
        setAddressLabels(labels);
      } else {
        setAddressLabels([]);
      }
    } catch {
      setAddressLabels([]);
    }
  };

  useEffect(() => {
    if (userInputFromUrl) {
      handleSearch(userInputFromUrl);
    }
  }, []);

  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    // new url has loaded
    setIsLoading(false);

    if (pathname.includes("/address/")) {
      fetchSetAddressLabel();
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isInputInvalid) {
      setIsLoading(false);
    }
  }, [isInputInvalid]);

  useEffect(() => {
    if (resolvedAddress) {
      setResolvedAddress("");
    }
  }, [userInput]);

  useEffect(() => {
    if (resolvedEnsName) {
      getNameAvatar(resolvedEnsName).then((res) => {
        if (res) {
          setResolvedEnsAvatar(res);
        } else {
          setResolvedEnsAvatar(null);
        }
      });
    }
  }, [resolvedEnsName]);


  return (
    <Layout minW={0} allowSticky>
      <Box w="full">
        <Center flexDir="column" w="full" minW={0} py={{ base: 0, md: 4 }}>
          <Box
            w="full"
            maxW={isExplorerHome ? "760px" : "1400px"}
            mx="auto"
            p={{ base: 0, md: 4 }}
            minW={0}
          >
            <Box
              display="grid"
              gridTemplateColumns={{ base: "minmax(0, 1fr)", md: "minmax(0, 1fr) auto" }}
              columnGap={4}
              rowGap={3}
              alignItems="center"
            >
              <Box gridRow={1} gridColumn={isExplorerHome ? "1 / -1" : 1} minW={0}>
              <HStack spacing={2} minW={0}>
                <Heading as="h1" fontSize={{ base: "xl", md: "2xl" }} fontWeight="semibold">
                  <NLink href={getPath(subdomains.EXPLORER.base, subdomains.EXPLORER.isRelativePath)}>
                    Explorer Directory
                  </NLink>
                </Heading>
                <Tooltip label="Select from address book" hasArrow>
                  <IconButton
                    aria-label="Select from address book"
                    icon={<FiBook size={16} />}
                    variant="ghost" size="sm" color="text.secondary"
                    onClick={() => openSelector(
                      address => { setUserInput(address); handleSearch(address); },
                      pathname.includes("/address/") ? resolvedAddress || userInput : ""
                    )}
                  />
                </Tooltip>
              </HStack>
              {isExplorerHome && (
                <Text mt={2} fontSize="sm" color="text.secondary">
                  View any address or transaction across block explorers and dashboards.
                </Text>
              )}
              </Box>

                {userInput && pathname.includes("/address/") && (
                  <HStack
                    gridRow={{ base: 3, md: 1 }}
                    gridColumn={{ base: 1, md: 2 }}
                    w={{ base: "full", md: "auto" }}
                    maxW={{ md: "32rem" }} minW={0} spacing={2}
                    justify="space-between"
                  >
                    {pathname.includes("/address/") && <HStack spacing={2} minW={0} flex={1}>
                      {resolvedEnsAvatar && <Avatar src={resolvedEnsAvatar} boxSize={6} flexShrink={0} />}
                      <Tooltip label={resolvedAddress || resolvedEnsName || userInput} hasArrow>
                        <Text fontSize="sm" color="text.secondary" minW={0} isTruncated>
                          {addressBookLabel || resolvedEnsName || slicedText(resolvedAddress || userInput)}
                        </Text>
                      </Tooltip>
                      <CopyToClipboard
                        textToCopy={resolvedAddress || resolvedEnsName || userInput}
                        aria-label="Copy search value"
                        minW={8} w={8} h={8} px={0} flexShrink={0}
                      />
                    </HStack>}

                  </HStack>
                )}


            {/* Search Section */}
            <Box w="full" gridRow={2} gridColumn="1 / -1">
              <VStack spacing={3} align="stretch">
                <HStack w="full" spacing={0} gap={2} justify="flex-end">
                  <InputGroup flex={1} minW={0}>
                    <Input
                      placeholder="address / ens / transaction"
                      name="explorer-lookup"
                      aria-label="Blockchain address, ENS name, or transaction hash"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-1p-ignore
                      data-lpignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      value={userInput}
                      onChange={(e) => {
                        setUserInput(e.target.value);
                        if (isInputInvalid) {
                          setIsInputInvalid(false);
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        setIsLoading(true);
                        const pastedData = e.clipboardData.getData("Text");
                        setUserInput(pastedData);
                        setResolvedEnsName(null);
                        setResolvedEnsAvatar(null);
                        handleSearch(pastedData);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch();
                        }
                      }}
                      isInvalid={isInputInvalid}
                      bg="whiteAlpha.50"
                      border="1px solid"
                      borderColor={isInputInvalid ? "red.400" : "whiteAlpha.200"}
                      _hover={{
                        borderColor: isInputInvalid ? "red.300" : "whiteAlpha.300",
                      }}
                      _focus={{
                        borderColor: isInputInvalid ? "red.400" : "blue.400",
                        boxShadow: isInputInvalid
                          ? "0 0 0 1px var(--chakra-colors-red-400)"
                          : "0 0 0 1px var(--chakra-colors-blue-400)",
                      }}
                      color="gray.100"
                      _placeholder={{ color: "gray.500" }}
                      fontSize="md"
                      fontFamily="mono"
                      h="44px"
                      py={0}
                      pr={12}
                    />
                    <InputRightElement h="full" w="44px">
                      <Button
                        h={8}
                        w={9}
                        minW={9}
                        p={0}
                        variant="ghost"
                        borderWidth={0}
                        color={isInputInvalid ? "red.400" : "text.secondary"}
                        aria-label="Search address or transaction"
                        onClick={() => handleSearch()}
                        isLoading={isLoading}
                      >
                        <SearchIcon />
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                  {userInput && (pathname.includes("/address/") || pathname.includes("/tx/")) && (
                    <Tooltip label="View on Etherscan" hasArrow>
                      <IconButton
                        as="a"
                        href={`https://etherscan.io/${pathname.includes("/address/") ? "address" : "tx"}/${userInput}`}
                        target="_blank" rel="noopener noreferrer"
                        aria-label="View on Etherscan"
                        icon={<FiExternalLink size={16} />}
                        variant="ghost" color="text.secondary"
                        boxSize="44px" minW="44px" flexShrink={0}
                      />
                    </Tooltip>
                  )}
                </HStack>
              </VStack>
            </Box>

                {pathname.includes("/address/") && addressLabels.length > 0 && (
                  <HStack gridRow={{ base: 4, md: 3 }} gridColumn="1 / -1" spacing={0} gap={2} flexWrap="wrap">
                    {addressLabels.map((label, index) => (
                      <Tag key={index} size="sm" variant="subtle" colorScheme="gray">{label}</Tag>
                    ))}
                  </HStack>
                )}

            </Box>

            {/* Content Area */}
            <Box mt={isExplorerHome ? 7 : 5} pt={isExplorerHome ? 0 : 4} borderTop={isExplorerHome ? undefined : "1px solid"} borderColor="border.subtle">{children}</Box>
          </Box>
        </Center>
      </Box>


    </Layout>
  );
}

export const ExplorerLayout = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={<ToolLoading title="Explorer Directory" description="Search addresses and transactions across EVM block explorers." />}>
      <ExplorerLayoutContent>{children}</ExplorerLayoutContent>
    </Suspense>
  );
};
