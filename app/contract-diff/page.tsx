"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Select,
  Button,
  Collapse,
  Center,
  useToast,
  Box,
  HStack,
  Stack,
  Spacer,
} from "@chakra-ui/react";
import {
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "next-usequerystate";
import { diffLines } from "diff";
import { etherscanChains, chainIdToChain } from "@/data/common";
import { getSourceCode } from "@/utils";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { SolidityTextArea } from "@/components/SolidityTextArea";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { base, mainnet } from "viem/chains";
import { ChevronRightIcon } from "@chakra-ui/icons";
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

  return (
    <Center>
      {changesCount === 0 ? (
        <SolidityTextArea
          value={diffCode}
          readOnly={true}
          h="50rem"
          resize={"vertical"}
        />
      ) : (
        <Stack>
          <HStack fontSize={"sm"}>
            <Spacer />
            <Box pl={10}>
              <TabsSelector
                mt={0}
                tabs={ContractCodeOptions}
                selectedTabIndex={selectedTabIndex}
                setSelectedTabIndex={setSelectedTabIndex}
              />
            </Box>
            <Spacer />
            <CopyToClipboard
              textToCopy={
                selectedTabIndex === 0
                  ? oldCode
                  : selectedTabIndex === 1
                    ? diffCode
                    : newCode
              }
            />
          </HStack>
          <SolidityTextArea
            value={
              selectedTabIndex === 0
                ? oldCode
                : selectedTabIndex === 1
                  ? diffCode
                  : newCode
            }
            readOnly={true}
            h="50rem"
            resize={"vertical"}
          />
        </Stack>
      )}
    </Center>
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
      <Heading color={"custom.pale"}>Contract Diff</Heading>
      <Table mt={"3rem"} variant={"unstyled"} w="60rem">
        <Tbody>
          <Tr>
            <Label>Contract Old</Label>
            <Label>Contract New</Label>
          </Tr>
          <Tr>
            <Td>
              <InputField
                autoFocus
                placeholder="address"
                value={contractOld}
                onChange={(e) => {
                  setContractOld(e.target.value);
                }}
              />
            </Td>
            <Td>
              <InputField
                autoFocus
                placeholder="address"
                value={contractNew}
                onChange={(e) => {
                  setContractNew(e.target.value);
                }}
              />
            </Td>
          </Tr>
          <Tr>
            <Td>
              <DarkSelect
                boxProps={{
                  w: "100%",
                  mt: "2",
                }}
                selectedOption={selectedNetworkOldOption}
                setSelectedOption={setSelectedNetworkOldOption}
                options={networkOptions}
              />
            </Td>
            <Td>
              <DarkSelect
                boxProps={{
                  w: "100%",
                  mt: "2",
                }}
                selectedOption={selectedNetworkNewOption}
                setSelectedOption={setSelectedNetworkNewOption}
                options={networkOptions}
              />
            </Td>
          </Tr>
          <Tr>
            <Td colSpan={2}>
              <Center mt={2}>
                <Button onClick={diffContracts} isLoading={isLoading}>
                  {"Contract Diff"}
                </Button>
              </Center>
            </Td>
          </Tr>
          <Tr>
            <Td colSpan={2} maxWidth={1}>
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
                    <Box key={i} mt={4}>
                      <Button
                        mb={2}
                        w="full"
                        justifyContent="flex-start"
                        onClick={() =>
                          setIsOpen({ ...isOpen, [contract]: !isOpenCollapse })
                        }
                      >
                        <HStack>
                          <Box>
                            <HStack>
                              <ChevronRightIcon
                                sx={{
                                  transform: isOpenCollapse
                                    ? "rotate(90deg)"
                                    : "rotate(0deg)",
                                  transition: "transform 0.3s ease",
                                }}
                              />
                              <Box>{contract}</Box>
                            </HStack>
                          </Box>
                          <Box
                            color={
                              changesCount > 0 ? undefined : "whiteAlpha.600"
                            }
                            fontSize={changesCount > 0 ? "md" : "xs"}
                            fontWeight={changesCount > 0 ? "bold" : "normal"}
                          >
                            ({changesCount} changes)
                          </Box>
                        </HStack>
                      </Button>
                      <Collapse in={isOpenCollapse} animateOpacity>
                        <ContractCode
                          oldCode={oldCode}
                          diffCode={diffCode}
                          newCode={newCode}
                          changesCount={changesCount}
                        />
                      </Collapse>
                    </Box>
                  );
                }
              )}
            </Td>
          </Tr>
        </Tbody>
      </Table>
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
