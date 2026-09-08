"use client";

import { useState } from "react";
import {
  Heading,
  Text,
  Input,
  Box,
  VStack,
  HStack,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { checksumAddress, Hex } from "viem";
import { FiCheckCircle, FiType, FiHash } from "react-icons/fi";
import { InputField } from "@/components/InputField";

const AddressChecksum = () => {
  const [userInput, setUserInput] = useState<string>();
  const [checksummed, setChecksummed] = useState<string>();
  const [lowercased, setLowercased] = useState<string>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (value.length > 0) {
      try {
        setChecksummed(checksumAddress(value as Hex));
        setLowercased(value.toLowerCase());
      } catch (error) {
        setChecksummed("");
        setLowercased("");
      }
    } else {
      setChecksummed("");
      setLowercased("");
    }
  };

  return (
    <Box
      p={6}
      bg="rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(5px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.50"
      maxW="1400px"
      mx="auto"
      minW="45rem"
    >
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiCheckCircle} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Address Checksum
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="40rem" mx="auto">
          Convert Ethereum address from lowercase to checksum
        </Text>
      </Box>

      {/* Simple Input List */}
      <Box w="full" maxW="800px" mx="auto">
        <VStack spacing={4} align="stretch">
          {/* Input */}
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Box minW="120px">
              <VStack spacing={1} align="start">
                <HStack spacing={2}>
                  <Icon as={FiHash} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Input
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  Address
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Enter Ethereum address (0x...)"
                value={userInput || ""}
                onChange={handleInputChange}
                autoComplete="one-time-code"
                data-1p-ignore
                autoFocus
              />
            </Box>
          </HStack>

          {/* Checksum Address - Highlighted */}
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.100"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Box minW="120px">
              <VStack spacing={1} align="start">
                <HStack spacing={2}>
                  <Icon as={FiCheckCircle} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Checksum
                  </Text>
                </HStack>
                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                  EIP-55
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Checksum address will appear here"
                value={checksummed || ""}
                onChange={() => {}}
                isReadOnly
                cursor="text"
              />
            </Box>
          </HStack>

          {/* Lowercase Address */}
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Box minW="120px">
              <VStack spacing={1} align="start">
                <HStack spacing={2}>
                  <Icon as={FiType} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Lowercase
                  </Text>
                </HStack>
                <Badge colorScheme="red" fontSize="xs" px={2} py={0.5}>
                  No Checksum
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Lowercase address will appear here"
                value={lowercased || ""}
                onChange={() => {}}
                isReadOnly
                cursor="text"
              />
            </Box>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
};

export default AddressChecksum;
