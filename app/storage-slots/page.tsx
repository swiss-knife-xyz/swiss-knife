"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Heading,
  Box,
  Container,
  FormControl,
  FormLabel,
  Input,
  Text,
  Center,
  HStack,
  Button,
  Link,
  Tag,
  Avatar,
  Spinner,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { ethers } from "ethers";
import { Layout } from "@/components/Layout";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { c, chainIdToChain } from "@/data/common";
import { Address, encodePacked, keccak256, createPublicClient, http, erc20Abi } from "viem";
import { resolveAddressToName, getNameAvatar } from "@/lib/nameResolution";
import { fetchContractAbi } from "@/utils";
import axios from "axios";

const networkOptions: { label: string; value: number }[] = Object.keys(c).map(
  (k, i) => ({
    label: c[k].name,
    value: c[k].id,
  })
);

const EIP1967Options = ["implementation", "admin", "beacon", "rollback"];

const Txt = ({ str, colorScheme }: { str: string; colorScheme: string }) => (
  <Text
    style={{
      marginLeft: "0",
    }}
    color={`${colorScheme}.300`}
  >
    {str}
  </Text>
);

const EIP1967Select = ({
  EIP1967Options,
  selectedEIP1967Slot,
  setSelectedEIP1967Slot,
}: {
  EIP1967Options: string[];
  selectedEIP1967Slot: SelectedOptionState;
  setSelectedEIP1967Slot: (value: SelectedOptionState) => void;
}) => {
  return (
    <Center mt={10}>
      <HStack fontWeight={"bold"}>
        <Txt colorScheme="orange" str={`bytes32(`} />
        <Txt colorScheme="pink" str={`uint256(`} />
        <Txt colorScheme="red" str={`keccak256(`} />
        <Txt colorScheme="green" str={`'eip1967.proxy.`} />
        <DarkSelect
          boxProps={{
            minW: "14rem",
          }}
          isCreatable
          selectedOption={selectedEIP1967Slot}
          setSelectedOption={setSelectedEIP1967Slot}
          options={EIP1967Options.map((str) => ({
            label: str,
            value: str,
          }))}
        />
        <Txt colorScheme="green" str={`'`} />
        <Txt colorScheme="red" str={`)`} />
        <Txt colorScheme="pink" str={`) - 1`} />
        <Txt colorScheme="orange" str={`)`} />
      </HStack>
    </Center>
  );
};

