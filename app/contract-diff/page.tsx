"use client";
import { AddressBookButton } from "@/components/AddressBook/AddressBookButton";

import { getNetworkOptions } from "@/data/networks";
import { NetworkSelect } from "@/components/NetworkSelect";

import { ToolLoading } from "@/components/ToolLoading";
import { ComparisonSkeleton } from "./ComparisonSkeleton";

import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  Heading,
  Text,
  Button,
  useToast,
  Box,
  HStack,
  VStack,
  Icon,
  Image,
  Grid,
  GridItem,
  IconButton,
  Tooltip,
  Portal,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  FormControl,
  FormLabel,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { compareSourceFiles } from "@/lib/sourceDiff";
import {
  loadGithubComparison,
  parseGithubTreeUrl,
} from "@/lib/contractDiffGithub";
import { FiGitBranch, FiFile, FiGithub } from "react-icons/fi";
import { Maximize2, Minimize2, Settings } from "lucide-react";
import {
  etherscanChains,
  chainIdToChain,
  chainIdToImage,
} from "@/data/networks";
import { getSourceCodeWithMetadata } from "@/utils";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { SelectedOptionState } from "@/types";
import { base, mainnet } from "viem/chains";
import { SourceCodeExplorer } from "@/components/SourceCodeExplorer";
import { DiffFileData } from "@/components/SourceCodeExplorer/types";

const networkOptions = getNetworkOptions(Object.values(etherscanChains));

const getColoredOutput = (
  sourceCodes: Record<string, string>[]
): Record<string, DiffFileData> =>
  sourceCodes.length < 2
    ? {}
    : compareSourceFiles(sourceCodes[0], sourceCodes[1]);

type ComparisonInputs = {
  contractOld: string;
  contractNew: string;
  chainIdOld: number;
  chainIdNew: number;
  sourceOld: "contract" | "github";
  repository: string;
  revision: string;
  folder: string;
};

const examples: {
  title: string;
  inputs: ComparisonInputs;
}[] = [
  {
    title: "WETH",
    inputs: {
      contractOld: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      contractNew: "0x4200000000000000000000000000000000000006",
      chainIdOld: mainnet.id,
      chainIdNew: base.id,
      sourceOld: "contract",
      repository: "",
      revision: "",
      folder: "",
    },
  },
  {
    title: "Uniswap V4 PositionManager",
    inputs: {
      contractOld: "",
      contractNew: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e",
      chainIdOld: mainnet.id,
      chainIdNew: mainnet.id,
      sourceOld: "github",
      repository: "https://github.com/Uniswap/v4-periphery/tree/main/src",
      revision: "main",
      folder: "src",
    },
  },
];

function comparisonKey({
  contractOld,
  contractNew,
  chainIdOld,
  chainIdNew,
  sourceOld,
  repository,
  revision,
  folder,
}: ComparisonInputs) {
  return JSON.stringify([
    contractNew,
    chainIdNew,
    sourceOld,
    ...(sourceOld === "github"
      ? [repository, revision, folder]
      : [contractOld, chainIdOld]),
  ]);
}

