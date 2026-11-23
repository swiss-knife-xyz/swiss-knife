"use client";

import { networkOptions } from "@/data/networks";
import { NetworkSelect } from "@/components/NetworkSelect";
import { getEthersProvider } from "@/lib/ethersProvider";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnixTimestamp } from "@/lib/unixTimestamp";
import { ToolLoading } from "@/components/ToolLoading";
import {
  HStack,
  Heading,
  Input,
  Button,
  Text,
  Box,
  FormControl,
  FormLabel,
  Center,
  VStack,
  Icon,
} from "@chakra-ui/react";
import { FiClock } from "react-icons/fi";
import EthDater from "ethereum-block-by-date";
import { Layout } from "@/components/Layout";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { DarkButton } from "@/components/DarkButton";

const timeOptions = ["minutes", "hours", "days"];

const EpochContent = () => {
  const searchParams = useSearchParams();
  const initialTimestamp = parseUnixTimestamp(searchParams.get("timestamp"));
  const initialDate = initialTimestamp === undefined ? undefined : new Date(initialTimestamp * 1000);
  const [timestamp, setTimestamp] = useState<number>(
    Math.floor(Date.now() / 1000)
  );
  const [selectedTimeOption, setSelectedTimeOption] =
    useState<SelectedOptionState>({
      label: timeOptions[0],
      value: timeOptions[0],
    });
  const [futureTimeInput, setFutureTimeInput] = useState<number>();
  const [futureTimestamp, setFutureTimestamp] = useState<number>();
  const [toHumanDateInput, setToHumanDateInput] = useState<number | undefined>(initialTimestamp);
  const [humanDateUTC, setHumanDateUTC] = useState<string | undefined>(initialDate?.toUTCString());
  const [humanDateLocal, setHumanDateLocal] = useState<string>();

  useEffect(() => {
    // The local timezone belongs to the browser, not the rendering server.
    if (initialDate) setHumanDateLocal(initialDate.toString());
  }, []);

  // dateTime to block
  const [dateTime, setDateTime] = useState<string>();
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[0]);
  const [getBlockIsLoading, setGetBlockIsLoading] = useState<boolean>(false);
  const [blockNumber, setBlockNumber] = useState<number>();
  const [blockDate, setBlockDate] = useState<string>();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Layout>
      <Box maxW="600px" mx="auto" px={4}>
        {/* Page Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" spacing={3} mb={3}>
            <Icon as={FiClock} color="blue.400" boxSize={7} />
            <Heading as="h1" size="lg" color="gray.100" fontWeight="bold" letterSpacing="tight">
              Unix Epoch Timestamp
            </Heading>
          </HStack>
          <Text color="gray.400" fontSize="md">
            Convert between Unix timestamps and human-readable dates.
          </Text>
        </Box>

        <VStack spacing={5} align="stretch">
          {/* Current Timestamp */}
          <Box 
            p={5} 
            bg="whiteAlpha.50" 
            borderRadius="lg" 
            border="1px solid" 
            borderColor="whiteAlpha.200"
            textAlign="center"
          >
            <Text color="gray.400" fontSize="sm" mb={2}>Current timestamp</Text>
            <HStack justify="center" spacing={2}>
              <Text color="blue.400" fontSize="2xl" fontWeight="bold" fontFamily="mono">
                {timestamp}
              </Text>
              <CopyToClipboard textToCopy={timestamp.toString()} />
            </HStack>
          </Box>

          {/* Future Timestamp Calculator */}
          <Box 
            p={5} 
            bg="whiteAlpha.50" 
            borderRadius="lg" 
            border="1px solid" 
            borderColor="whiteAlpha.200"
          >
            <Text color="gray.300" fontSize="sm" fontWeight="medium" mb={4}>
              Calculate future timestamp
            </Text>
            <HStack spacing={3} flexWrap="wrap">
              <Input
                type="number"
                w="80px"
                placeholder="0"
                value={futureTimeInput}
                onChange={(e) => setFutureTimeInput(parseFloat(e.target.value))}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: "whiteAlpha.400" }}
                _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                color="gray.100"
                textAlign="center"
              />
              <DarkSelect
                boxProps={{ minW: "110px" }}
                selectedOption={selectedTimeOption}
                setSelectedOption={setSelectedTimeOption}
                options={timeOptions.map((str) => ({
                  label: str,
                  value: str,
                }))}
              />
              <Text color="gray.400">from now</Text>
              <Button
                colorScheme="blue"
                size="sm"
                onClick={() => {
                  if (!futureTimeInput) return;

                  const currentTimestamp = Math.floor(Date.now() / 1000);
                  let multiplier: number = 1;
                  if (selectedTimeOption) {
                    switch (selectedTimeOption.value) {
                      case "minutes": {
                        multiplier = 60;
                        break;
                      }
                      case "hours": {
                        multiplier = 60 * 60;
                        break;
                      }
                      case "days": {
                        multiplier = 60 * 60 * 24;
                        break;
                      }
                    }
                  }

                  setFutureTimestamp(currentTimestamp + futureTimeInput * multiplier);
                }}
              >
                Calculate
              </Button>
            </HStack>
            {futureTimestamp && (
              <HStack mt={4} p={3} bg="whiteAlpha.100" borderRadius="md" justify="center">
                <Text color="gray.400" fontSize="sm">Result:</Text>
                <Text color="blue.400" fontWeight="bold" fontFamily="mono">{futureTimestamp}</Text>
                <CopyToClipboard textToCopy={futureTimestamp.toString()} />
              </HStack>
            )}
          </Box>

          {/* Timestamp to Human-readable */}
          <Box 
            p={5} 
            bg="whiteAlpha.50" 
            borderRadius="lg" 
            border="1px solid" 
            borderColor="whiteAlpha.200"
          >
            <Text color="gray.300" fontSize="sm" fontWeight="medium" mb={4}>
              Convert timestamp to date
            </Text>
            <HStack spacing={3}>
              <Input
                autoFocus
                type="number"
                flex={1}
                placeholder="Timestamp in seconds"
                value={toHumanDateInput ?? ""}
                onChange={(e) => setToHumanDateInput(parseFloat(e.target.value))}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: "whiteAlpha.400" }}
                _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                color="gray.100"
                _placeholder={{ color: "gray.500" }}
              />
              <Button
                colorScheme="blue"
                onClick={() => {
                  if (toHumanDateInput === undefined || !Number.isFinite(toHumanDateInput)) return;

                  const d = new Date(toHumanDateInput * 1_000);
                  setHumanDateUTC(d.toUTCString());
                  setHumanDateLocal(d.toString());
                }}
              >
                Convert
              </Button>
            </HStack>
            {humanDateUTC && humanDateLocal && (
              <Box mt={4} p={3} bg="whiteAlpha.100" borderRadius="md">
                <VStack align="stretch" spacing={2}>
                  <HStack>
                    <Text color="gray.500" fontSize="sm" minW="50px">UTC</Text>
                    <Text color="gray.100" fontSize="sm">{humanDateUTC}</Text>
                  </HStack>
                  <HStack>
                    <Text color="gray.500" fontSize="sm" minW="50px">Local</Text>
                    <Text color="gray.100" fontSize="sm">{humanDateLocal}</Text>
                  </HStack>
                </VStack>
              </Box>
            )}
          </Box>

          {/* Get Block by Date & Time */}
          <Box 
            p={5} 
            bg="whiteAlpha.50" 
            borderRadius="lg" 
            border="1px solid" 
            borderColor="whiteAlpha.200"
          >
            <Text color="gray.300" fontSize="sm" fontWeight="medium" mb={4}>
              Get block number by date
            </Text>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel color="gray.500" fontSize="xs">Date & Time (in your timezone)</FormLabel>
                <Input
                  type="datetime-local"
                  autoComplete="off"
                  value={dateTime}
                  onChange={(e) => {
                    setDateTime(e.target.value);
                  }}
                  bg="whiteAlpha.100"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: "whiteAlpha.400" }}
                  _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                  color="gray.100"
                />
              </FormControl>
              <FormControl>
                <FormLabel color="gray.500" fontSize="xs">Network</FormLabel>
                <NetworkSelect
                  boxProps={{ w: "100%" }}
                  selectedOption={selectedNetworkOption}
                  setSelectedOption={setSelectedNetworkOption}
                  options={networkOptions}
                />
              </FormControl>
              <Center pt={2}>
                <DarkButton
                  onClick={async () => {
                    if (!dateTime) return;

                    setGetBlockIsLoading(true);
                    try {
                      const provider = getEthersProvider(parseInt(selectedNetworkOption!.value.toString()));

                      const dater = new EthDater(
                        // @ts-ignore
                        provider // Ethers provider, required.
                      );

                      console.log({ dateTime });

                      const { block, date } = await dater.getDate(
                        new Date(dateTime), // Date, required. Any valid moment.js value: string, milliseconds, Date() object, moment() object.
                        true // Block after, optional. Search for the nearest block before or after the given date. By default true.
                      );

                      setBlockNumber(block);
                      setBlockDate(date);
                    } catch {}
                    setGetBlockIsLoading(false);
                  }}
                  isLoading={getBlockIsLoading}
                  isDisabled={!dateTime}
                >
                  Get Block
                </DarkButton>
              </Center>
              {blockNumber && blockDate && (
                <Box mt={2} p={3} bg="whiteAlpha.100" borderRadius="md">
                  <VStack align="stretch" spacing={2}>
                    <HStack>
                      <Text color="gray.500" fontSize="sm">Block:</Text>
                      <Text color="gray.100" fontWeight="bold">{blockNumber}</Text>
                      <CopyToClipboard textToCopy={blockNumber.toString()} />
                    </HStack>
                    <HStack>
                      <Text color="gray.500" fontSize="sm">Date:</Text>
                      <Text color="gray.100" fontSize="sm">{blockDate}</Text>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </Box>
        </VStack>
      </Box>
    </Layout>
  );
};

export default function Epoch() {
  return <Suspense fallback={<ToolLoading title="Epoch Converter" description="Convert Unix timestamps to dates." />}>
    <EpochContent />
  </Suspense>;
}