const StorageSlotInput = ({
  setStorageSlot,
  setSlotRange,
}: {
  storageSlot?: string;
  setStorageSlot: (value: string) => void;
  setSlotRange: (value: { start: string; end: string } | null) => void;
}) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [localStorageSlot, setLocalStorageSlot] = useState<string>("");
  const [mappingStorageSlot, setMappingStorageSlot] = useState<string>("");
  const [mappingKey, setMappingKey] = useState<string>("");
  const [arrayStorageSlot, setArrayStorageSlot] = useState<string>("");
  const [arrayIndex, setArrayIndex] = useState<string>("");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");

  useEffect(() => {
    // Clear range when not in range mode
    if (selectedTabIndex !== 3) {
      setSlotRange(null);
    }

    if (selectedTabIndex === 0 && localStorageSlot) {
      setStorageSlot(localStorageSlot);
    } else if (selectedTabIndex === 1 && mappingStorageSlot && mappingKey) {
      const storageSlot = keccak256(
        encodePacked(
          ["uint256", "uint256"],
          [BigInt(mappingKey), BigInt(mappingStorageSlot)]
        )
      );
      setStorageSlot(storageSlot);
    } else if (selectedTabIndex === 2 && arrayIndex && arrayStorageSlot) {
      const storageSlot =
        BigInt(
          keccak256(encodePacked(["uint256"], [BigInt(arrayStorageSlot)]))
        ) + BigInt(arrayIndex);
      setStorageSlot("0x" + storageSlot.toString(16));
    } else if (selectedTabIndex === 3 && rangeStart && rangeEnd) {
      setSlotRange({ start: rangeStart, end: rangeEnd });
      setStorageSlot(""); // Clear single slot when in range mode
    } else {
      setStorageSlot("");
    }
  }, [
    selectedTabIndex,
    mappingKey,
    mappingStorageSlot,
    arrayIndex,
    arrayStorageSlot,
    localStorageSlot,
    rangeStart,
    rangeEnd,
    setStorageSlot,
    setSlotRange,
  ]);
  return (
    <Container>
      <TabsSelector
        tabs={["Raw", "Mapping", "Array", "Range"]}
        selectedTabIndex={selectedTabIndex}
        setSelectedTabIndex={setSelectedTabIndex}
        mb={10}
      />
      {(() => {
        switch (selectedTabIndex) {
          case 0:
            return (
              <FormControl>
                <FormLabel>Enter storage slot:</FormLabel>
                <Input
                  autoComplete="off"
                  value={localStorageSlot}
                  onChange={(e) => {
                    setLocalStorageSlot(e.target.value);
                  }}
                  bg={"blackAlpha.300"}
                  placeholder="123 or 0xabc123..."
                />
              </FormControl>
            );
          case 1:
            return (
              <FormControl>
                <FormLabel>Enter storage slot of the mapping:</FormLabel>
                <Input
                  autoComplete="off"
                  value={mappingStorageSlot}
                  onChange={(e) => {
                    setMappingStorageSlot(e.target.value);
                  }}
                  bg={"blackAlpha.300"}
                  placeholder="123 or 0xabc123..."
                />
                <Center>
                  <HStack fontWeight={"bold"}>
                    <Txt colorScheme="orange" str={`myMapping[`} />
                    <Input
                      autoComplete="off"
                      value={mappingKey}
                      onChange={(e) => {
                        setMappingKey(e.target.value);
                      }}
                      bg={"blackAlpha.300"}
                      placeholder="123 or 0xabc123..."
                    />
                    <Txt colorScheme="orange" str={`]`} />
                  </HStack>
                </Center>
              </FormControl>
            );
          case 2:
            return (
              <FormControl>
                <FormLabel>Enter storage slot of the array:</FormLabel>
                <Input
                  autoComplete="off"
                  value={arrayStorageSlot}
                  onChange={(e) => {
                    setArrayStorageSlot(e.target.value);
                  }}
                  bg={"blackAlpha.300"}
                  placeholder="123 or 0xabc123..."
                />
                <Center>
                  <HStack maxWidth={"50%"} fontWeight={"bold"}>
                    <Txt colorScheme="blue" str={`myArray[`} />
                    <Input
                      type="number"
                      autoComplete="off"
                      value={arrayIndex}
                      onChange={(e) => {
                        setArrayIndex(e.target.value);
                      }}
                      bg={"blackAlpha.300"}
                      placeholder="123"
                    />
                    <Txt colorScheme="blue" str={`]`} />
                  </HStack>
                </Center>
              </FormControl>
            );
          case 3:
            return (
              <FormControl>
                <FormLabel>Enter storage slot range:</FormLabel>
                <HStack>
                  <Input
                    autoComplete="off"
                    value={rangeStart}
                    onChange={(e) => {
                      setRangeStart(e.target.value);
                    }}
                    bg={"blackAlpha.300"}
                    placeholder="Start slot (e.g., 0)"
                  />
                  <Text color="whiteAlpha.700" fontWeight="bold">
                    to
                  </Text>
                  <Input
                    autoComplete="off"
                    value={rangeEnd}
                    onChange={(e) => {
                      setRangeEnd(e.target.value);
                    }}
                    bg={"blackAlpha.300"}
                    placeholder="End slot (e.g., 9)"
                  />
                </HStack>
                <Text mt={2} fontSize="sm" color="whiteAlpha.600">
                  Fetches all storage values from start to end slot (inclusive)
                </Text>
              </FormControl>
            );
        }
      })()}
    </Container>
  );
};

