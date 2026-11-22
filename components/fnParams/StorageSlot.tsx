import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Text,
  useUpdateEffect,
} from "@chakra-ui/react";
import { ethers } from "ethers";
import { SelectedOptionState } from "@/types";
import { chainIdToChain, networkOptions } from "@/data/common";
import { DarkSelect } from "../DarkSelect";
import TabsSelector from "../Tabs/TabsSelector";
import { CalldataParam } from "../decodedParams/CalldataParam";
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import {
  EIP1967Options,
  getEIP1967StorageSlot,
  getERC7201StorageSlot,
  normalizeStorageSlot,
} from "@/lib/storageSlots";

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
    <Box mt={4} minW={0} w="full" display="flex" flexDirection="column">
      <FormControl order={1}>
        <HStack justify="space-between" align="baseline" mb={1.5} spacing={2}>
          <FormLabel fontSize="sm" color="text.secondary" mb={0}>Proxy slot</FormLabel>
          <Link href="https://eip.tools/eip/1967" isExternal fontSize="xs" color="primary.400" flexShrink={0}>
            EIP-1967 <ExternalLinkIcon ml={1} />
          </Link>
        </HStack>
        <DarkSelect
          ariaLabel="EIP-1967 proxy slot"
          boxProps={{ minW: 0, w: "full" }}
          isCreatable
          selectedOption={selectedEIP1967Slot}
          setSelectedOption={setSelectedEIP1967Slot}
          options={EIP1967Options.map(str => ({ label: str, value: str }))}
        />
      </FormControl>
      <Text
        as="pre"
        order={{ base: 0, md: 2 }}
        mt={{ base: 0, md: 3 }}
        mb={{ base: 3, md: 0 }}
        fontSize="xs"
        lineHeight="tall"
        fontFamily="mono"
        color="text.secondary"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
      >
        <Text as="span" color="orange.300">bytes32(</Text>{"\n  "}
        <Text as="span" color="pink.300">uint256(</Text>{"\n    "}
        <Text as="span" color="red.300">keccak256(</Text>{"\n      "}
        <Text as="span" color="green.300">{`'eip1967.proxy.${selectedEIP1967Slot?.value ?? "implementation"}'`}</Text>{"\n    "}
        <Text as="span" color="red.300">)</Text>{"\n  "}
        <Text as="span" color="pink.300">) - 1</Text>{"\n"}
        <Text as="span" color="orange.300">)</Text>
      </Text>
    </Box>
  );
};

const ERC7201Select = ({
  namespaceId,
  setNamespaceId,
}: {
  namespaceId: string;
  setNamespaceId: (value: string) => void;
}) => {
  const normalizedNamespaceId = namespaceId.trim();
  const storageSlot = normalizedNamespaceId
    ? getERC7201StorageSlot(normalizedNamespaceId)
    : undefined;

  return (
    <Box mt={4} minW={0} w="full" display="flex" flexDirection="column">
      <FormControl order={1}>
        <HStack justify="space-between" align="baseline" mb={1.5} spacing={2}>
          <FormLabel fontSize="sm" color="text.secondary" mb={0}>Namespace ID</FormLabel>
          <Link href="https://eip.tools/eip/7201" isExternal fontSize="xs" color="primary.400" flexShrink={0}>
            ERC-7201 <ExternalLinkIcon ml={1} />
          </Link>
        </HStack>
        <Input
          autoComplete="off"
          value={namespaceId}
          onChange={(e) => setNamespaceId(e.target.value)}
          bg={"blackAlpha.300"}
          placeholder="example.main"
        />
      </FormControl>
      <Text
        as="pre"
        order={{ base: 0, md: 2 }}
        mt={{ base: 0, md: 3 }}
        mb={{ base: 3, md: 0 }}
        fontSize="xs"
        lineHeight="tall"
        fontFamily="mono"
        color="text.secondary"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
      >
        <Text as="span" color="red.300">keccak256(</Text>{"\n  "}
        <Text as="span" color="blue.300">abi.encode(</Text>{"\n    "}
        <Text as="span" color="pink.300">uint256(</Text>{"\n      "}
        <Text as="span" color="red.300">keccak256(</Text>{"\n        "}
        <Text as="span" color="green.300">{`'${normalizedNamespaceId || "namespace.id"}'`}</Text>{"\n      "}
        <Text as="span" color="red.300">)</Text>{"\n    "}
        <Text as="span" color="pink.300">) - 1</Text>{"\n  "}
        <Text as="span" color="blue.300">)</Text>{"\n"}
        <Text as="span" color="red.300">)</Text>{" "}
        <Text as="span" color="orange.300">&amp; ~0xff</Text>
      </Text>
      {storageSlot && (
        <Text order={3} mt={4} fontFamily="mono" fontSize="sm" wordBreak="break-all">
          {storageSlot}
        </Text>
      )}
    </Box>
  );
};

