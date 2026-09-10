"use client";

import subdomains from "@/subdomains";
import { getPath, slicedText } from "@/utils";
import {
  Stack,
  Box,
  Center,
  Heading,
  VStack,
  HStack,
  Text,
  Link,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { useLocalStorage } from "usehooks-ts";
import { FiClock, FiFileText, FiCode, FiArrowRight } from "react-icons/fi";
import {
  RecentSearch,
  RECENT_SEARCHES_KEY,
} from "@/app/explorer/ExplorerLayout";

const Card = ({
  title,
  description,
  url,
  icon,
}: {
  title: string;
  description: string;
  url: string;
  icon: React.ElementType;
}) => {
  return (
    <Link
      href={url}
      _hover={{
        textDecor: "none",
      }}
      flex={1}
      maxW={{ base: "full", md: "300px" }}
    >
      <Box
        w="full"
        p={5}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        cursor="pointer"
        bg="whiteAlpha.50"
        _hover={{
          borderColor: "blue.400",
          bg: "whiteAlpha.100",
          transform: "translateY(-2px)",
        }}
        transition="all 0.2s ease"
      >
        <VStack spacing={3} align="center">
          <Icon as={icon} color="blue.400" boxSize={6} />
          <Heading
            as="h2"
            fontWeight="semibold"
            fontSize="md"
            color="gray.100"
            textAlign="center"
          >
            {title}
          </Heading>
          <Badge
            colorScheme="blue"
            fontSize="xs"
            px={2}
            py={0.5}
            borderRadius="md"
          >
            {description}
          </Badge>
        </VStack>
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
      flex={1}
      maxW={{ base: "full", md: "250px" }}
    >
      <Box
        w="full"
        p={4}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        cursor="pointer"
        bg="whiteAlpha.50"
        _hover={{
          borderColor: "green.400",
          bg: "whiteAlpha.100",
          transform: "translateY(-2px)",
        }}
        transition="all 0.2s ease"
      >
        <VStack spacing={2} align="center">
          <HStack spacing={2}>
            <Icon
              as={search.type === "tx" ? FiFileText : FiCode}
              color="green.400"
              boxSize={4}
            />
            <Text
              fontWeight="medium"
              fontSize="sm"
              color="gray.100"
              title={search.input}
            >
              {displayTitle}
            </Text>
          </HStack>
          <Badge
            colorScheme="green"
            fontSize="xs"
            px={2}
            py={0.5}
            borderRadius="md"
          >
            {search.type}
          </Badge>
        </VStack>
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
    <VStack mt={6} spacing={8} w="full" maxW="800px" mx="auto" px={4}>
      {/* Recent Searches Section */}
      {recentSearches.length > 0 && (
        <Box
          w="full"
          p={5}
          bg="whiteAlpha.30"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.100"
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} justify="center">
              <Icon as={FiClock} color="green.400" boxSize={5} />
              <Heading size="sm" color="gray.300">
                Recent Searches
              </Heading>
            </HStack>
            <Stack
              direction={{ base: "column", md: "row" }}
              alignItems="stretch"
              spacing={4}
              justifyContent="center"
            >
              {recentSearches.map((search) => (
                <RecentSearchCard key={search.timestamp} search={search} />
              ))}
            </Stack>
          </VStack>
        </Box>
      )}

      {/* Example Searches Section */}
      <Box
        w="full"
        p={5}
        bg="whiteAlpha.30"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.100"
      >
        <VStack spacing={4} align="stretch">
          <HStack spacing={2} justify="center">
            <Icon as={FiArrowRight} color="blue.400" boxSize={5} />
            <Heading size="sm" color="gray.300">
              Try These Examples
            </Heading>
          </HStack>
          <Stack
            direction={{ base: "column", md: "row" }}
            alignItems="stretch"
            spacing={4}
            justifyContent="center"
          >
            <Card
              title="UniV3 Position Manager"
              description="contract"
              icon={FiCode}
              url={`${getPath(
                subdomains.EXPLORER.base
              )}address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88`}
            />
            <Card
              title="Seaport MatchOrders"
              description="tx"
              icon={FiFileText}
              url={`${getPath(
                subdomains.EXPLORER.base
              )}tx/0x242810fae4b8279dfeb728ccf29b575e792bc575e7c48461495cae3d7846a821`}
            />
          </Stack>
        </VStack>
      </Box>
    </VStack>
  );
};

export default Explorer;
