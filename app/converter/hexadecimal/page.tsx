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
import {
  numberToHex,
  hexToBigInt,
  isHex,
  hexToString,
  stringToHex,
} from "viem";
import bigInt from "big-integer";
import { FiHash, FiType, FiCode } from "react-icons/fi";
import { startHexWith0x } from "@/utils";
import { InputField } from "@/components/InputField";

const Hexadecimal = () => {
  const [hexadecimal, setHexadecimal] = useState<string>();
  const [decimal, setDecimal] = useState<string>();
  const [binary, setBinary] = useState<string>();
  const [text, setText] = useState<string>();

  const [isHexadecimalInvalid, setIsHexadecimalInvalid] =
    useState<boolean>(false);
  const [isBinaryInvalid, setIsBinaryInvalid] = useState<boolean>(false);

  const checkInvalid = (
    unit: "hexadecimal" | "decimal" | "binary" | "text",
    value?: string
  ): boolean => {
    value = value ?? "";

    if (unit === "hexadecimal") {
      return !isHex(startHexWith0x(value));
    } else if (unit === "binary") {
      return /[^01]/.test(value);
    } else {
      // decimal input is of number or text type, so always valid
      return false;
    }
  };

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    unit: "hexadecimal" | "decimal" | "binary" | "text",
    valueToHexadecimal: (value: string) => string
  ) => {
    const value = e.target.value;
    const isInvalid = checkInvalid(unit, value);

    // Directly set the value of the unit that is being changed
    // to handle cases like 0.0000 to not be converted to 0 due to parsing
    // setting what was input by user as it is, and excluding it in the setValues function
    if (unit === "hexadecimal") setHexadecimal(value);
    else if (unit === "decimal") setDecimal(value);
    else if (unit === "binary") setBinary(value);
    else if (unit === "text") setText(value);

    if (isInvalid) {
      if (unit === "hexadecimal") setIsHexadecimalInvalid(true);
      else if (unit === "binary") setIsBinaryInvalid(true);

      return;
    } else {
      if (unit === "hexadecimal") setIsHexadecimalInvalid(false);
      else if (unit === "binary") setIsBinaryInvalid(false);
    }

    if (value.length > 0) {
      const hex = valueToHexadecimal(value);
      setValues(hex, unit);
    } else {
      setHexadecimal("");
      setDecimal("");
      setBinary("");
      setText("");
    }
  };

  const setValues = (
    inHex: string,
    exceptUnit: "hexadecimal" | "decimal" | "binary" | "text"
  ) => {
    setHexadecimal(inHex);

    if (inHex.length > 0) {
      if (exceptUnit !== "decimal")
        setDecimal(hexToBigInt(startHexWith0x(inHex)).toString());
      if (exceptUnit !== "binary")
        setBinary(
          bigInt(inHex.startsWith("0x") ? inHex.slice(2) : inHex, 16).toString(
            2
          )
        );
      if (exceptUnit !== "text") setText(hexToString(startHexWith0x(inHex)));
    } else {
      setDecimal("");
      setBinary("");
      setText("");
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
          <Icon as={FiHash} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Hexadecimal Converter
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Convert between hexadecimal, decimal, binary, and text formats
        </Text>
      </Box>

      {/* Simple Input List */}
      <Box w="full" maxW="800px" mx="auto">
        <VStack spacing={4} align="stretch">
          {/* Hexadecimal */}
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
                    Hexadecimal
                  </Text>
                </HStack>
                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                  Base 16
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Enter hex value (e.g., 0x1a2b3c)"
                value={hexadecimal || ""}
                onChange={(e) =>
                  handleOnChange(e, "hexadecimal", (value) => value)
                }
                isInvalid={isHexadecimalInvalid}
                autoFocus
              />
            </Box>
          </HStack>

          {/* Decimal */}
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
                    Decimal
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  Base 10
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                type="number"
                placeholder="Enter decimal number"
                value={decimal || ""}
                onChange={(e) =>
                  handleOnChange(e, "decimal", (value) =>
                    numberToHex(BigInt(value))
                  )
                }
              />
            </Box>
          </HStack>

          {/* Binary */}
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
                  <Icon as={FiCode} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Binary
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  Base 2
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Enter binary value (0s and 1s only)"
                value={binary || ""}
                onChange={(e) =>
                  handleOnChange(e, "binary", (value) =>
                    bigInt(value, 2).toString(16)
                  )
                }
                isInvalid={isBinaryInvalid}
              />
            </Box>
          </HStack>

          {/* Text */}
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
                    Text
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  UTF-8
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                placeholder="Enter text to convert"
                value={text || ""}
                onChange={(e) =>
                  handleOnChange(e, "text", (value) => stringToHex(value))
                }
              />
            </Box>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
};

export default Hexadecimal;