const Query = ({ query }: { query: () => {} }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Center mt={8}>
      <Button
        color="white"
        bg={"blackAlpha.400"}
        _hover={{
          bg: "blackAlpha.100",
        }}
        border="1px solid"
        borderColor={"whiteAlpha.500"}
        onClick={async () => {
          setIsLoading(true);
          try {
            await query();
          } catch (e) {
            console.error(e);
          }
          setIsLoading(false);
        }}
        isLoading={isLoading}
      >
        Query
      </Button>
    </Center>
  );
};

const formatOptions = ["hex", "address", "uint256", "bool", "int256"];

const formatValue = (value: string, format: string): string => {
  if (format === "hex") {
    return value;
  }
  try {
    return ethers.AbiCoder.defaultAbiCoder()
      .decode([format], value)[0]
      .toString();
  } catch {
    return value;
  }
};

// Auto-detect the most appropriate format for a storage value
const detectFormat = (value: string): string => {
  // All zeros = likely uninitialized, show as hex
  if (value === "0x" + "0".repeat(64)) {
    return "hex";
  }

  // Check if it looks like a boolean (0 or 1)
  const numValue = BigInt(value);
  if (numValue === BigInt(0) || numValue === BigInt(1)) {
    return "bool";
  }

  // Check if it looks like an address (has 24 leading zero bytes = 48 hex chars after 0x)
  // Addresses are 20 bytes, stored right-aligned in 32 bytes
  if (value.substring(2, 26) === "0".repeat(24) && value.substring(26) !== "0".repeat(40)) {
    return "address";
  }

  // Check if it's a small number (fits in reasonable uint range and has many leading zeros)
  const leadingZeros = value.substring(2).match(/^0*/)?.[0].length || 0;
  if (leadingZeros >= 32) {
    return "uint256";
  }

  // Default to hex for complex values
  return "hex";
};

// Component to display address with ENS, tags, and explorer link
const AddressValue = ({
  address,
  chainId,
}: {
  address: string;
  chainId: number;
}) => {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const explorerUrl = chainIdToChain[chainId]?.blockExplorers?.default?.url;

  const fetchAddressLabels = useCallback(async () => {
    try {
      const client = createPublicClient({
        chain: chainIdToChain[chainId],
        transport: http(),
      });

      // Try fetching the contract symbol() if it's a token
      try {
        const symbol = await client.readContract({
          address: address as Address,
          abi: erc20Abi,
          functionName: "symbol",
        });
        setLabels([symbol]);
        return;
      } catch {
        // Try fetching verified contract name
        try {
          const fetchedAbi = await fetchContractAbi({ address, chainId });
          if (fetchedAbi?.name) {
            setLabels([fetchedAbi.name]);
            return;
          }
        } catch {}
      }

      // Fallback to labels API
      try {
        const res = await axios.get(
          `${
            process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
              ? ""
              : "https://swiss-knife.xyz"
          }/api/labels/${address}?chainId=${chainId}`
        );
        if (res.data.length > 0) {
          setLabels(res.data);
        }
      } catch {}
    } catch {}
  }, [address, chainId]);

  useEffect(() => {
    setIsLoading(true);
    setEnsName(null);
    setEnsAvatar(null);
    setLabels([]);

    // Fetch ENS name
    resolveAddressToName(address).then((name) => {
      if (name) {
        setEnsName(name);
        // Fetch avatar
        getNameAvatar(name).then((avatar) => {
          if (avatar) setEnsAvatar(avatar);
        });
      }
    });

    // Fetch labels
    fetchAddressLabels().finally(() => setIsLoading(false));
  }, [address, chainId, fetchAddressLabels]);

  return (
    <HStack gap={2} flexWrap="wrap" justify="flex-end" flex={1}>
      {isLoading && <Spinner size="xs" />}
      {labels.length > 0 && (
        <HStack gap={1} flexWrap="wrap">
          {labels.map((label, idx) => (
            <Tag key={idx} size="sm" colorScheme="blue" variant="solid">
              {label}
            </Tag>
          ))}
        </HStack>
      )}
      {ensName && (
        <HStack
          bg="whiteAlpha.200"
          px={2}
          py={1}
          borderRadius="md"
          gap={1}
        >
          {ensAvatar && <Avatar src={ensAvatar} size="2xs" />}
          <Text fontSize="sm" color="purple.300">
            {ensName}
          </Text>
        </HStack>
      )}
      <Text fontFamily="mono" fontSize="sm">
        {address}
      </Text>
      {explorerUrl && (
        <Tooltip label="View on explorer" placement="top">
          <IconButton
            as={Link}
            href={`${explorerUrl}/address/${address}`}
            isExternal
            aria-label="View on explorer"
            icon={<ExternalLinkIcon />}
            size="xs"
            variant="ghost"
            colorScheme="blue"
          />
        </Tooltip>
      )}
    </HStack>
  );
};

