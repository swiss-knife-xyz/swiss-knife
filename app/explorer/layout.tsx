"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
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
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { isAddress } from "viem";
import { normalize } from "viem/ens";
import { publicClient, getPath, slicedText } from "@/utils";
import subdomains from "@/subdomains";
import { Layout } from "@/components/Layout";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const isValidTransaction = (tx: string) => {
  return /^0x([A-Fa-f0-9]{64})$/.test(tx);
};

const ExplorerLayout = ({ children }: { children: ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const userInputFromUrl = segments[1] ?? segments[0];

  const [userInput, setUserInput] = useState<string>(userInputFromUrl);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isInputInvalid, setIsInputInvalid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (_userInput?: string) => {
    setIsLoading(true);

    const __userInput = _userInput ?? userInput;

    if (__userInput) {
      if (isValidTransaction(__userInput)) {
        const newUrl = `${getPath(subdomains.EXPLORER)}tx/${__userInput}`;
        if (newUrl.toLowerCase() !== pathname.toLowerCase()) {
          router.push(newUrl);
        } else {
          // Have a delay so the loading spinner shows up
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }
      } else if (isAddress(__userInput)) {
        const newUrl = `${getPath(subdomains.EXPLORER)}address/${__userInput}`;
        if (newUrl.toLowerCase() !== pathname.toLowerCase()) {
          router.push(newUrl);
        } else {
          // Have a delay so the loading spinner shows up
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }
      } else {
        try {
          const ensResolvedAddress = await publicClient.getEnsAddress({
            name: normalize(__userInput),
          });
          if (ensResolvedAddress) {
            setResolvedAddress(ensResolvedAddress);
            const newUrl = `${getPath(
              subdomains.EXPLORER
            )}address/${ensResolvedAddress}`;
            if (newUrl.toLowerCase() !== pathname.toLowerCase()) {
              router.push(newUrl);
            } else {
              setIsLoading(false);
            }
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

  useEffect(() => {
    if (userInputFromUrl) {
      handleSearch(userInputFromUrl);
    }
  }, []);

  useEffect(() => {
    const url = `${pathname}?${searchParams}`;
    // new url has loaded
    setIsLoading(false);
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

  return (
    <Layout>
      <Center flexDir={"column"} mt="5">
        <Heading fontSize={"4xl"}>
          <Link href={getPath(subdomains.EXPLORER)}>Explorer</Link>
        </Heading>
        <HStack mt="1rem" w="60%">
          <Heading fontSize={"xl"}>Search Address or Transaction</Heading>{" "}
          <Spacer />
        </HStack>
        <InputGroup mt="1rem" maxW="60%">
          <Input
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
        {resolvedAddress && (
          <Box
            mt="2"
            p="2"
            border={"1px solid"}
            borderColor={"whiteAlpha.300"}
            rounded="lg"
          >
            <HStack fontSize={"sm"}>
              <Text>{slicedText(resolvedAddress)}</Text>
              <CopyToClipboard textToCopy={resolvedAddress} />
            </HStack>
          </Box>
        )}
        <Box mt="5">{children}</Box>
      </Center>
    </Layout>
  );
};

export default ExplorerLayout;