function ContractDiffContent() {
  const searchParams = useSearchParams();
  const contractOldFromUrl = searchParams.get("contractOld");
  const contractNewFromUrl = searchParams.get("contractNew");
  const [
    {
      contractOld,
      contractNew,
      chainIdOld,
      chainIdNew,
      sourceOld,
      repository,
      revision,
      folder,
    },
    setComparison,
  ] = useQueryStates(
    {
      sourceOld: parseAsStringLiteral(["contract", "github"]).withDefault(
        "contract"
      ),
      repository: parseAsString.withDefault(""),
      revision: parseAsString.withDefault(""),
      folder: parseAsString.withDefault(""),
      contractOld: parseAsString.withDefault(""),
      contractNew: parseAsString.withDefault(""),
      chainIdOld: parseAsInteger.withDefault(mainnet.id),
      chainIdNew: parseAsInteger.withDefault(base.id),
    },
    { clearOnDefault: false }
  );

  // Derive select options directly from URL state (single source of truth)
  const selectedNetworkOldOption = useMemo<SelectedOptionState>(
    () => ({
      label: chainIdToChain[chainIdOld]?.name ?? "Unknown",
      value: chainIdOld,
      image: chainIdToImage[chainIdOld],
    }),
    [chainIdOld]
  );
  const selectedNetworkNewOption = useMemo<SelectedOptionState>(
    () => ({
      label: chainIdToChain[chainIdNew]?.name ?? "Unknown",
      value: chainIdNew,
      image: chainIdToImage[chainIdNew],
    }),
    [chainIdNew]
  );

  // Update URL state directly when user changes dropdown
  const handleNetworkOldChange = useCallback(
    (option: SelectedOptionState) => {
      if (option) setComparison({ chainIdOld: Number(option.value) });
    },
    [setComparison]
  );
  const handleNetworkNewChange = useCallback(
    (option: SelectedOptionState) => {
      if (option) setComparison({ chainIdNew: Number(option.value) });
    },
    [setComparison]
  );

  const toast = useToast();

  const [sourceCodes, setSourceCodes] = useState<Record<string, string>[]>([]);
  const [diffLabels, setDiffLabels] = useState<{ old: string; new: string }>();
  const [contractNames, setContractNames] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const [comparedInputs, setComparedInputs] = useState<string | null>(null);
  const currentInputs = comparisonKey({
    contractOld,
    contractNew,
    chainIdOld,
    chainIdNew,
    sourceOld,
    repository,
    revision,
    folder,
  });
  const resultsStale =
    comparedInputs !== null && comparedInputs !== currentInputs;

  useEffect(() => {
    const names =
      !resultsStale && contractNames.length === 2
        ? contractNames.map(
            (name, index) =>
              name.trim() || (index === 0 ? "Old contract" : "New contract")
          )
        : null;
    document.title = names
      ? `${names.join(" vs ")} - Contract Diff | ETH.sh`
      : "Contract Diff | ETH.sh";
    return () => {
      document.title = "Contract Diff | ETH.sh";
    };
  }, [contractNames, resultsStale]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sourceCodes.length !== 2) return;
    const frame = requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [sourceCodes]);

  // Escape key exits fullscreen; lock body scroll while fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const resetComparison = async () => {
    requestRef.current?.abort();
    setIsLoading(false);
    setSourceCodes([]);
    setDiffLabels(undefined);
    setContractNames([]);
    setComparedInputs(null);
    setError(null);
    setIsFullscreen(false);
    await setComparison(null);
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.hash
    );
  };

  const diffContracts = async (
    inputs: ComparisonInputs = {
      contractOld,
      contractNew,
      chainIdOld,
      chainIdNew,
      sourceOld,
      repository,
      revision,
      folder,
    }
  ) => {
    const {
      contractOld,
      contractNew,
      chainIdOld,
      chainIdNew,
      sourceOld,
      repository,
      revision,
      folder,
    } = inputs;
    if (isLoading) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      await setComparison({
        contractOld,
        contractNew,
        chainIdOld,
        chainIdNew,
        sourceOld,
        repository,
        revision,
        folder,
      });
      const fetchContract = async (chainId: number, address: string) => {
        const source = await getSourceCodeWithMetadata(chainId, address);
        if (
          !source ||
          Object.values(source.sourceCode).every((code) => !code.trim())
        )
          throw new Error(
            "Source code is unavailable. Check the contract address and network, and make sure the contract has verified source code."
          );
        return source;
      };
      if (sourceOld === "github") {
        const deployed = await fetchContract(chainIdNew, contractNew);
        const result = await loadGithubComparison(
          deployed.sourceCode,
          repository,
          revision,
          folder,
          controller.signal
        );
        controller.signal.throwIfAborted();
        // Persist the pinned revision before publishing results.
        await setComparison({
          revision: result.commit,
          folder: result.folder,
        });
        controller.signal.throwIfAborted();
        // Explorer and repository files may use different newline conventions.
        const normalize = (sources: Record<string, string>) =>
          Object.fromEntries(
            Object.entries(sources).map(([path, code]) => [
              path,
              code.replace(/\r\n?/g, "\n"),
            ])
          );
        setDiffLabels({ old: "GitHub", new: "Contract" });
        setSourceCodes([
          normalize(result.sources),
          normalize(deployed.sourceCode),
        ]);
        setContractNames([
          `${result.repository}@${result.commit.slice(0, 7)}`,
          deployed.contractName ?? "Onchain contract",
        ]);
        // Shared links always point to the exact commit that was compared.
        setComparedInputs(
          JSON.stringify([
            contractNew,
            chainIdNew,
            sourceOld,
            repository,
            result.commit,
            result.folder,
          ])
        );
      } else {
        const sources = await Promise.all([
          fetchContract(chainIdOld, contractOld),
          fetchContract(chainIdNew, contractNew),
        ]);
        controller.signal.throwIfAborted();
        setDiffLabels(undefined);
        setSourceCodes(sources.map((source) => source.sourceCode));
        setContractNames(sources.map((source) => source.contractName ?? ""));
        setComparedInputs(comparisonKey(inputs));
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const description =
        error instanceof Error
          ? error.message
          : "Could not load sources. Please try again.";
      setError(description);
      toast({
        title: "Could not compare sources",
        description,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  const contractsDiff = useMemo(
    () => getColoredOutput(sourceCodes),
    [sourceCodes]
  );

  // Include both versions so added and deleted files remain navigable.
  const explorerSourceCode = useMemo(() => {
    if (sourceCodes.length < 2) return undefined;
    return { ...sourceCodes[1], ...sourceCodes[0] };
  }, [sourceCodes]);

  // Auto-diff if all params are present in the URL
  const chainIdOldFromUrl = searchParams.get("chainIdOld");
  const chainIdNewFromUrl = searchParams.get("chainIdNew");
  useEffect(() => {
    if (
      contractNewFromUrl &&
      chainIdNewFromUrl &&
      (sourceOld === "github"
        ? repository && revision
        : contractOldFromUrl && chainIdOldFromUrl)
    ) {
      diffContracts();
    }
  }, []);

  return (
    <Layout maxW="container.2xl" minW={0} minH="calc(100dvh - 96px)" pb={12}>
      <Box w="full" minW={0}>
        {/* Page Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" spacing={3} mb={4}>
            <Icon as={FiGitBranch} color="blue.400" boxSize={8} />
            <Heading
              as="h1"
              size="xl"
              color="gray.100"
              fontWeight="bold"
              letterSpacing="tight"
            >
              <Button
                variant="unstyled"
                fontSize="inherit"
                fontWeight="inherit"
                h="auto"
                title="Clear comparison"
                onClick={resetComparison}
              >
                Contract Diff
              </Button>
            </Heading>
          </HStack>
          <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
            Compare verified contracts across networks, or compare an onchain
            contract with a GitHub commit.
          </Text>
        </Box>

        {/* Contract Inputs Section */}
        <Box w="full" maxW="1000px" mx="auto">
          <VStack
            as="fieldset"
            disabled={isLoading}
            border={0}
            p={0}
            m={0}
            minW={0}
            spacing={6}
            align="stretch"
          >
            {/* Input Grid */}
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              {/* Old source */}
              <GridItem>
                <Box
                  p={4}
                  bg="whiteAlpha.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  <VStack spacing={4} align="stretch">
                    <Tabs
                      isLazy
                      index={sourceOld === "github" ? 1 : 0}
                      onChange={(index) =>
                        setComparison({
                          sourceOld: index ? "github" : "contract",
                        })
                      }
                      size="sm"
                      colorScheme="blue"
                    >
                      <TabList h={9}>
                        <Tab gap={2}>
                          <Icon as={FiFile} />
                          Contract
                        </Tab>
                        <Tab gap={2}>
                          <Icon as={FiGithub} />
                          GitHub
                        </Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel px={0} pb={0} pt={4}>
                          <VStack spacing={4} align="stretch">
                            <HStack justify="space-between" w="full">
                              <Text fontSize="sm" color="text.secondary">Contract address</Text>
                              <AddressBookButton onSelect={(address) => setComparison({ contractOld: address })} />
                            </HStack>
                            <InputField
                              placeholder="Contract address"
                              aria-label="Old contract address"
                              value={contractOld}
                              onChange={(e) => {
                                setComparison({ contractOld: e.target.value });
                              }}
                            />
                            <NetworkSelect
                              boxProps={{
                                w: "100%",
                              }}
                              selectedOption={selectedNetworkOldOption}
                              setSelectedOption={handleNetworkOldChange}
                              options={networkOptions}
                            />
                          </VStack>
                        </TabPanel>
                        <TabPanel px={0} pb={0} pt={4}>
                          <VStack spacing={4} align="stretch">
                            <FormControl>
                              <HStack justify="space-between" minH={6} mb={2}>
                                <FormLabel
                                  fontSize="sm"
                                  htmlFor="diff-repository"
                                  mb={0}
                                >
                                  Repository
                                </FormLabel>
                                <Popover isLazy placement="bottom-end">
                                  <PopoverTrigger>
                                    <IconButton
                                      aria-label="Repository settings"
                                      icon={<Icon as={Settings} boxSize={4} />}
                                      variant="ghost"
                                      size="xs"
                                      color={
                                        folder ? "blue.300" : "text.secondary"
                                      }
                                      isDisabled={isLoading}
                                    />
                                  </PopoverTrigger>
                                  <Portal>
                                    <PopoverContent
                                      bg="bg.subtle"
                                      borderColor="border.default"
                                      w="300px"
                                      maxW="calc(100vw - 32px)"
                                    >
                                      <PopoverArrow bg="bg.subtle" />
                                      <PopoverBody p={3}>
                                        <FormControl>
                                          <FormLabel
                                            fontSize="sm"
                                            htmlFor="diff-folder"
                                          >
                                            Repository folder{" "}
                                            <Text
                                              as="span"
                                              color="text.tertiary"
                                            >
                                              (optional)
                                            </Text>
                                          </FormLabel>
                                          <InputField
                                            id="diff-folder"
                                            isDisabled={isLoading}
                                            placeholder="e.g. src or contracts"
                                            value={folder}
                                            onChange={(e) =>
                                              setComparison({
                                                folder: e.target.value,
                                              })
                                            }
                                          />
                                        </FormControl>
                                      </PopoverBody>
                                    </PopoverContent>
                                  </Portal>
                                </Popover>
                              </HStack>
                              <InputField
                                id="diff-repository"
                                placeholder="owner/repository or GitHub URL"
                                value={repository}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const parsed = parseGithubTreeUrl(value);
                                  setComparison({
                                    ...(parsed
                                      ? {
                                          revision: parsed.revision,
                                          folder: parsed.folder,
                                        }
                                      : {}),
                                    repository: value,
                                  });
                                }}
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="sm" htmlFor="diff-revision">
                                Commit, tag or branch
                              </FormLabel>
                              <InputField
                                id="diff-revision"
                                placeholder="HEAD"
                                value={revision}
                                onChange={(e) =>
                                  setComparison({ revision: e.target.value })
                                }
                              />
                            </FormControl>
                          </VStack>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </VStack>
                </Box>
              </GridItem>
              {/* New contract */}
              <GridItem>
                <Box
                  h={{ base: "auto", md: "full" }}
                  p={4}
                  bg="whiteAlpha.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                >
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={2} h={9}>
                      <Icon as={FiFile} color="blue.400" boxSize={5} />
                      <Text color="gray.300" fontWeight="medium" fontSize="md">
                        {sourceOld === "github"
                          ? "Onchain Contract"
                          : "New Contract"}
                      </Text>
                    </HStack>
                    <FormControl>
                      <HStack justify="space-between" mb={2}>
                        <FormLabel
                          htmlFor="diff-contract-new"
                          fontSize="sm"
                          mb={0}
                          display="flex"
                          alignItems="center"
                        >
                          Contract address
                        </FormLabel>
                        <AddressBookButton onSelect={(address) => setComparison({ contractNew: address })} />
                      </HStack>
                      <InputField
                        id="diff-contract-new"
                        aria-label="New contract address"
                        placeholder="Contract address"
                        value={contractNew}
                        onChange={(e) => {
                          setComparison({ contractNew: e.target.value });
                        }}
                      />
                    </FormControl>
                    <FormControl>
                      {sourceOld === "github" && (
                        <FormLabel fontSize="sm">Network</FormLabel>
                      )}
                      <NetworkSelect
                        boxProps={{
                          w: "100%",
                        }}
                        selectedOption={selectedNetworkNewOption}
                        setSelectedOption={handleNetworkNewChange}
                        options={networkOptions}
                      />
                    </FormControl>
                  </VStack>
                </Box>
              </GridItem>
            </Grid>

            {error && (
              <Alert
                status="error"
                bg="red.900"
                color="red.100"
                borderRadius="md"
              >
                <AlertIcon />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            )}
            {/* Diff Button */}
            <Box textAlign="center">
              <Button
                colorScheme="blue"
                size="lg"
                onClick={() => diffContracts()}
                isLoading={isLoading}
                leftIcon={<Icon as={FiGitBranch} boxSize={5} />}
              >
                {sourceOld === "github"
                  ? "Compare Sources"
                  : "Compare Contracts"}
              </Button>
            </Box>
            {!isLoading && sourceCodes.length !== 2 && (
              <Box w="full" maxW="720px" mx="auto">
                <Text fontSize="sm" color="text.secondary" mb={3}>
                  Examples
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                  {examples.map((example) => (
                    <Button
                      key={example.title}
                      variant="outline"
                      h="auto"
                      p={4}
                      whiteSpace="normal"
                      textAlign="left"
                      justifyContent="flex-start"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      isDisabled={isLoading}
                      onClick={() => diffContracts(example.inputs)}
                    >
                      <VStack align="start" spacing={3}>
                        <Text fontSize="sm" fontWeight="medium">
                          {example.title}
                        </Text>
                        <HStack
                          spacing={2}
                          fontSize="xs"
                          color="text.secondary"
                          fontWeight="normal"
                          flexWrap="wrap"
                        >
                          <HStack spacing={1.5}>
                            {example.inputs.sourceOld === "github" ? (
                              <Icon
                                as={FiGithub}
                                boxSize={4}
                                color="text.primary"
                              />
                            ) : (
                              <Image
                                src={chainIdToImage[example.inputs.chainIdOld]}
                                alt=""
                                boxSize={4}
                                objectFit="contain"
                              />
                            )}
                            <Text>
                              {example.inputs.sourceOld === "github"
                                ? "GitHub"
                                : chainIdToChain[example.inputs.chainIdOld]
                                    ?.name}
                            </Text>
                          </HStack>
                          <Text color="text.tertiary">vs</Text>
                          <HStack spacing={1.5}>
                            <Image
                              src={chainIdToImage[example.inputs.chainIdNew]}
                              alt=""
                              boxSize={4}
                              objectFit="contain"
                            />
                            <Text>
                              {chainIdToChain[example.inputs.chainIdNew]?.name}
                              {example.inputs.sourceOld === "github"
                                ? " contract"
                                : ""}
                            </Text>
                          </HStack>
                        </HStack>
                      </VStack>
                    </Button>
                  ))}
                </Grid>
              </Box>
            )}
          </VStack>
        </Box>

        {isLoading && <ComparisonSkeleton />}

        {/* Results Section - full width */}
        {!isLoading &&
          explorerSourceCode &&
          Object.keys(contractsDiff).length > 0 &&
          (() => {
            const resultsContent = (
              <Box
                ref={resultsRef}
                scrollMarginTop={4}
                mt={isFullscreen ? 0 : 6}
                border={isFullscreen ? "none" : "1px solid"}
                borderColor="whiteAlpha.200"
                borderRadius={isFullscreen ? 0 : "lg"}
                overflow="hidden"
                position={isFullscreen ? "fixed" : "relative"}
                inset={isFullscreen ? 0 : undefined}
                zIndex={isFullscreen ? 1400 : undefined}
                h={isFullscreen ? "100vh" : undefined}
                bg={isFullscreen ? "bg.900" : undefined}
                display="flex"
                flexDirection="column"
              >
                {resultsStale && (
                  <Text
                    px={3}
                    py={2}
                    fontSize="xs"
                    color="text.secondary"
                    bg="bg.muted"
                    role="status"
                  >
                    Inputs changed. Compare again to update these results.
                  </Text>
                )}
                {/* Fullscreen toolbar */}
                <HStack
                  px={3}
                  py={1}
                  borderBottom="1px solid"
                  borderColor="whiteAlpha.100"
                  bg="whiteAlpha.50"
                  justify="space-between"
                  flexShrink={0}
                >
                  <HStack spacing={3} minW={0}>
                    <Text fontSize="xs" color="text.secondary">
                      {Object.keys(contractsDiff).length}{" "}
                      {Object.keys(contractsDiff).length === 1
                        ? "file"
                        : "files"}{" "}
                      ·{" "}
                      {
                        Object.values(contractsDiff).filter(
                          (file) => file.changesCount > 0
                        ).length
                      }{" "}
                      changed
                    </Text>
                    <Text fontSize="xs" color="green.400">
                      +
                      {Object.values(contractsDiff).reduce(
                        (sum, file) => sum + file.linesAdded,
                        0
                      )}
                    </Text>
                    <Text fontSize="xs" color="red.400">
                      −
                      {Object.values(contractsDiff).reduce(
                        (sum, file) => sum + file.linesRemoved,
                        0
                      )}
                    </Text>
                  </HStack>
                  <Tooltip
                    label={
                      isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"
                    }
                    placement="bottom"
                    hasArrow
                  >
                    <IconButton
                      aria-label={
                        isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                      }
                      icon={
                        <Icon
                          as={isFullscreen ? Minimize2 : Maximize2}
                          boxSize={4}
                        />
                      }
                      size="sm"
                      variant="ghost"
                      color="text.tertiary"
                      _hover={{ color: "text.primary", bg: "whiteAlpha.200" }}
                      onClick={() => setIsFullscreen((prev) => !prev)}
                    />
                  </Tooltip>
                </HStack>
                <Box flex={1} minW={0} minH={0} overflow="hidden">
                  <SourceCodeExplorer
                    sourceCode={explorerSourceCode}
                    diffData={contractsDiff}
                    diffLabels={diffLabels}
                    initialHeight={700}
                    maxHeight="calc(100dvh - 96px)"
                    isFullscreen={isFullscreen}
                  />
                </Box>
              </Box>
            );
            return isFullscreen ? (
              <Portal>{resultsContent}</Portal>
            ) : (
              resultsContent
            );
          })()}
      </Box>
    </Layout>
  );
}

export default function ContractDiff() {
  return (
    <Suspense
      fallback={
        <ToolLoading
          title="Contract Diff"
          description="Compare verified contract sources across networks or against GitHub."
        />
      }
    >
      <ContractDiffContent />
    </Suspense>
  );
}
