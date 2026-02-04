"use client";

import { Box, Heading, Text, Center, VStack, Link, HStack, Badge } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Layout } from "@/components/Layout";
import { SiweValidator } from "./components";

const SiwePage = () => {
  return (
    <Layout>
      <Box w="full" px={{ base: 4, md: 8 }} py={8}>
        {/* Header */}
        <VStack spacing={4} mb={8}>
          <HStack spacing={3}>
            <Heading textAlign="center" size="xl">
              SIWE Message Validator
            </Heading>
            <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
              EIP-4361
            </Badge>
          </HStack>
          <Text color="whiteAlpha.700" textAlign="center" maxW="2xl">
            Validate, lint, and debug Sign in with Ethereum (SIWE) messages for
            EIP-4361 compliance, security best practices, and proper formatting.
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

        {/* Main Validator Component */}
        <SiweValidator />
      </Box>
    </Layout>
  );
};

export default SiwePage;

