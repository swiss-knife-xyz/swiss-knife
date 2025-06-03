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
  Spacer,
} from "@chakra-ui/react";
import { isHex, pad } from "viem";
import { FiAlignLeft, FiAlignRight, FiHash } from "react-icons/fi";
import { startHexWith0x } from "@/utils";
import { InputField } from "@/components/InputField";

const Padding = () => {
  const [userInput, setUserInput] = useState<string>();
  const [leftPadded, setLeftPadded] = useState<string>();
  const [rightPadded, setRightPadded] = useState<string>();

  const [isHexadecimalInvalid, setIsHexadecimalInvalid] =
    useState<boolean>(false);

  const checkInvalidHex = (value?: string): boolean => {
    value = value ?? "";
    return !isHex(startHexWith0x(value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (value.length > 0) {
      const isInvalid = checkInvalidHex(value);
      if (!isInvalid) {
        const inHex = startHexWith0x(value);
        setLeftPadded(pad(inHex));
        setRightPadded(pad(inHex, { dir: "right" }));
        setIsHexadecimalInvalid(false);
      } else {
        setIsHexadecimalInvalid(true);
        setLeftPadded("");
        setRightPadded("");
      }
    } else {
      setLeftPadded("");
      setRightPadded("");
      setIsHexadecimalInvalid(false);
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
          <Icon as={FiAlignLeft} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Padding
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Left or Right pad any hex value by 32 bytes.
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
            <Box minW="140px">
              <VStack spacing={1} align="start">
                <HStack spacing={2}>
                  <Icon as={FiHash} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Input
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  Hex Value
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Enter hex value (e.g., 0x1a2b3c)"
                value={userInput || ""}
                onChange={handleInputChange}
                isInvalid={isHexadecimalInvalid}
                autoFocus
              />
            </Box>
          </HStack>

          {/* Left Padded - Highlighted */}
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.100"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Box w="140px">
              <VStack spacing={1} align="start">
                <HStack spacing={2}>
                  <Icon as={FiAlignLeft} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Left Padded
                  </Text>
                </HStack>
                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                  32 bytes
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Left padded value will appear here"
                value={leftPadded || ""}
                onChange={() => {}}
                isReadOnly
                cursor="text"
              />
            </Box>
          </HStack>

          {/* Right Padded */}
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Box w="140px">
              <VStack spacing={1} align="start">
                <HStack spacing={2}>
                  <Icon as={FiAlignRight} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Right Padded
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  32 bytes
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Right padded value will appear here"
                value={rightPadded || ""}
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

export default Padding;
