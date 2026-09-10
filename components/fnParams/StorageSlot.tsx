import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Center,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Text,
  useUpdateEffect,
} from "@chakra-ui/react";
import { ethers } from "ethers";
import { SelectedOptionState } from "@/types";
import { chainIdToChain, networkOptions } from "@/data/common";
import { DarkSelect } from "../DarkSelect";
import TabsSelector from "../Tabs/TabsSelector";
import { CalldataParam } from "../decodedParams/CalldataParam";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import {
  EIP1967Options,
  getEIP1967StorageSlot,
  getERC7201StorageSlot,
  normalizeStorageSlot,
} from "@/lib/storageSlots";

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
    <Container mt={10}>
      <FormControl>
        <FormLabel>Namespace ID</FormLabel>
        <Input
          autoComplete="off"
          value={namespaceId}
          onChange={(e) => setNamespaceId(e.target.value)}
          bg={"blackAlpha.300"}
          placeholder="example.main"
        />
      </FormControl>
      <Center mt={6}>
        <HStack fontWeight={"bold"} flexWrap="wrap" justify="center">
          <Txt colorScheme="red" str={`keccak256(`} />
          <Txt colorScheme="blue" str={`abi.encode(`} />
          <Txt colorScheme="pink" str={`uint256(`} />
          <Txt colorScheme="red" str={`keccak256(`} />
          <Txt
            colorScheme="green"
            str={`'${normalizedNamespaceId || "namespace.id"}'`}
          />
          <Txt colorScheme="red" str={`)`} />
          <Txt colorScheme="pink" str={`) - 1`} />
          <Txt colorScheme="blue" str={`)`} />
          <Txt colorScheme="red" str={`)`} />
          <Txt colorScheme="orange" str={`& ~0xff`} />
        </HStack>
      </Center>
      {storageSlot && (
        <Text mt={4} fontFamily="mono" fontSize="sm" wordBreak="break-all">
          {storageSlot}
        </Text>
      )}
    </Container>
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
    <Container mt={10}>
      <FormControl>
        <FormLabel>Enter storage slot:</FormLabel>
        <Input
          autoComplete="off"
          value={storageSlot}
          onChange={(e) => {
            setStorageSlot(e.target.value);
          }}
          bg={"blackAlpha.300"}
          placeholder="123 or 0xabc123..."
        />
      </FormControl>
    </Container>
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
      <HStack>
        <HStack
          flexGrow={1}
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
        <Query query={query} />
      </HStack>
      <Box px={4} display={isCollapsed ? "none" : undefined}>
        <TabsSelector
          tabs={["EIP-1967", "ERC-7201", "Custom"]}
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
