"use client";

import React, { useState } from "react";
import {
  Heading,
  Box,
  VStack,
  Textarea,
  Alert,
  AlertDescription,
  HStack,
  Link,
  Text,
  Icon,
  Button,
} from "@chakra-ui/react";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { mainnet } from "viem/chains";
import { c } from "@/data/common";
import { generateTenderlyUrl } from "@/utils";
import { zeroAddress } from "viem";
import { FiPlay, FiGlobe, FiAlertCircle, FiExternalLink } from "react-icons/fi";

const networkOptions: { label: string; value: number }[] = Object.keys(c).map(
  (k) => ({
    label: c[k].name,
    value: c[k].id,
  })
);

const ViemErrorSimulate = () => {
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>({
      label: mainnet.name,
      value: mainnet.id,
    });
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [tenderlyUrl, setTenderlyUrl] = useState("");

  const parseTransactionData = (text: string) => {
    try {
      // Extract from address
      const fromMatch = text.match(/from:\s+(\w+)/);
      const from = fromMatch ? fromMatch[1] : zeroAddress;

      // Extract to address
      const toMatch = text.match(/to:\s+(\w+)/);
      const to = toMatch ? toMatch[1] : "";

      // Extract value and convert to wei
      const valueMatch = text.match(/value:\s+([\d.]+)\s+ETH/);
      const valueEth = valueMatch ? parseFloat(valueMatch[1]) : 0;
      const valueWei = (valueEth * 1e18).toString();

      // Extract data
      const dataMatch = text.match(/data:\s+((0x)?[a-fA-F0-9]+)/);
      let data = "";
      if (dataMatch) {
        data = dataMatch[1].trim();
        if (!data.startsWith("0x")) {
          data = "0x" + data;
        }
      }

      if (!from || !to || !valueWei || !data) {
        throw new Error("Failed to parse one or more required fields");
      }

      return { from, to, value: valueWei, data };
    } catch (err) {
      throw new Error(
        "Failed to parse transaction data. Please check the input format."
      );
    }
  };

  const handleSimulate = () => {
    setError("");
    setTenderlyUrl("");
    try {
      const txData = parseTransactionData(input);
      const url = generateTenderlyUrl(
        txData,
        selectedNetworkOption!.value as number
      );
      setTenderlyUrl(url);
      window.open(url, "_blank");
    } catch (err: any) {
      setError(err.message);
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
          <Icon as={FiPlay} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Viem Error Simulate
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Paste a viem contract error to simulate the failed transaction on
          Tenderly.
        </Text>
      </Box>

      {/* Main Content */}
      <Box w="full" maxW="800px" mx="auto">
        <VStack spacing={4} align="stretch">
          {/* Network Selection */}
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Box minW="120px">
              <HStack spacing={2}>
                <Icon as={FiGlobe} color="blue.400" boxSize={4} />
                <Text color="gray.300" fontWeight="medium">
                  Network
                </Text>
              </HStack>
            </Box>
            <Box flex={1}>
              <DarkSelect
                boxProps={{
                  w: "100%",
                }}
                selectedOption={selectedNetworkOption}
                setSelectedOption={setSelectedNetworkOption}
                options={networkOptions}
              />
            </Box>
          </HStack>

          {/* Error Input */}
          <Box
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <HStack spacing={2} mb={3}>
              <Icon as={FiAlertCircle} color="blue.400" boxSize={4} />
              <Text color="gray.300" fontWeight="medium">
                Viem Error
              </Text>
            </HStack>
            <Textarea
              w="100%"
              height="250px"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Example:

Error
Execution reverted for an unknown reason.

Raw Call Arguments:
  from:   0xabc00...
  to:     0xfff00...
  value:  0.123 ETH
  data:   0x860f81c4000...`}
              resize="none"
              data-gramm="false"
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
              fontSize="sm"
              fontFamily="mono"
            />
          </Box>

          {/* Simulate Button */}
          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleSimulate}
            leftIcon={<Icon as={FiExternalLink} boxSize={4} />}
          >
            Simulate on Tenderly
          </Button>

          {/* Error Alert */}
          {error && (
            <Alert
              status="error"
              variant="subtle"
              borderRadius="lg"
              bg="red.900"
              border="1px solid"
              borderColor="red.600"
            >
              <AlertDescription color="red.200">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Link */}
          {tenderlyUrl && (
            <Box
              p={4}
              bg="whiteAlpha.100"
              borderRadius="lg"
              border="1px solid"
              borderColor="blue.400"
            >
              <HStack justify="center">
                <Link
                  href={tenderlyUrl}
                  color="blue.300"
                  fontWeight="medium"
                  isExternal
                  _hover={{ color: "blue.200", textDecoration: "underline" }}
                >
                  Open Tenderly Simulation
                </Link>
                <Icon as={FiExternalLink} color="blue.300" boxSize={4} />
              </HStack>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

export default ViemErrorSimulate;
