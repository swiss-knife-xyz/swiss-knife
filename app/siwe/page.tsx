"use client";

import { Suspense } from "react";
import { Box, Heading, Text, VStack, Link, HStack, Badge, Divider, Flex, Spacer } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Layout } from "@/components/Layout";
import { ConnectButton } from "@/components/ConnectButton";
import { SiweValidator } from "./components";

// Suspense boundary required because SiweValidator uses useQueryState (which
// calls useSearchParams internally). Without it, Next.js static generation
// fails. This matches the pattern used by other pages in the project
// (e.g., contract-diff, apps, safe/eip-712-hash).
const SiwePage = () => {
  return (
    <Layout>
      <Suspense fallback={<div>Loading...</div>}>
        <Box w="90vw" maxW="1400px" px={{ base: 4, md: 8 }} py={8}>
          <VStack spacing={3} mb={6}>
            <HStack spacing={3}>
              <Heading textAlign="center" size="lg">
                SIWE Message Validator
              </Heading>
              <Badge colorScheme="blue" fontSize="xs" px={2} py={1}>
                EIP-4361
              </Badge>
            </HStack>
            <Text color="whiteAlpha.700" textAlign="center" maxW="2xl" fontSize="sm">
              Validate and debug Sign in with Ethereum messages for EIP-4361 validity.
            </Text>
            <HStack spacing={4} fontSize="sm">
              <Link
                href="https://eip.tools/eip/4361"
                isExternal
                color="blue.400"
                _hover={{ color: "blue.300" }}
              >
                EIP-4361 Spec <ExternalLinkIcon mx="2px" />
              </Link>
              <Link
                href="https://siwe.xyz"
                isExternal
                color="blue.400"
                _hover={{ color: "blue.300" }}
              >
                siwe.xyz <ExternalLinkIcon mx="2px" />
              </Link>
            </HStack>
          </VStack>

          <Divider borderColor="whiteAlpha.300" mb={6} />

          <Flex w="100%" mb="1rem">
            <Spacer />
            <ConnectButton />
          </Flex>

          <SiweValidator />
        </Box>
      </Suspense>
    </Layout>
  );
};

export default SiwePage;

