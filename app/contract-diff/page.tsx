"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Heading,
  Text,
  Button,
  Collapse,
  useToast,
  Box,
  HStack,
  VStack,
  Icon,
  Badge,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "next-usequerystate";
import { diffLines } from "diff";
import { FiGitBranch, FiFile, FiChevronRight } from "react-icons/fi";
import { etherscanChains, chainIdToChain } from "@/data/common";
import { getSourceCode } from "@/utils";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { SolidityTextArea } from "@/components/SolidityTextArea";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { base, mainnet } from "viem/chains";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const networkOptions: { label: string; value: number }[] = Object.keys(
  etherscanChains
).map((k, i) => ({
  label: etherscanChains[k].name,
  value: etherscanChains[k].id,
}));

const WETH_MAINNET = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const WETH_BASE_MAINNET = "0x4200000000000000000000000000000000000006";

const getColoredOutput = (
  sourceCodes: Record<string, string>[]
): Record<
  string,
  { oldCode: string; diffCode: string; newCode: string; changesCount: number }
> => {
  if (sourceCodes.length < 2) return {};

  const contracts = Object.keys(sourceCodes[0]);
  return contracts
    .map((contract) => {
      const oldCode = sourceCodes[0][contract];
      const newCode = sourceCodes[1][contract] || "";

      const diff = diffLines(oldCode, newCode);

      // Mark lines with special characters that we can replace with CSS classes
      let diffCode = "";
      let changes = 0;

      diff.forEach((part) => {
        const lines = part.value.split("\n").filter((line) => line.length > 0);
        lines.forEach((line, idx) => {
          if (part.added) {
            diffCode += `+→${line}\n`;
            changes++;
          } else if (part.removed) {
            diffCode += `-→${line}\n`;
            changes++;
          } else {
            diffCode += `${line}\n`;
          }
        });
      });

      return {
        [contract]: {
          oldCode,
          diffCode,
          newCode,
          changesCount: changes,
        },
      };
    })
    .reduce((acc, obj) => ({ ...acc, ...obj }), {});
};

const ContractCodeOptions = ["Old", "Diff", "New"];

const ContractCode = ({
  oldCode,
  diffCode,
  newCode,
  changesCount,
}: {
  oldCode: string;
  diffCode: string;
  newCode: string;
  changesCount: number;
}) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(1); // default to diff

  const getCurrentCode = () => {
    if (selectedTabIndex === 0) return oldCode;
    if (selectedTabIndex === 1) return diffCode;
    return newCode;
  };

  return (
    <Box w="full">
      {changesCount === 0 ? (
        <SolidityTextArea
          value={diffCode}
          readOnly={true}
          h="50rem"
          resize={"vertical"}
        />
      ) : (
        <VStack spacing={3} align="stretch">
          <HStack justify="center" spacing={4}>
            <TabsSelector
              mt={0}
              tabs={ContractCodeOptions}
              selectedTabIndex={selectedTabIndex}
              setSelectedTabIndex={setSelectedTabIndex}
            />
            <CopyToClipboard textToCopy={getCurrentCode()} />
          </HStack>
          <SolidityTextArea
            value={getCurrentCode()}
            readOnly={true}
            h="50rem"
            resize={"vertical"}
          />
        </VStack>
      )}
    </Box>
  );
};

