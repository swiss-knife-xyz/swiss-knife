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
import { Hex, toHex, keccak256 as toKeccak256 } from "viem";
import { FiLock, FiType, FiHash } from "react-icons/fi";
import { InputField } from "@/components/InputField";

const Keccak256 = () => {
  const [userInput, setUserInput] = useState<string>();
  const [keccak256, setKeccak256] = useState<string>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (value.length > 0) {
      const inHex = value.startsWith("0x") ? (value as Hex) : toHex(value);
      setKeccak256(toKeccak256(inHex));
    } else {
      setKeccak256("");
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
    >
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiLock} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Keccak256 Converter
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Convert string or hex to keccack256 and 4 bytes selector.
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
                  <Icon as={FiType} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Input
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  Text/Hex
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Enter text or hex (starting with 0x)"
                value={userInput || ""}
                onChange={handleInputChange}
                autoFocus
              />
            </Box>
          </HStack>

          {/* Keccak256 Hash - Highlighted */}
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
                  <Icon as={FiLock} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Keccak256
                  </Text>
                </HStack>
                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                  64 chars
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Keccak256 hash will appear here"
                value={keccak256 || ""}
                onChange={() => {}}
                isReadOnly
                cursor="text"
              />
            </Box>
          </HStack>

          {/* 4 Bytes */}
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
                    4 Bytes
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  Fn Selector
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="First 4 bytes (function selector)"
                value={keccak256 ? keccak256.slice(0, 10) : ""}
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

export default Keccak256;
