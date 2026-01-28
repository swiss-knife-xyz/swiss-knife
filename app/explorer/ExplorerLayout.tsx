"use client";

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
  Link,
  Tag,
  Tooltip,
  Icon,
  IconButton,
} from "@chakra-ui/react";
import {
  ExternalLinkIcon,
  SearchIcon,
  EditIcon,
  AddIcon,
} from "@chakra-ui/icons";
import { FiSearch, FiExternalLink, FiBook } from "react-icons/fi";
import { BookOpen } from "lucide-react";
import { AddressLabelModal } from "@/components/AddressBook";
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
import { Sidebar, SidebarItem } from "@/components/Sidebar";
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
  const router = useTopLoaderRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const userInputFromUrl = segments[0] === "contract" ? segments[2] : (segments[1] ?? segments[0]);

  const [userInput, setUserInput] = useState<string>(userInputFromUrl);
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
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

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

  const handleSearch = async (_userInput?: string) => {
    setIsLoading(true);
    setResolvedEnsName(null);
    setResolvedEnsAvatar(null);

    const __userInput = _userInput ?? userInput;

    if (__userInput) {
      if (isValidTransaction(__userInput)) {
        addRecentSearch(__userInput, "tx");
        const newUrl = `${getPath(
          subdomains.EXPLORER.base,
          subdomains.EXPLORER.isRelativePath
        )}tx/${__userInput}`;
        if (newUrl.toLowerCase() !== pathname.toLowerCase()) {
          router.push(newUrl);
        } else {
          // Have a delay so the loading spinner shows up
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }
      } else if (isAddress(__userInput)) {
        addRecentSearch(__userInput, "address");
        let newUrl: string;

        if (!pathname.includes("/contract")) {
          newUrl = `${getPath(
            subdomains.EXPLORER.base,
            subdomains.EXPLORER.isRelativePath
          )}address/${__userInput}`;
        } else {
          newUrl = `${getPath(
            subdomains.EXPLORER.base,
            subdomains.EXPLORER.isRelativePath
          )}contract/${segments[1]}/${__userInput}`;
        }
        if (newUrl.toLowerCase() !== pathname.toLowerCase()) {
          router.push(newUrl);
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
            )}address/${ensResolvedAddress}${
              pathname.includes("/contract") ? `/contract/${segments[1]}` : ""
            }`;
            if (newUrl.toLowerCase() !== pathname.toLowerCase()) {
              router.push(newUrl);
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

  const SidebarItems: SidebarItem[] = [
    { name: "Explorers", path: `address/${userInputFromUrl}` },
  ];

  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full">
        {(pathname.includes("/address/") ||
          pathname.includes("/contract/")) && (
          <Sidebar
            heading="Explorer"
            items={SidebarItems}
            subdomain={subdomains.EXPLORER.base}
            exactPathMatch
          />
        )}
        <Center flexDir="column" w="full" py={6}>
          <Box
            w="full"
            maxW="1400px"
            mx="auto"
            p={6}
            bg="rgba(0, 0, 0, 0.05)"
            backdropFilter="blur(5px)"
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.50"
          >
            {/* Page Header */}
            <Box mb={8} textAlign="center">
              <HStack justify="center" spacing={3} mb={4}>
                <Icon as={FiSearch} color="blue.400" boxSize={8} />
                <Heading
                  size="xl"
                  color="gray.100"
                  fontWeight="bold"
                  letterSpacing="tight"
                >
                  <NLink
                    href={getPath(
                      subdomains.EXPLORER.base,
                      subdomains.EXPLORER.isRelativePath
                    )}
                  >
                    Explorer
                  </NLink>
                </Heading>
              </HStack>
              <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
                Search Address or Transaction
              </Text>
            </Box>

            {/* Search Section */}
            <Box w="full" maxW="800px" mx="auto">
              <VStack spacing={4}>
                <HStack w="full" spacing={3}>
                  <InputGroup flex={1}>
                    <Input
                      autoFocus
                      placeholder="address / ens / transaction"
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
                      fontSize="lg"
                      py={6}
                      pr="4rem"
                    />
                    <InputRightElement h="full" w="4rem">
                      <Button
                        h="calc(100% - 16px)"
                        w="calc(100% - 8px)"
                        colorScheme={isInputInvalid ? "red" : "blue"}
                        onClick={() => handleSearch()}
                        isLoading={isLoading}
                      >
                        <SearchIcon />
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                  {userInput &&
                    (pathname.includes("/address/") ||
                      pathname.includes("/tx/")) && (
                      <Tooltip label="View on Etherscan" placement="top">
                        <Link
                          href={`https://etherscan.io/${
                            pathname.includes("/address/") ? "address" : "tx"
                          }/${userInput}`}
                          isExternal
                        >
                          <Button
                            colorScheme="gray"
                            variant="outline"
                            borderColor="whiteAlpha.200"
                            _hover={{
                              bg: "whiteAlpha.100",
                              borderColor: "whiteAlpha.300",
                            }}
                          >
                            <Icon as={FiExternalLink} />
                          </Button>
                        </Link>
                      </Tooltip>
                    )}
                  {pathname.includes("/address/") && (
                    <Tooltip label="Select from Address Book" placement="top">
                      <Button
                        onClick={() => openSelector((address) => {
                          setUserInput(address);
                          handleSearch(address);
                        })}
                        colorScheme="gray"
                        variant="outline"
                        borderColor="whiteAlpha.200"
                        _hover={{
                          bg: "whiteAlpha.100",
                          borderColor: "whiteAlpha.300",
                        }}
                      >
                        <Icon as={FiBook} />
                      </Button>
                    </Tooltip>
                  )}
                </HStack>

                {/* Resolved Address/ENS Display */}
                {(resolvedAddress || resolvedEnsName) && (
                  <Box
                    p={3}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    bg="whiteAlpha.50"
                  >
                    <HStack fontSize="sm" spacing={3}>
                      {resolvedEnsAvatar && (
                        <Avatar src={resolvedEnsAvatar} w="2rem" h="2rem" />
                      )}
                      <Tooltip
                        label={resolvedAddress || resolvedEnsName}
                        placement="top"
                      >
                        <Text cursor="default" color="gray.300">
                          {resolvedAddress
                            ? slicedText(resolvedAddress)
                            : resolvedEnsName}
                        </Text>
                      </Tooltip>
                      {resolvedAddress ? (
                        <CopyToClipboard textToCopy={resolvedAddress} />
                      ) : (
                        resolvedEnsName && (
                          <CopyToClipboard textToCopy={resolvedEnsName} />
                        )
                      )}
                    </HStack>
                  </Box>
                )}

                {/* Address Book Label and Tags */}
                {pathname.includes("/address/") && (
                  <HStack
                    p={3}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    bg="whiteAlpha.50"
                    flexWrap="wrap"
                    gap={2}
                  >
                    {addressBookLabel ? (
                      <>
                        <BookOpen size={16} color="gray" />
                        <Tag
                          size="sm"
                          variant="solid"
                          colorScheme="purple"
                        >
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
                      </>
                    ) : (
                      isAddressBookReady && userInput && (
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
                    {addressLabels.length > 0 && (
                      <>
                        <Text fontSize="sm" color="gray.400" ml={addressBookLabel ? 2 : 0}>
                          Tags:
                        </Text>
                        {addressLabels.map((label, index) => (
                          <Tag
                            key={index}
                            size="sm"
                            variant="solid"
                            colorScheme="blue"
                          >
                            {label}
                          </Tag>
                        ))}
                      </>
                    )}
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* Content Area */}
            <Box mt={6}>{children}</Box>
          </Box>
        </Center>
      </HStack>

      {/* Address Label Modal for save/edit */}
      {userInput && (
        <AddressLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          address={userInput}
          existingLabel={addressBookLabel}
          defaultLabel={resolvedEnsName || ""}
        />
      )}
    </Layout>
  );
}

export const ExplorerLayout = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExplorerLayoutContent>{children}</ExplorerLayoutContent>
    </Suspense>
  );
};
