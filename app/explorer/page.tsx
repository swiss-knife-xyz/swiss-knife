"use client";

import NextLink from "next/link";
import subdomains from "@/subdomains";
import { getPath, slicedText } from "@/utils";
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Link,
  Icon,
  SimpleGrid,
} from "@chakra-ui/react";
import { useLocalStorage } from "usehooks-ts";
import { FiClock, FiFileText, FiCode, FiArrowRight } from "react-icons/fi";
import {
  RecentSearch,
  RECENT_SEARCHES_KEY,
} from "@/app/explorer/ExplorerLayout";

const examples = [
  {
    title: "UniV3 Position Manager",
    kind: "Contract",
    icon: FiCode,
    path: "address/0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  {
    title: "Seaport MatchOrders",
    kind: "Transaction",
    icon: FiFileText,
    path: "tx/0x242810fae4b8279dfeb728ccf29b575e792bc575e7c48461495cae3d7846a821",
  },
];

const Explorer = () => {
  const [recentSearches] = useLocalStorage<RecentSearch[]>(
    RECENT_SEARCHES_KEY,
    [],
    { initializeWithValue: false }
  );

  return (
    <VStack spacing={7} align="stretch" w="full" minW={0}>
      {recentSearches.length > 0 && (
        <Box as="section" aria-labelledby="recent-searches-heading" minW={0}>
          <Heading id="recent-searches-heading" as="h2" fontSize="sm" fontWeight="medium" color="text.secondary" mb={2}>
            Recent searches
          </Heading>
          <VStack spacing={0} align="stretch">
            {recentSearches.map((search) => (
              <Link
                as={NextLink}
                key={`${search.type}:${search.input}`}
                href={`${getPath(subdomains.EXPLORER.base)}${search.type === "tx" ? "tx" : "address"}/${search.input}`}
                title={search.input}
                display="block"
                minW={0}
                px={2}
                py={3}
                rounded="md"
                _hover={{ bg: "bg.subtle", textDecoration: "none" }}
                _focusVisible={{ outline: "2px solid", outlineColor: "primary.400" }}
              >
                <HStack spacing={3} minW={0}>
                  <Icon as={FiClock} boxSize={4} color="text.tertiary" flexShrink={0} />
                  <Text fontSize="sm" fontFamily="mono" color="text.primary" flex={1} minW={0} isTruncated>
                    {search.input.length > 20 ? slicedText(search.input) : search.input}
                  </Text>
                  <Text fontSize="xs" color="text.secondary" flexShrink={0}>
                    {search.type === "tx" ? "Transaction" : "Address"}
                  </Text>
                  <Icon as={FiArrowRight} boxSize={4} color="text.tertiary" flexShrink={0} />
                </HStack>
              </Link>
            ))}
          </VStack>
        </Box>
      )}

      <Box as="section" aria-labelledby="explorer-examples-heading" minW={0}>
        <Heading id="explorer-examples-heading" as="h2" fontSize="sm" fontWeight="medium" color="text.secondary" mb={3}>
          Examples
        </Heading>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          {examples.map((example) => (
            <Link
              as={NextLink}
              key={example.path}
              href={`${getPath(subdomains.EXPLORER.base)}${example.path}`}
              minW={0}
              p={3}
              rounded="md"
              bg="bg.subtle"
              border="1px solid"
              borderColor="border.default"
              _hover={{ bg: "bg.muted", borderColor: "border.strong", textDecoration: "none" }}
              _focusVisible={{ outline: "2px solid", outlineColor: "primary.400" }}
            >
              <HStack spacing={3} minW={0}>
                <Icon as={example.icon} boxSize={4} color="text.secondary" flexShrink={0} />
                <Box flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" color="text.primary">
                    {example.title}
                  </Text>
                  <Text fontSize="xs" color="text.secondary" mt={1}>{example.kind}</Text>
                </Box>
                <Icon as={FiArrowRight} boxSize={4} color="text.tertiary" flexShrink={0} />
              </HStack>
            </Link>
          ))}
        </SimpleGrid>
      </Box>
    </VStack>
  );
};

export default Explorer;
