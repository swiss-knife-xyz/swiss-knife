"use client";

import { ToolLoading } from "@/components/ToolLoading";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  Heading,
  Text,
  Button,
  useToast,
  Box,
  HStack,
  VStack,
  Icon,
  Grid,
  GridItem,
  IconButton,
  Tooltip,
  Portal,
} from "@chakra-ui/react";
import {
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";
import { diffLines } from "diff";
import { FiGitBranch, FiFile } from "react-icons/fi";
import { Maximize2, Minimize2 } from "lucide-react";
import { etherscanChains, chainIdToChain, chainIdToImage } from "@/data/common";
import { getSourceCode } from "@/utils";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { base, mainnet } from "viem/chains";
import { SourceCodeExplorer } from "@/components/SourceCodeExplorer";
import { DiffFileData } from "@/components/SourceCodeExplorer/types";

const networkOptions: { label: string; value: number; image: string }[] =
  Object.keys(etherscanChains).map((k, i) => ({
    label: etherscanChains[k].name,
    value: etherscanChains[k].id,
    image: chainIdToImage[etherscanChains[k].id],
  }));

const WETH_MAINNET = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const WETH_BASE_MAINNET = "0x4200000000000000000000000000000000000006";

const getColoredOutput = (
  sourceCodes: Record<string, string>[]
): Record<string, DiffFileData> => {
  if (sourceCodes.length < 2) return {};

  const contracts = Array.from(new Set([...Object.keys(sourceCodes[0]), ...Object.keys(sourceCodes[1])]));
  return contracts
    .map((contract) => {
      const oldCode = sourceCodes[0][contract] ?? "";
      const newCode = sourceCodes[1][contract] ?? "";

      const diff = diffLines(oldCode, newCode);

      // Mark lines with special characters that we can replace with CSS classes
      let diffCode = "";
      let linesAdded = 0;
      let linesRemoved = 0;

      diff.forEach((part) => {
        const lines = part.value.split("\n");
        if (lines[lines.length - 1] === "") lines.pop();
        lines.forEach((line) => {
          if (part.added) {
            diffCode += `+→${line}\n`;
            linesAdded++;
          } else if (part.removed) {
            diffCode += `-→${line}\n`;
            linesRemoved++;
          } else {
            diffCode += `${line}\n`;
          }
        });
      });

      return {
        [contract]: {
          oldCode,
          oldExists: Object.hasOwn(sourceCodes[0], contract),
          newExists: Object.hasOwn(sourceCodes[1], contract),
          diffCode,
          newCode,
          changesCount: linesAdded + linesRemoved,
          linesAdded,
          linesRemoved,
        },
      };
    })
    .reduce((acc, obj) => ({ ...acc, ...obj }), {});
};

function ContractDiffContent() {
  const searchParams = useSearchParams();
  const contractOldFromUrl = searchParams.get("contractOld");
  const contractNewFromUrl = searchParams.get("contractNew");
  const [{ contractOld, contractNew, chainIdOld, chainIdNew }, setComparison] = useQueryStates(
    {
      contractOld: parseAsString.withDefault(WETH_MAINNET),
      contractNew: parseAsString.withDefault(WETH_BASE_MAINNET),
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

  const [comparedInputs, setComparedInputs] = useState<string | null>(null);
  const currentInputs = JSON.stringify([contractOld, contractNew, chainIdOld, chainIdNew]);
  const resultsStale = comparedInputs !== null && comparedInputs !== currentInputs;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sourceCodes.length !== 2) return;
    const frame = requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
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

  const contracts = [contractOld, contractNew];

  const diffContracts = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Persist all four values, even untouched example defaults, for sharing.
      await setComparison({ contractOld, contractNew, chainIdOld, chainIdNew });
      const fetchedSources = await Promise.all(
        [chainIdOld, chainIdNew].map((chainId, i) => getSourceCode(chainId, contracts[i]))
      );
      if (fetchedSources.some((source) => !source || Object.values(source).every((code) => !code.trim()))) {
        throw new Error("Source code is unavailable");
      }
      setSourceCodes(fetchedSources as Record<string, string>[]);
      setComparedInputs(currentInputs);
    } catch {
      toast({
        title: "Could not compare contracts",
        description: "Check the addresses and networks, and make sure both contracts have verified source code.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
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
      contractOldFromUrl &&
      contractNewFromUrl &&
      chainIdOldFromUrl &&
      chainIdNewFromUrl
    ) {
      diffContracts();
    }
  }, []);

  return (
    <Layout maxW="container.2xl" minW={0}>
      <Box
        p={{ base: 3, md: 5 }}
        bg="rgba(0, 0, 0, 0.05)"
        backdropFilter="blur(5px)"
        borderRadius="xl"
        border="1px solid"
        borderColor="whiteAlpha.50"
        maxW="container.2xl"
        mx="auto"
        w="full"
      >
        {/* Page Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" spacing={3} mb={4}>
            <Icon as={FiGitBranch} color="blue.400" boxSize={8} />
            <Heading as="h1"
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
                      aria-label="Old contract address"
                      placeholder="Contract address"
                      value={contractOld}
                      onChange={(e) => {
                        setComparison({ contractOld: e.target.value });
                      }}
                    />
                    <DarkSelect
                      boxProps={{
                        w: "100%",
                      }}
                      selectedOption={selectedNetworkOldOption}
                      setSelectedOption={handleNetworkOldChange}
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
                      aria-label="New contract address"
                      value={contractNew}
                      onChange={(e) => {
                        setComparison({ contractNew: e.target.value });
                      }}
                    />
                    <DarkSelect
                      boxProps={{
                        w: "100%",
                      }}
                      selectedOption={selectedNetworkNewOption}
                      setSelectedOption={handleNetworkNewChange}
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

          </VStack>
        </Box>

        {/* Results Section - full width */}
        {explorerSourceCode && Object.keys(contractsDiff).length > 0 && (() => {
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
              {resultsStale && <Text px={3} py={2} fontSize="xs" color="text.secondary" bg="bg.muted" role="status">Inputs changed. Compare again to update these results.</Text>}
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
                    {Object.keys(contractsDiff).length} {Object.keys(contractsDiff).length === 1 ? "file" : "files"} · {Object.values(contractsDiff).filter((file) => file.changesCount > 0).length} changed
                  </Text>
                  <Text fontSize="xs" color="green.400">+{Object.values(contractsDiff).reduce((sum, file) => sum + file.linesAdded, 0)}</Text>
                  <Text fontSize="xs" color="red.400">−{Object.values(contractsDiff).reduce((sum, file) => sum + file.linesRemoved, 0)}</Text>
                </HStack>
                <Tooltip label={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"} placement="bottom" hasArrow>
                  <IconButton
                    aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    icon={<Icon as={isFullscreen ? Minimize2 : Maximize2} boxSize={4} />}
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
                  initialHeight={700}
                  maxHeight="calc(100dvh - 96px)"
                  isFullscreen={isFullscreen}
                />
              </Box>
            </Box>
          );
          return isFullscreen ? <Portal>{resultsContent}</Portal> : resultsContent;
        })()}
      </Box>
    </Layout>
  );
}

export default function ContractDiff() {
  return (
    <Suspense fallback={<ToolLoading title="Contract Diff" description="Compare source code from two deployed smart contracts." />}>
      <ContractDiffContent />
    </Suspense>
  );
}
