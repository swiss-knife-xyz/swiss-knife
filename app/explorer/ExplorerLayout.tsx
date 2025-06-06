"use client";

import {
  usePathname,
  useSearchParams,
  useSelectedLayoutSegments,
} from "next/navigation";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import NLink from "next/link";
import { ReactNode, useState, useEffect } from "react";
import {
  Center,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Box,
  HStack,
  Spacer,
  Text,
  useDisclosure,
  Avatar,
  Link,
  Tag,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@chakra-ui/react";
import {
  ExternalLinkIcon,
  SearchIcon,
  ChevronRightIcon,
} from "@chakra-ui/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook } from "@fortawesome/free-solid-svg-icons";
import { isAddress } from "viem";
import {
  getPath,
  slicedText,
  getEnsAddress,
  getEnsAvatar,
  getEnsName,
} from "@/utils";
import subdomains from "@/subdomains";
import { Layout } from "@/components/Layout";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { AddressBook } from "@/components/AddressBook";
import axios from "axios";
import { Sidebar, SidebarItem } from "@/components/Sidebar";

const isValidTransaction = (tx: string) => {
  return /^0x([A-Fa-f0-9]{64})$/.test(tx);
};

export const ExplorerLayout = ({ children }: { children: ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const router = useTopLoaderRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const userInputFromUrl = segments[1] ?? segments[0];

  const [userInput, setUserInput] = useState<string>(userInputFromUrl);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedEnsName, setResolvedEnsName] = useState<string | null>(null);
  const [resolvedEnsAvatar, setResolvedEnsAvatar] = useState<string | null>(
    null
  );
  const [isInputInvalid, setIsInputInvalid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addressLabels, setAddressLabels] = useState<string[]>([]);

  const {
    isOpen: isAddressBookOpen,
    onOpen: openAddressBook,
    onClose: closeAddressBook,
  } = useDisclosure();

  const handleSearch = async (_userInput?: string) => {
    setIsLoading(true);
    setResolvedEnsName(null);
    setResolvedEnsAvatar(null);

    const __userInput = _userInput ?? userInput;

    if (__userInput) {
      if (isValidTransaction(__userInput)) {
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
          )}contract/${__userInput}/${segments[2]}`;
        }
        if (newUrl.toLowerCase() !== pathname.toLowerCase()) {
          router.push(newUrl);
        } else {
          // Have a delay so the loading spinner shows up
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }

        getEnsName(__userInput).then((res) => {
          if (res) {
            setResolvedEnsName(res);
          } else {
            setResolvedEnsName(null);
          }
        });
      } else {
        try {
          const ensResolvedAddress = await getEnsAddress(__userInput);
          if (ensResolvedAddress) {
            setResolvedAddress(ensResolvedAddress);
            const newUrl = `${getPath(
              subdomains.EXPLORER.base,
              subdomains.EXPLORER.isRelativePath
            )}address/${ensResolvedAddress}${
              pathname.includes("/contract") ? `/contract/${segments[2]}` : ""
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
      const res = await axios.get(
        `${
          process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
            ? ""
            : "https://swiss-knife.xyz"
        }/api/labels/${userInput}`
      );
      const data = res.data;
      if (data.length > 0) {
        setAddressLabels(data);
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
      getEnsAvatar(resolvedEnsName).then((res) => {
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
        <Center flexDir={"column"} mt="5">
          <Breadcrumb
            separator={<ChevronRightIcon color="gray.400" fontSize="sm" />}
            fontSize="sm"
            ml={6}
          >
            <BreadcrumbItem>
              <BreadcrumbLink
                as={NLink}
                href={getPath(
                  subdomains.EXPLORER.base,
                  subdomains.EXPLORER.isRelativePath
                )}
              >
                Explorer
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <Heading fontSize={"4xl"}>
            <NLink
              href={getPath(
                subdomains.EXPLORER.base,
                subdomains.EXPLORER.isRelativePath
              )}
            >
              Explorer
            </NLink>
          </Heading>
          <HStack mt="1rem" w="60%">
            <Heading fontSize={"xl"}>Search Address or Transaction</Heading>{" "}
            <Spacer />
          </HStack>
          <HStack mt="1rem">
            <InputGroup w="30rem">
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
              />
              <InputRightElement w="4rem">
                <Button
                  mr="0.5rem"
                  w="100%"
                  size="sm"
                  colorScheme={isInputInvalid ? "red" : "blue"}
                  onClick={() => handleSearch()}
                  isLoading={isLoading}
                >
                  <SearchIcon />
                </Button>
              </InputRightElement>
            </InputGroup>
            {userInput &&
              (pathname.includes("/address/") || pathname.includes("/tx/")) && (
                <Link
                  href={`https://etherscan.io/${
                    pathname.includes("/address/") ? "address" : "tx"
                  }/${userInput}`}
                  title="View on Etherscan"
                  isExternal
                >
                  <Button size={"sm"}>
                    <HStack>
                      <ExternalLinkIcon />
                    </HStack>
                  </Button>
                </Link>
              )}
            {pathname.includes("/address/") && (
              <>
                <Button onClick={openAddressBook}>
                  <FontAwesomeIcon icon={faBook} />
                </Button>
                <AddressBook
                  isAddressBookOpen={isAddressBookOpen}
                  closeAddressBook={closeAddressBook}
                  showAddress={userInput}
                  setAddress={setUserInput}
                  handleSearch={handleSearch}
                />
              </>
            )}
          </HStack>
          {resolvedAddress || resolvedEnsName ? (
            <Box
              mt="2"
              p="2"
              border={"1px solid"}
              borderColor={"whiteAlpha.300"}
              rounded="lg"
            >
              <HStack fontSize={"sm"}>
                {resolvedEnsAvatar ? (
                  <Avatar src={resolvedEnsAvatar} w={"2rem"} h={"2rem"} />
                ) : null}
                <Text>
                  {resolvedAddress
                    ? slicedText(resolvedAddress)
                    : resolvedEnsName}
                </Text>
                {resolvedAddress ? (
                  <CopyToClipboard textToCopy={resolvedAddress} />
                ) : (
                  resolvedEnsName && (
                    <CopyToClipboard textToCopy={resolvedEnsName} />
                  )
                )}
              </HStack>
            </Box>
          ) : null}
          {addressLabels.length > 0 && (
            <HStack
              mt="2"
              p="2"
              border={"1px solid"}
              borderColor={"whiteAlpha.300"}
              rounded="lg"
            >
              <Text fontSize={"sm"}>Tags: </Text>
              {addressLabels.map((label, index) => (
                <Tag key={index} size="sm" variant="solid" colorScheme="blue">
                  {label}
                </Tag>
              ))}
            </HStack>
          )}
          <Box mt="5">{children}</Box>
        </Center>
      </HStack>
    </Layout>
  );
};