const Query = ({ query }: { query: () => Promise<void> }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Center>
      <Button
        size="sm"
        colorScheme="blue"
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
        Read
      </Button>
    </Center>
  );
};

const StorageSlotInput = ({
  storageSlot,
  setStorageSlot,
}: {
  storageSlot?: string;
  setStorageSlot: (value: string) => void;
}) => {
  return (
    <Box mt={4} minW={0} w="full">
      <FormControl>
        <FormLabel fontSize="sm" color="text.secondary" mb={1.5}>Storage slot</FormLabel>
        <Input
          autoComplete="off"
          value={storageSlot ?? ""}
          onChange={(e) => {
            setStorageSlot(e.target.value);
          }}
          bg={"blackAlpha.300"}
          placeholder="123 or 0xabc123..."
        />
      </FormControl>
    </Box>
  );
};

export const StorageSlot = ({
  address,
  chainId,
  readAllCollapsed,
}: {
  address: string;
  chainId: number;
  readAllCollapsed?: boolean;
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedEIP1967Slot, setSelectedEIP1967Slot] =
    useState<SelectedOptionState>({
      label: EIP1967Options[0],
      value: EIP1967Options[0],
    });
  const [erc7201NamespaceId, setErc7201NamespaceId] = useState("");

  const [storageSlot, setStorageSlot] = useState<string>();
  const [result, setResult] = useState<{
    value?: string;
    storageSlot?: string;
    error?: string;
  }>();

  const query = async () => {
    // validate address
    if (!ethers.isAddress(address)) {
      setResult({ error: "Address is invalid" });
      return;
    }

    const provider = new ethers.JsonRpcProvider(
      chainIdToChain[chainId]?.rpcUrls.default.http[0]
    );
    let _storageSlot: string | bigint | undefined;

    if (selectedTabIndex === 0) {
      _storageSlot = getEIP1967StorageSlot(
        selectedEIP1967Slot!.value.toString()
      );
    } else if (selectedTabIndex === 1) {
      const normalizedNamespaceId = erc7201NamespaceId.trim();
      _storageSlot = normalizedNamespaceId
        ? getERC7201StorageSlot(normalizedNamespaceId)
        : undefined;
    } else {
      _storageSlot = storageSlot;
    }

    if (!_storageSlot) {
      setResult({ error: "Storage slot not entered." });
      return;
    }

    try {
      const normalizedStorageSlot = normalizeStorageSlot(_storageSlot);
      const res = await provider.getStorage(address, normalizedStorageSlot);

      setResult({
        value: res,
        storageSlot: normalizedStorageSlot,
      });
    } catch (e) {
      setResult({
        error: "Invalid storage slot entered",
      });
    }
  };

  useUpdateEffect(() => {
    setIsCollapsed(readAllCollapsed !== undefined ? readAllCollapsed : false);
  }, [readAllCollapsed]);

  return (
    <Box
      pt={2}
      mb={2}
      px={2}
      pb={isCollapsed ? 2 : 6}
      border="2px solid"
      borderColor="whiteAlpha.200"
      rounded="md"
      bg={"whiteAlpha.50"}
    >
      {/* Function name and refetch button */}
      <HStack flexWrap="wrap" rowGap={2}>
        <HStack
          minW={0}
          flex={{ base: "1 1 100%", sm: 1 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          cursor={"pointer"}
        >
          <HStack>
            <Box fontSize={"2xl"}>
              {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Box>
            <HStack alignItems={"flex-end"}>
              <Box fontSize={"md"} fontWeight={"normal"}>
                0.
              </Box>
              <Box fontWeight={"bold"}>Query Storage Slot</Box>
            </HStack>
          </HStack>
        </HStack>
        {/* Read/Write Buttons */}
        <HStack flex={{ base: "1 1 100%", sm: "0 0 auto" }} justify="flex-end">
          <Query query={query} />
        </HStack>
      </HStack>
      <Box px={{ base: 0, md: 4 }} display={isCollapsed ? "none" : undefined}>
        <TabsSelector
          tabs={["EIP-1967", "ERC-7201", "Custom"]}
          flexWrap="wrap"
          justify="center"
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
                <ERC7201Select
                  namespaceId={erc7201NamespaceId}
                  setNamespaceId={setErc7201NamespaceId}
                />
              );
            case 2:
              return (
                <StorageSlotInput
                  storageSlot={storageSlot}
                  setStorageSlot={setStorageSlot}
                />
              );
          }
        })()}
        {(result?.value || result?.error) && (
          <Box mt={4}>
            <CalldataParam
              value={result.error ?? result.value}
              chainId={chainId}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};