function ContractDiffContent() {
  const searchParams = useSearchParams();
  const contractOldFromUrl = searchParams.get("contractOld");
  const contractNewFromUrl = searchParams.get("contractNew");
  const chainIdOldFromUrl = searchParams.get("chainIdOld");
  const chainIdNewFromUrl = searchParams.get("chainIdNew");
  const [contractOld, setContractOld] = useQueryState<string>(
    "contractOld",
    parseAsString.withDefault(contractOldFromUrl || WETH_MAINNET)
  );
  const [contractNew, setContractNew] = useQueryState<string>(
    "contractNew",
    parseAsString.withDefault(contractNewFromUrl || WETH_BASE_MAINNET)
  );
  const [chainIdOld, setChainIdOld] = useQueryState<number>(
    "chainIdOld",
    parseAsInteger.withDefault(
      chainIdOldFromUrl ? parseInt(chainIdOldFromUrl) : mainnet.id
    )
  );
  const [chainIdNew, setChainIdNew] = useQueryState<number>(
    "chainIdNew",
    parseAsInteger.withDefault(
      chainIdNewFromUrl ? parseInt(chainIdNewFromUrl) : base.id
    )
  );

  const [selectedNetworkOldOption, setSelectedNetworkOldOption] =
    useState<SelectedOptionState>({
      label: chainIdToChain[chainIdOld].name,
      value: chainIdOld,
    });
  const [selectedNetworkNewOption, setSelectedNetworkNewOption] =
    useState<SelectedOptionState>({
      label: chainIdToChain[chainIdNew].name,
      value: chainIdNew,
    });

  const toast = useToast();

  const [sourceCodes, setSourceCodes] = useState<Record<string, string>[]>([]);
  const [isOpen, setIsOpen] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const contracts = [contractOld, contractNew];

  const diffContracts = async () => {
    setIsLoading(true);
    const sourceCodes = await Promise.all(
      [chainIdOld, chainIdNew].map((chainId, i) =>
        getSourceCode(chainId, contracts[i])
      )
    );
    // filter out undefined
    const validSourceCodes = sourceCodes.filter(
      (sourceCode): sourceCode is Record<string, string> =>
        sourceCode !== undefined
    );
    if (validSourceCodes.length === 2) {
      setSourceCodes(validSourceCodes);
    } else {
      toast({
        title: "Error",
        description: "Could not fetch source code",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  const contractsDiff = getColoredOutput(sourceCodes);

  useEffect(() => {
    if (
      contractOldFromUrl &&
      contractNewFromUrl &&
      chainIdOldFromUrl &&
      chainIdNewFromUrl
    ) {
      diffContracts();
    }
  }, []);

  // Set default contracts in the url
  useEffect(() => {
    if (!contractOldFromUrl && !contractNewFromUrl) {
      setContractOld(WETH_MAINNET);
      setContractNew(WETH_BASE_MAINNET);
    }
  }, []);

  useEffect(() => {
    if (selectedNetworkOldOption) {
      setChainIdOld(Number(selectedNetworkOldOption.value));
    }
  }, [selectedNetworkOldOption]);

  useEffect(() => {
    if (selectedNetworkNewOption) {
      setChainIdNew(Number(selectedNetworkNewOption.value));
    }
  }, [selectedNetworkNewOption]);

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
            <Icon as={FiGitBranch} color="blue.400" boxSize={8} />
            <Heading
              size="xl"
              color="gray.100"
              fontWeight="bold"
              letterSpacing="tight"
            >
              Contract Diff
            </Heading>
          </HStack>
          <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
            Compare source code between two verified contracts across any
            supported network.
          </Text>
        </Box>

        {/* Contract Inputs Section */}
        <Box w="full" maxW="1000px" mx="auto">
          <VStack spacing={6} align="stretch">
            {/* Input Grid */}
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              {/* Old Contract */}
              <GridItem>
                <Box
                  p={4}
                  bg="whiteAlpha.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={2}>
                      <Icon as={FiFile} color="blue.400" boxSize={5} />
                      <Text color="gray.300" fontWeight="medium" fontSize="md">
                        Old Contract
                      </Text>
                    </HStack>
                    <InputField
                      autoFocus
                      placeholder="Contract address"
                      value={contractOld}
                      onChange={(e) => {
                        setContractOld(e.target.value);
                      }}
                    />
                    <DarkSelect
                      boxProps={{
                        w: "100%",
                      }}
                      selectedOption={selectedNetworkOldOption}
                      setSelectedOption={setSelectedNetworkOldOption}
                      options={networkOptions}
                    />
                  </VStack>
                </Box>
              </GridItem>

              {/* New Contract */}
              <GridItem>
                <Box
                  p={4}
                  bg="whiteAlpha.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={2}>
                      <Icon as={FiFile} color="blue.400" boxSize={5} />
                      <Text color="gray.300" fontWeight="medium" fontSize="md">
                        New Contract
                      </Text>
                    </HStack>
                    <InputField
                      placeholder="Contract address"
                      value={contractNew}
                      onChange={(e) => {
                        setContractNew(e.target.value);
                      }}
                    />
                    <DarkSelect
                      boxProps={{
                        w: "100%",
                      }}
                      selectedOption={selectedNetworkNewOption}
                      setSelectedOption={setSelectedNetworkNewOption}
                      options={networkOptions}
                    />
                  </VStack>
                </Box>
              </GridItem>
            </Grid>

            {/* Diff Button */}
            <Box textAlign="center">
              <Button
                colorScheme="blue"
                size="lg"
                onClick={diffContracts}
                isLoading={isLoading}
                leftIcon={<Icon as={FiGitBranch} boxSize={5} />}
              >
                Compare Contracts
              </Button>
            </Box>

            {/* Results Section */}
            {Object.keys(contractsDiff).length > 0 && (
              <VStack spacing={3} align="stretch" mt={4}>
                <Text color="gray.400" fontSize="sm" fontWeight="medium">
                  {Object.keys(contractsDiff).length} file
                  {Object.keys(contractsDiff).length !== 1 ? "s" : ""} compared
                </Text>
                {Object.entries(contractsDiff).map(
                  (
                    [contract, { oldCode, diffCode, newCode, changesCount }],
                    i
                  ) => {
                    const isOpenCollapse =
                      isOpen[contract] === undefined
                        ? changesCount > 0
                        : isOpen[contract];

                    return (
                      <Box
                        key={i}
                        bg="whiteAlpha.50"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        overflow="hidden"
                      >
                        <HStack
                          p={4}
                          cursor="pointer"
                          _hover={{ bg: "whiteAlpha.100" }}
                          transition="background 0.2s"
                          onClick={() =>
                            setIsOpen({ ...isOpen, [contract]: !isOpenCollapse })
                          }
                        >
                          <Icon
                            as={FiChevronRight}
                            color="gray.400"
                            boxSize={5}
                            transform={
                              isOpenCollapse ? "rotate(90deg)" : "rotate(0deg)"
                            }
                            transition="transform 0.2s ease"
                          />
                          <Icon as={FiFile} color="gray.400" boxSize={4} />
                          <Text color="gray.200" fontWeight="medium">
                            {contract}
                          </Text>
                          <Badge
                            colorScheme={changesCount > 0 ? "orange" : "green"}
                            fontSize="xs"
                            px={2}
                            py={0.5}
                          >
                            {changesCount > 0
                              ? `${changesCount} changes`
                              : "No changes"}
                          </Badge>
                        </HStack>
                        <Collapse in={isOpenCollapse} animateOpacity>
                          <Box p={4} pt={0}>
                            <ContractCode
                              oldCode={oldCode}
                              diffCode={diffCode}
                              newCode={newCode}
                              changesCount={changesCount}
                            />
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  }
                )}
              </VStack>
            )}
          </VStack>
        </Box>
      </Box>
    </Layout>
  );
}

export default function ContractDiff() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContractDiffContent />
    </Suspense>
  );
}