const Result = ({
  result,
  chainId,
}: {
  result: {
    value?: string;
    storageSlot?: string;
    error?: string;
  };
  chainId: number;
}) => {
  // Auto-detect format when result changes
  const autoDetectedFormat = result.value ? detectFormat(result.value) : "hex";
  
  const [selectedFormatOption, setSelectedFormatOption] =
    useState<SelectedOptionState>({
      label: autoDetectedFormat,
      value: autoDetectedFormat,
    });

  // Update selected format when result changes (new query)
  useEffect(() => {
    if (result.value) {
      const detected = detectFormat(result.value);
      setSelectedFormatOption({
        label: detected,
        value: detected,
      });
    }
  }, [result.value]);

  const activeFormat = selectedFormatOption?.value?.toString() || "hex";
  const formattedAddress = activeFormat === "address" && result.value
    ? formatValue(result.value, "address")
    : null;

  return (
    <Box mt={4} mx="auto" w="full" maxW="1200px" px={4}>
      {!result.error ? (
        <>
          <HStack mb={4}>
            <Heading fontSize={"3xl"} color="whiteAlpha.800">
              Result
            </Heading>
            <DarkSelect
              boxProps={{
                w: "130px",
                minW: "130px",
              }}
              selectedOption={selectedFormatOption}
              setSelectedOption={setSelectedFormatOption}
              options={formatOptions.map((str) => ({
                label: str,
                value: str,
              }))}
            />
          </HStack>
          <Box
            p={4}
            bg="blackAlpha.400"
            borderRadius="md"
            border="1px solid"
            borderColor="whiteAlpha.300"
          >
            <HStack flexWrap="wrap" gap={2}>
              <Text color="whiteAlpha.700" flexShrink={0}>Value:</Text>
              {activeFormat === "address" && formattedAddress ? (
                <AddressValue address={formattedAddress} chainId={chainId} />
              ) : (
                <Text fontFamily="mono" wordBreak="break-all">
                  {result.value ? formatValue(result.value, activeFormat) : ""}
                </Text>
              )}
            </HStack>

            <Box mt={4}>
              <Text color="whiteAlpha.700">At storage slot:</Text>
              <Text fontFamily="mono">{result.storageSlot}</Text>
            </Box>
          </Box>
        </>
      ) : (
        <Text>Error: {result.error}</Text>
      )}
    </Box>
  );
};

const RangeResultRow = ({
  item,
  globalFormat,
  chainId,
}: {
  item: { slot: string; value: string };
  globalFormat: string | null;
  chainId: number;
}) => {
  const autoDetectedFormat = detectFormat(item.value);
  const [selectedFormat, setSelectedFormat] = useState<SelectedOptionState>({
    label: autoDetectedFormat,
    value: autoDetectedFormat,
  });

  // Use global format if set, otherwise use per-row format
  const activeFormat = globalFormat || selectedFormat?.value?.toString() || "hex";

  // Get the formatted address value when format is "address"
  const formattedAddress = activeFormat === "address" 
    ? formatValue(item.value, "address") 
    : null;

  return (
    <Box p={3} mb={2} bg="blackAlpha.400" borderRadius="md" _last={{ mb: 0 }}>
      <HStack justify="space-between" flexWrap="nowrap" gap={4}>
        <HStack flexShrink={0}>
          <Text color="whiteAlpha.700" fontSize="sm" whiteSpace="nowrap">
            Slot {item.slot}:
          </Text>
          {!globalFormat && (
            <DarkSelect
              boxProps={{
                w: "130px",
                minW: "130px",
              }}
              selectedOption={selectedFormat}
              setSelectedOption={setSelectedFormat}
              options={formatOptions.map((str) => ({
                label: str,
                value: str,
              }))}
            />
          )}
        </HStack>
        {activeFormat === "address" && formattedAddress ? (
          <AddressValue address={formattedAddress} chainId={chainId} />
        ) : (
          <Text fontFamily="mono" fontSize="sm" wordBreak="break-all" flex={1} textAlign="right">
            {formatValue(item.value, activeFormat)}
          </Text>
        )}
      </HStack>
    </Box>
  );
};

