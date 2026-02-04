"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Heading,
  Spinner,
  Center,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
} from "@chakra-ui/react";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import type { ValidationResult, ValidationError } from "@/lib/siwe";
import { IssueCard } from "./IssueCard";

interface ValidationResultsProps {
  result: ValidationResult | null;
  isLoading: boolean;
  onFixIssue?: (issue: ValidationError) => void;
}

export const ValidationResults = ({
  result,
  isLoading,
  onFixIssue,
}: ValidationResultsProps) => {
  if (isLoading) {
    return (
      <Center p={12}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.400" thickness="4px" />
          <Text color="whiteAlpha.700">Validating message...</Text>
        </VStack>
      </Center>
    );
  }

  if (!result) {
    return (
      <Center p={12}>
        <VStack spacing={4}>
          <Box
            p={8}
            borderRadius="xl"
            border="2px dashed"
            borderColor="whiteAlpha.300"
            textAlign="center"
          >
            <Text fontSize="lg" color="whiteAlpha.600" mb={2}>
              Enter a SIWE message to validate
            </Text>
            <Text fontSize="sm" color="whiteAlpha.400">
              Paste your Sign in with Ethereum message in the input area and
              click Validate
            </Text>
          </Box>
        </VStack>
      </Center>
    );
  }

  const totalIssues =
    result.errors.length + result.warnings.length + result.suggestions.length;
  const fixableCount = [
    ...result.errors,
    ...result.warnings,
    ...result.suggestions,
  ].filter((i) => i.fixable).length;

  return (
    <VStack spacing={6} align="stretch">
      {/* Summary Card */}
      <Box
        p={6}
        borderRadius="xl"
        bg={result.isValid ? "green.900" : "red.900"}
        border="1px solid"
        borderColor={result.isValid ? "green.500" : "red.500"}
      >
        <HStack spacing={4}>
          {result.isValid ? (
            <CheckCircleIcon boxSize={10} color="green.300" />
          ) : (
            <WarningIcon boxSize={10} color="red.300" />
          )}
          <Box>
            <Heading size="lg" color="white">
              {result.isValid ? "Valid SIWE Message" : "Invalid SIWE Message"}
            </Heading>
            <Text color="whiteAlpha.800" mt={1}>
              {result.isValid
                ? "This message complies with EIP-4361 specification."
                : `Found ${result.errors.length} error${result.errors.length !== 1 ? "s" : ""} that need to be fixed.`}
            </Text>
          </Box>
        </HStack>
      </Box>

      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Stat
          p={4}
          borderRadius="lg"
          bg="blackAlpha.400"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel color="whiteAlpha.600">Errors</StatLabel>
          <StatNumber color="red.400">{result.errors.length}</StatNumber>
        </Stat>
        <Stat
          p={4}
          borderRadius="lg"
          bg="blackAlpha.400"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel color="whiteAlpha.600">Warnings</StatLabel>
          <StatNumber color="yellow.400">{result.warnings.length}</StatNumber>
        </Stat>
        <Stat
          p={4}
          borderRadius="lg"
          bg="blackAlpha.400"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel color="whiteAlpha.600">Suggestions</StatLabel>
          <StatNumber color="blue.400">{result.suggestions.length}</StatNumber>
        </Stat>
        <Stat
          p={4}
          borderRadius="lg"
          bg="blackAlpha.400"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <StatLabel color="whiteAlpha.600">Fixable</StatLabel>
          <StatNumber color="green.400">{fixableCount}</StatNumber>
        </Stat>
      </SimpleGrid>

      {/* Issues List */}
      {totalIssues > 0 && (
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="md" color="whiteAlpha.900">
              Issues ({totalIssues})
            </Heading>
            {fixableCount > 0 && (
              <Badge colorScheme="green" variant="subtle" fontSize="sm" px={3} py={1}>
                {fixableCount} auto-fixable
              </Badge>
            )}
          </HStack>

          <VStack spacing={3} align="stretch">
            {/* Errors */}
            {result.errors.map((error, index) => (
              <IssueCard
                key={`error-${index}`}
                issue={error}
                onFix={onFixIssue}
              />
            ))}

            {/* Warnings */}
            {result.warnings.map((warning, index) => (
              <IssueCard
                key={`warning-${index}`}
                issue={warning}
                onFix={onFixIssue}
              />
            ))}

            {/* Suggestions */}
            {result.suggestions.map((suggestion, index) => (
              <IssueCard
                key={`suggestion-${index}`}
                issue={suggestion}
                onFix={onFixIssue}
              />
            ))}
          </VStack>
        </Box>
      )}

      {/* Success message when no issues */}
      {totalIssues === 0 && result.isValid && (
        <Center p={8}>
          <VStack spacing={4}>
            <CheckCircleIcon boxSize={16} color="green.400" />
            <Text fontSize="lg" color="whiteAlpha.800" textAlign="center">
              No issues found! Your SIWE message is properly formatted and
              secure.
            </Text>
          </VStack>
        </Center>
      )}
    </VStack>
  );
};

export default ValidationResults;

