"use client";

import { Box, Heading, Text, VStack, Link, HStack, Badge, Divider } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Layout } from "@/components/Layout";
import { SiweValidator } from "./components";

const SiwePage = () => {
  return (
    <Layout>
      {/* Fixed width wrapper to prevent layout shifts from minW="max-content" in Layout */}
      <Box w="90vw" maxW="1400px" px={{ base: 4, md: 8 }} py={8}>
        {/* Header */}
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
              href="https://eips.ethereum.org/EIPS/eip-4361"
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

        {/* Main Validator Component */}
        <SiweValidator />
      </Box>
    </Layout>
  );
};

export default SiwePage;

