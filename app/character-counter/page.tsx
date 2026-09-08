"use client";

import React, { useEffect, useState } from "react";
import {
  Heading,
  Textarea,
  HStack,
  Text,
  VStack,
  Box,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { FiType, FiHash, FiFileText } from "react-icons/fi";
import { Layout } from "@/components/Layout";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const CharacterCounter = () => {
  const [input, setInput] = useState<string>("");
  const [selectionLength, setSelectionLength] = useState<number | null>(null);

  // The count to display - selection length if selected, otherwise full character count
  const displayCount =
    selectionLength !== null ? selectionLength : input.length;
  const isSelection = selectionLength !== null && selectionLength > 0;

  useEffect(() => {
    const handleMouseUp = () => {
      if (document.activeElement !== document.getElementById("input")) {
        setSelectionLength(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleTextareaMouseUp = () => {
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 0) {
      setSelectionLength(selection.length);
    } else {
      setSelectionLength(null);
    }
  };

  return (
    <Layout>
      <Box
        p={6}
        bg="rgba(0, 0, 0, 0.05)"
        backdropFilter="blur(5px)"
        borderRadius="xl"
        border="1px solid"
        borderColor="whiteAlpha.50"
        maxW="1400px"
        mx="auto"
        w="full"
      >
        {/* Page Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" spacing={3} mb={4}>
            <Icon as={FiType} color="blue.400" boxSize={8} />
            <Heading
              size="xl"
              color="gray.100"
              fontWeight="bold"
              letterSpacing="tight"
            >
              Character Counter
            </Heading>
          </HStack>
          <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
            Count characters in your text, with support for selection counting
          </Text>
        </Box>

        <Box maxW="800px" mx="auto">
          <VStack spacing={6} align="stretch">
            {/* Text Input Section */}
            <Box
              p={4}
              bg="whiteAlpha.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <HStack justify="space-between" mb={3}>
                <HStack spacing={2}>
                  <Icon as={FiFileText} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Input Text
                  </Text>
                </HStack>
                {input && <CopyToClipboard textToCopy={input} />}
              </HStack>
              <Textarea
                autoFocus
                placeholder="Enter or paste your text here..."
                id="input"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSelectionLength(null);
                }}
                rows={8}
                onMouseUpCapture={handleTextareaMouseUp}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                _hover={{ borderColor: "whiteAlpha.300" }}
                _focus={{
                  borderColor: "blue.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                }}
                color="gray.100"
                _placeholder={{ color: "gray.500" }}
                fontSize="md"
                resize="vertical"
              />
              {isSelection && (
                <Text mt={2} fontSize="sm" color="blue.300">
                  Showing count for selected text ({selectionLength} characters)
                </Text>
              )}
            </Box>

            {/* Character Count Display */}
            <HStack
              spacing={4}
              p={4}
              bg="whiteAlpha.100"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <HStack spacing={2}>
                <Icon as={FiHash} color="blue.400" boxSize={5} />
                <Text color="gray.300" fontWeight="medium" fontSize="lg">
                  Characters
                </Text>
                {isSelection && (
                  <Badge colorScheme="blue" fontSize="xs">
                    Selection
                  </Badge>
                )}
              </HStack>
              <Box flex={1} textAlign="right">
                <Text
                  color="gray.100"
                  fontSize="2xl"
                  fontWeight="bold"
                  fontFamily="mono"
                >
                  {displayCount.toLocaleString()}
                </Text>
              </Box>
            </HStack>

            {/* Helper Text */}
            <Text fontSize="sm" color="gray.500" textAlign="center">
              💡 Tip: Select text in the input area to count only the selected
              portion
            </Text>
          </VStack>
        </Box>
      </Box>
    </Layout>
  );
};

export default CharacterCounter;
