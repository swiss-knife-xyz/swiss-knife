"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import {
  Heading,
  Text,
  Input,
  Box,
  VStack,
  HStack,
  Icon,
  Badge,
  Flex,
} from "@chakra-ui/react";
import { parseAsString, useQueryState } from "next-usequerystate";
import {
  parseEther,
  parseGwei,
  formatEther,
  formatGwei,
  formatUnits,
} from "viem";
import { FiDollarSign, FiHash } from "react-icons/fi";
import { useLocalStorage } from "usehooks-ts";
import { InputField } from "@/components/InputField";

function ETHUnitConverterContent() {
  const searchParams = useSearchParams();
  const weiFromUrl = searchParams.get("wei");

  const [wei, setWei] = useQueryState<string>(
    "wei",
    parseAsString.withDefault(weiFromUrl ?? "")
  );
  const [gwei, setGwei] = useState<string>();
  const [eth, setEth] = useState<string>();
  const [unit, setUnit] = useState<string>();
  const [usd, setUsd] = useState<string>();
  const [exponent, setExponent] = useState<number>(6);

  const [ethPrice, setEthPrice] = useLocalStorage("ethPrice", 0);

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    unit: "wei" | "gwei" | "eth" | "unit" | "usd",
    valueToWei: (value: string) => string
  ) => {
    const value = e.target.value;

    if (unit === "wei") setWei(value);
    else if (unit === "gwei") setGwei(value);
    else if (unit === "eth") setEth(value);
    else if (unit === "unit") setUnit(value);
    else if (unit === "usd") setUsd(value);

    if (value.length > 0) {
      const wei = valueToWei(value);
      setValues(wei, unit);
    } else {
      setWei("");
      setGwei("");
      setEth("");
      setUnit("");
      setUsd("");
    }
  };

  const setValues = (
    inWei: string,
    exceptUnit: "wei" | "gwei" | "eth" | "unit" | "usd"
  ) => {
    setWei(inWei);

    if (inWei.length > 0) {
      if (exceptUnit !== "gwei") setGwei(formatGwei(BigInt(inWei)));
      if (exceptUnit !== "eth") setEth(formatEther(BigInt(inWei)));
      if (exceptUnit !== "unit") {
        const unitValue = formatUnits(BigInt(inWei), 18 - exponent);
        setUnit(unitValue);
      }
      if (exceptUnit !== "usd") {
        const eth = formatEther(BigInt(inWei));
        setUsd((parseFloat(eth) * ethPrice).toString());
      }
    } else {
      setGwei("");
      setEth("");
      setUnit("");
      setUsd("");
    }
  };

  const setPrices = async () => {
    const token = "ethereum";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      setEthPrice(data[token].usd);
    } catch (error) {}
  };

  const recalculateUnit = () => {
    if (wei) {
      const unitValue = formatUnits(BigInt(wei), 18 - exponent);
      setUnit(unitValue);
    }
  };

  useEffect(() => {
    setPrices();
  }, []);

  useEffect(() => {
    if (weiFromUrl) {
      handleOnChange(
        {
          target: { value: weiFromUrl },
        } as React.ChangeEvent<HTMLInputElement>,
        "wei",
        (value) => value
      );
    }
  }, []);

  useEffect(() => {
    recalculateUnit();
  }, [exponent]);

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
          <Icon as={FiDollarSign} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            ETH Unit Converter
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
          Convert between different Ethereum units
        </Text>
      </Box>

      {/* Simple Input List */}
      <Box w="full" maxW="800px" mx="auto">
        <VStack spacing={4} align="stretch">
          {/* Wei */}
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
                    Wei
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  10^18
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                type="number"
                placeholder="Enter Wei amount"
                value={wei || ""}
                onChange={(e) => handleOnChange(e, "wei", (value) => value)}
              />
            </Box>
          </HStack>

          {/* Gwei */}
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
                    Gwei
                  </Text>
                </HStack>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  10^9
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                type="number"
                placeholder="Enter Gwei amount"
                value={gwei || ""}
                onChange={(e) =>
                  handleOnChange(e, "gwei", (value) =>
                    parseGwei(value).toString()
                  )
                }
              />
            </Box>
          </HStack>

          {/* Custom Unit */}
          <HStack
            spacing={4}
            p={4}
            bg="whiteAlpha.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Box minW="120px">
              <Flex align="center">
                <HStack spacing={2}>
                  <Icon as={FiHash} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    10^
                  </Text>
                </HStack>
                <Input
                  ml={2}
                  type="number"
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{ borderColor: "whiteAlpha.300" }}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                  color="gray.100"
                  value={exponent.toString()}
                  onChange={(e) => {
                    const newExponent = Number(e.target.value);
                    if (!isNaN(newExponent) && newExponent >= 0) {
                      setExponent(newExponent);
                    }
                  }}
                  maxW="3rem"
                  textAlign="center"
                  size="sm"
                  rounded={"md"}
                />
              </Flex>
            </Box>
            <Box flex={1}>
              <InputField
                type="number"
                placeholder={`Enter amount in 10^${exponent} units`}
                value={unit || ""}
                onChange={(e) =>
                  handleOnChange(e, "unit", (value) =>
                    parseEther(
                      (parseFloat(value) / 10 ** exponent).toString()
                    ).toString()
                  )
                }
              />
            </Box>
          </HStack>

          {/* Ether - Highlighted */}
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
                  <Icon as={FiHash} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    Ether
                  </Text>
                </HStack>
                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                  1 ETH
                </Badge>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                type="number"
                placeholder="Enter Ether amount"
                value={eth || ""}
                onChange={(e) =>
                  handleOnChange(e, "eth", (value) =>
                    parseEther(value).toString()
                  )
                }
              />
            </Box>
          </HStack>

          {/* USD */}
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
                  <Icon as={FiDollarSign} color="blue.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium">
                    USD
                  </Text>
                </HStack>
              </VStack>
            </Box>
            <Box flex={1}>
              <InputField
                type="number"
                placeholder="Enter USD amount"
                value={usd || ""}
                onChange={(e) =>
                  handleOnChange(e, "usd", (value) => {
                    const eth = parseFloat(value) / ethPrice;
                    return parseEther(eth.toString()).toString();
                  })
                }
              />
            </Box>
            <Box>
              <Badge colorScheme="blue" fontSize="xs" px={2} py={1}>
                1 ETH = $
                {ethPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Badge>
            </Box>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}

export default function ETHUnitConverter() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ETHUnitConverterContent />
    </Suspense>
  );
}