const RangeResult = ({
  results,
  chainId,
}: {
  results: {
    values?: { slot: string; value: string }[];
    error?: string;
  };
  chainId: number;
}) => {
  const [globalFormatOption, setGlobalFormatOption] =
    useState<SelectedOptionState | null>(null);

  const globalFormatOptions = [
    { label: "Auto (per slot)", value: "" },
    ...formatOptions.map((str) => ({ label: str, value: str })),
  ];

  return (
    <Box mt={4} mx="auto" w="full" maxW="1200px" px={4}>
      {!results.error ? (
        <>
          <HStack mb={4} flexWrap="wrap" gap={3}>
            <Heading fontSize={"3xl"} color="whiteAlpha.800">
              Results
            </Heading>
            <HStack>
              <Text fontSize="sm" color="whiteAlpha.600" whiteSpace="nowrap">
                Format all:
              </Text>
              <DarkSelect
                boxProps={{
                  w: "180px",
                  minW: "180px",
                }}
                selectedOption={globalFormatOption || { label: "Auto (per slot)", value: "" }}
                setSelectedOption={(opt) => {
                  setGlobalFormatOption(opt?.value ? opt : null);
                }}
                options={globalFormatOptions}
              />
            </HStack>
          </HStack>
          <Box
            maxH="500px"
            overflowY="auto"
            border="1px solid"
            borderColor="whiteAlpha.300"
            borderRadius="md"
            p={3}
          >
            {results.values?.map((item, index) => (
              <RangeResultRow
                key={index}
                item={item}
                globalFormat={globalFormatOption?.value?.toString() || null}
                chainId={chainId}
              />
            ))}
          </Box>
          <Text mt={2} fontSize="sm" color="whiteAlpha.600">
            {results.values?.length} slot(s) fetched
          </Text>
        </>
      ) : (
        <Text>Error: {results.error}</Text>
      )}
    </Box>
  );
};

