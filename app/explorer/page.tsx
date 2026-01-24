"use client";

import subdomains from "@/subdomains";
import { getPath, slicedText } from "@/utils";
import {
  Stack,
  Box,
  Center,
  Container,
  Heading,
  VStack,
  Text,
  Link,
} from "@chakra-ui/react";
import { useLocalStorage } from "usehooks-ts";
import {
  RecentSearch,
  RECENT_SEARCHES_KEY,
} from "@/app/explorer/ExplorerLayout";

const Card = ({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) => {
  return (
    <Link
      href={url}
      _hover={{
        textDecor: "none",
      }}
    >
      <Box
        flex={1}
        border="1px"
        borderColor="blue.300"
        rounded="1rem"
        cursor={"pointer"}
        _hover={{
          border: "2px",
          borderColor: "blue.500",
          bg: "whiteAlpha.50",
        }}
      >
        <Center py={6} px={6}>
          <VStack>
            <Heading
              as="h2"
              fontWeight="semibold"
              fontSize={"lg"}
              whiteSpace="nowrap" // Prevent word from breaking
              pb="3"
              borderBottom={"1px"}
              borderColor={"whiteAlpha.400"}
            >
              {title}
            </Heading>
            <Text pt="1" textAlign="center" color={"cyan.100"} fontSize={"sm"}>
              ({description})
            </Text>
          </VStack>
        </Center>
      </Box>
    </Link>
  );
};

const RecentSearchCard = ({ search }: { search: RecentSearch }) => {
  const isLongInput = search.input.length > 20;
  const displayTitle = isLongInput ? slicedText(search.input) : search.input;

  const url =
    search.type === "tx"
      ? `${getPath(subdomains.EXPLORER.base)}tx/${search.input}`
      : `${getPath(subdomains.EXPLORER.base)}address/${search.input}`;

  return (
    <Link
      href={url}
      _hover={{
        textDecor: "none",
      }}
    >
      <Box
        flex={1}
        border="1px"
        borderColor="green.400"
        rounded="1rem"
        cursor={"pointer"}
        _hover={{
          border: "2px",
          borderColor: "green.500",
          bg: "whiteAlpha.50",
        }}
      >
        <Center py={4} px={4}>
          <VStack>
            <Heading
              as="h2"
              fontWeight="semibold"
              fontSize={"md"}
              pb="2"
              borderBottom={"1px"}
              borderColor={"whiteAlpha.400"}
              title={search.input}
            >
              {displayTitle}
            </Heading>
            <Text pt="1" textAlign="center" color={"green.200"} fontSize={"sm"}>
              ({search.type})
            </Text>
          </VStack>
        </Center>
      </Box>
    </Link>
  );
};

const Explorer = () => {
  const [recentSearches] = useLocalStorage<RecentSearch[]>(
    RECENT_SEARCHES_KEY,
    []
  );

  return (
    <>
      <Container mt={10} pb={10} alignItems="center">
        {recentSearches.length > 0 && (
          <>
            <Text>Recent searches:</Text>
            <Stack
              mt={2}
              mb={6}
              direction={{ base: "column", md: "row" }}
              alignItems={{ base: "center", md: "stretch" }}
              spacing={5}
              justifyContent="flex-start"
            >
              {recentSearches.map((search, i) => (
                <RecentSearchCard key={search.timestamp} search={search} />
              ))}
            </Stack>
          </>
        )}
        <Text>or try these out:</Text>
        <Stack
          mt={2}
          direction={{ base: "column", md: "row" }}
          alignItems={{ base: "center", md: "stretch" }}
          spacing={5}
          justifyContent="space-between"
        >
          <Card
            title="UniV3 Position Manager"
            description="contract"
            url={`${getPath(
              subdomains.EXPLORER.base
            )}address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88`}
          />
          <Card
            title="Seaport MatchOrders"
            description="tx"
            url={`${getPath(
              subdomains.EXPLORER.base
            )}tx/0x242810fae4b8279dfeb728ccf29b575e792bc575e7c48461495cae3d7846a821`}
          />
        </Stack>
      </Container>
    </>
  );
};

export default Explorer;
