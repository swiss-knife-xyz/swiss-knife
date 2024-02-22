"use client";

import { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { ethers } from "ethers";
import { Layout } from "@/components/Layout";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import networkInfo from "@/data/networkInfo";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { chainIdToChain } from "@/data/common";

const networkOptions: { label: string; value: number }[] = networkInfo.map(
  (n, i) => ({
    label: n.name,
    value: i, // index in the networkInfo array
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
const Result = ({
  result,
}: {
  result: {
    value?: string;
    storageSlot?: string;
    error?: string;
  };
}) => {
  const [selectedFormatOption, setSelectedFormatOption] =
    useState<SelectedOptionState>({
      label: formatOptions[0],
      value: formatOptions[0],
    });
  const [formattedResult, setFormattedResult] = useState<string>();

  useEffect(() => {
    if (result.value) {
      if (selectedFormatOption?.value === "hex") {
        setFormattedResult(result.value);
      } else {
        setFormattedResult(
          ethers.AbiCoder.defaultAbiCoder()
            .decode([selectedFormatOption!.value.toString()], result.value)[0]
            .toString()
        );
      }
    }
  }, [selectedFormatOption, result]);

  return (
    <Container mt={4} minW={"50%"}>
      <Box>
        {!result.error ? (
          <>
            <HStack>
              <Heading fontSize={"3xl"} color="whiteAlpha.800">
                Result
              </Heading>
              <DarkSelect
                boxProps={{
                  w: "10rem",
                }}
                isCreatable
                selectedOption={selectedFormatOption}
                setSelectedOption={setSelectedFormatOption}
                options={formatOptions.map((str) => ({
                  label: str,
                  value: str,
                }))}
              />
            </HStack>
            <HStack mt={4}>
              <Text color="whiteAlpha.700">Value:</Text>
              <Text mt={2}>{formattedResult}</Text>
            </HStack>

            <Box mt={2}>
              <Text color="whiteAlpha.700">At storage slot:</Text>
              <Text>{result.storageSlot}</Text>
            </Box>
          </>
        ) : (
          <Text>Error: {result.error}</Text>
        )}
      </Box>
    </Container>
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
      chainIdToChain[
        networkInfo[parseInt(selectedNetworkOption!.value.toString())].chainID
      ]?.rpcUrls.default.http[0]
    );
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
                />
              );
          }
        })()}
        <Query query={query} />
        {(result?.value || result?.error) && <Result result={result} />}
      </Box>
    </Layout>
  );
};

export default StorageSlots;