const StorageSlots = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedEIP1967Slot, setSelectedEIP1967Slot] =
    useState<SelectedOptionState>({
      label: EIP1967Options[0],
      value: EIP1967Options[0],
    });

  const [address, setAddress] = useState<string>();
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[0]);
  const [storageSlot, setStorageSlot] = useState<string>();
  const [slotRange, setSlotRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [result, setResult] = useState<{
    value?: string;
    storageSlot?: string;
    error?: string;
  }>();
  const [rangeResults, setRangeResults] = useState<{
    values?: { slot: string; value: string }[];
    error?: string;
  }>();

  const query = async () => {
    // validate address
    if (!ethers.isAddress(address)) {
      setResult({ error: "Address is invalid" });
      setRangeResults(undefined);
      return;
    }

    const provider = new ethers.JsonRpcProvider(
      chainIdToChain[
        parseInt(selectedNetworkOption!.value.toString())
      ]?.rpcUrls.default.http[0]
    );

    // Handle range query
    if (slotRange) {
      setResult(undefined);
      try {
        const startSlot = BigInt(slotRange.start);
        const endSlot = BigInt(slotRange.end);

        if (endSlot < startSlot) {
          setRangeResults({ error: "End slot must be >= start slot" });
          return;
        }

        const values: { slot: string; value: string }[] = [];
        const CHUNK_SIZE = 50; // Process 50 slots at a time to avoid overwhelming RPC

        // Create array of all slots to fetch
        const slots: bigint[] = [];
        for (let slot = startSlot; slot <= endSlot; slot++) {
          slots.push(slot);
        }

        // Process in chunks
        for (let i = 0; i < slots.length; i += CHUNK_SIZE) {
          const chunk = slots.slice(i, i + CHUNK_SIZE);
          const chunkPromises = chunk.map((slot) => {
            const slotHex = "0x" + slot.toString(16);
            return provider.getStorage(address, slotHex).then((value) => ({
              slot: slot.toString(),
              value,
            }));
          });

          const chunkResults = await Promise.all(chunkPromises);
          values.push(...chunkResults);
        }

        // Sort by slot number (already in order but ensures correctness)
        values.sort((a, b) => Number(BigInt(a.slot) - BigInt(b.slot)));

        setRangeResults({ values });
      } catch (e) {
        setRangeResults({ error: "Invalid slot range entered" });
      }
      return;
    }

    // Handle single slot query
    setRangeResults(undefined);
    let _storageSlot =
      selectedTabIndex === 0
        ? getEIP1967StorageSlot(selectedEIP1967Slot!.value.toString())
        : storageSlot;

    if (!_storageSlot) {
      setResult({ error: "Storage slot not entered." });
      return;
    }

    try {
      const res = await provider.getStorage(address, _storageSlot);

      _storageSlot = _storageSlot.toString(16);
      // add 0x in the beginning if doesn't exist (as returned via getEIP1967StorageSlot)
      if (_storageSlot.substring(0, 2) !== "0x") {
        _storageSlot = `0x${_storageSlot}`;
      }

      setResult({
        value: res,
        storageSlot: _storageSlot,
      });
    } catch (e) {
      setResult({
        error: "Invalid storage slot entered",
      });
    }
  };

  const getEIP1967StorageSlot = (key: string) => {
    const khash = ethers.keccak256(ethers.toUtf8Bytes(`eip1967.proxy.${key}`));
    const num = BigInt(khash);
    const storageSlot = num - BigInt(1);
    return storageSlot;
  };

  return (
    <Layout>
      <Box minW={["0", "0", "2xl", "2xl"]}>
        <Heading textAlign="center" pt="2rem">
          Query Storage Slot
        </Heading>
        <Container>
          <FormControl mt={16}>
            <FormLabel>Contract Address</FormLabel>
            <Input
              autoFocus
              autoComplete="off"
              placeholder="0x00..."
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
              }}
              bg={"blackAlpha.300"}
            />
          </FormControl>
          <DarkSelect
            boxProps={{
              w: "100%",
              mt: "2",
            }}
            selectedOption={selectedNetworkOption}
            setSelectedOption={setSelectedNetworkOption}
            options={networkOptions}
          />
        </Container>
        <TabsSelector
          tabs={["EIP-1967", "Custom"]}
          selectedTabIndex={selectedTabIndex}
          setSelectedTabIndex={setSelectedTabIndex}
        />
        {(() => {
          switch (selectedTabIndex) {
            case 0:
              return (
                <EIP1967Select
                  EIP1967Options={EIP1967Options}
                  selectedEIP1967Slot={selectedEIP1967Slot}
                  setSelectedEIP1967Slot={setSelectedEIP1967Slot}
                />
              );
            case 1:
              return (
                <StorageSlotInput
                  storageSlot={storageSlot}
                  setStorageSlot={setStorageSlot}
                  setSlotRange={setSlotRange}
                />
              );
          }
        })()}
        <Query query={query} />
        {(result?.value || result?.error) && (
          <Result
            result={result}
            chainId={parseInt(selectedNetworkOption!.value.toString())}
          />
        )}
        {(rangeResults?.values || rangeResults?.error) && (
          <RangeResult
            results={rangeResults}
            chainId={parseInt(selectedNetworkOption!.value.toString())}
          />
        )}
      </Box>
    </Layout>
  );
};

export default StorageSlots;
