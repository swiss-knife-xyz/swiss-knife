"use client";

import { waitForCustomChains, useCustomChains } from "@/lib/customChains/store";
import { NetworkSelect } from "@/components/NetworkSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  HStack,
  Image,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { formatUnits } from "viem";
import { getRpcUrlsForChain, getNetworkOptions, chainIdToImage } from "@/data/networks";
import type {
  GasCostChain,
  GasCostInput,
  GasCostResult,
} from "@/lib/gasCostEstimateRead";

export function GasCostEstimator({
  chains,
  loadEstimate,
}: {
  chains: readonly GasCostChain[];
  loadEstimate: (input: GasCostInput) => Promise<GasCostResult>;
}) {
  const savedChains = useCustomChains();
  const [hash, setHash] = useState("");
  const [sourceId, setSourceId] = useState(chains[0]?.id);
  const [targetId, setTargetId] = useState(
    chains.find((chain) => chain.id === 8453)?.id ??
      chains[1]?.id ??
      chains[0]?.id
  );
  const [result, setResult] = useState<GasCostResult>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  function invalidate() {
    requestId.current += 1;
    setResult(undefined);
    setError("");
    setLoading(false);
  }
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );

  const sourceRpcKey = getRpcUrlsForChain(sourceId ?? 0).join("|");
  const targetRpcKey = getRpcUrlsForChain(targetId ?? 0).join("|");
  useEffect(() => { invalidate(); }, [sourceRpcKey, targetRpcKey]);

  async function estimate(event: React.FormEvent) {
    event.preventDefault();
    const request = ++requestId.current;
    setResult(undefined);
    setError("");
    setLoading(true);
    try {
      await waitForCustomChains();
      if (request !== requestId.current) return;
      const source = chains.find((chain) => chain.id === sourceId);
      const target = chains.find((chain) => chain.id === targetId);
      if (!source || !target)
        throw new Error("Select a source and destination chain.");
      const next = await loadEstimate({ hash, source, target });
      if (request === requestId.current) setResult(next);
    } catch (error) {
      if (request === requestId.current)
        setError(
          error instanceof Error
            ? error.message
            : "Estimate unavailable. Try again."
        );
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }
  const options = useMemo(() => getNetworkOptions(chains).map(option => {
    const chain = chains.find(chain => chain.id === option.value)!;
    return { ...option, label: `${option.label} (${chain.nativeCurrency.symbol})${chain.testnet ? " · testnet" : ""}` };
  }), [chains, savedChains.revision]);
  return (
    <Box w="full" maxW="900px" mx="auto" p={{ base: 4, md: 6 }}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl">
          Cross-chain Gas Cost
        </Heading>
        <Text color="gray.400">
          Compare a transaction’s gas usage at another chain’s current gas
          price.
        </Text>
        <Box as="form" onSubmit={estimate}>
          <VStack spacing={4} align="stretch">
            <Stack direction={{ base: "column", md: "row" }} spacing={4}>
              <FormControl>
                <FormLabel>Source chain</FormLabel>
                <NetworkSelect
                  ariaLabel="Source chain"
                  options={options}
                  selectedOption={
                    options.find((option) => option.value === sourceId) ?? null
                  }
                  setSelectedOption={(option) => {
                    if (!option) return;
                    invalidate();
                    setSourceId(Number(option.value));
                  }}
                  boxProps={{ w: "full", minW: 0 }}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Destination chain</FormLabel>
                <NetworkSelect
                  ariaLabel="Destination chain"
                  options={options}
                  selectedOption={
                    options.find((option) => option.value === targetId) ?? null
                  }
                  setSelectedOption={(option) => {
                    if (!option) return;
                    invalidate();
                    setTargetId(Number(option.value));
                  }}
                  boxProps={{ w: "full", minW: 0 }}
                />
              </FormControl>
            </Stack>
            <FormControl>
              <FormLabel htmlFor="gas-hash">Transaction hash</FormLabel>
              <Input
                id="gas-hash"
                placeholder="0x or explorer link"
                value={hash}
                onChange={(event) => {
                  invalidate();
                  setHash(event.target.value);
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text").trim();
                  let transactionHash = /^0x[\da-f]{64}$/i.test(pasted) ? pasted : undefined;
                  if (!transactionHash) {
                    try {
                      const url = new URL(pasted.includes("://") ? pasted : `https://${pasted}`);
                      if (url.protocol === "https:" || url.protocol === "http:") {
                        transactionHash = url.pathname.match(/\/tx\/(0x[\da-f]{64})\/?$/i)?.[1];
                      }
                    } catch {
                      // Let ordinary pasted text follow the normal input validation.
                    }
                  }
                  if (transactionHash) {
                    event.preventDefault();
                    invalidate();
                    setHash(transactionHash);
                  }
                }}
                autoComplete="off"
                spellCheck={false}
              />
            </FormControl>
            <Button type="submit" colorScheme="blue" isLoading={loading}>
              Estimate gas cost
            </Button>
          </VStack>
        </Box>
        {error && (
          <Text role="alert" color="red.300">
            {error}
          </Text>
        )}
        {result && (
          <Box
            role="status"
            aria-live="polite"
            bg="whiteAlpha.50"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            rounded="lg"
            p={5}
            overflowWrap="anywhere"
          >
            <Text fontSize="sm" color="gray.400" mb={4}>
              Gas cost comparison
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={5}>
              <Box minW={0}>
                <Text fontSize="xs" color="gray.400" mb={2}>
                  Original gas cost
                </Text>
                <HStack spacing={2} mb={3}>
                  {chainIdToImage[result.source.id] && (
                    <Image
                      src={chainIdToImage[result.source.id]}
                      alt=""
                      boxSize={5}
                      rounded="full"
                    />
                  )}
                  <Text fontWeight="medium">{result.source.name}</Text>
                </HStack>
                <Text
                  fontSize={{ base: "xl", md: "2xl" }}
                  fontWeight="semibold"
                >
                  {result.sourceCost
                    ? `${result.sourceCost.nativeAmount} ${result.source.nativeCurrency.symbol}`
                    : "Unavailable"}
                </Text>
                {result.sourceCost && (
                  <Text color="gray.400" mt={1}>
                    {result.sourceCost.usd ?? "USD unavailable"}
                  </Text>
                )}
                {result.sourceGasPrice !== undefined && (
                  <Text fontSize="xs" color="gray.400" mt={2}>
                    {formatUnits(result.sourceGasPrice, 9)} gwei paid
                  </Text>
                )}
              </Box>
              <Box
                minW={0}
                borderLeftWidth={{ base: 0, sm: "1px" }}
                borderTopWidth={{ base: "1px", sm: 0 }}
                borderColor="whiteAlpha.200"
                pl={{ base: 0, sm: 5 }}
                pt={{ base: 4, sm: 0 }}
              >
                <Text fontSize="xs" color="gray.400" mb={2}>
                  Estimated gas cost
                </Text>
                <HStack spacing={2} mb={3}>
                  {chainIdToImage[result.target.id] && (
                    <Image
                      src={chainIdToImage[result.target.id]}
                      alt=""
                      boxSize={5}
                      rounded="full"
                    />
                  )}
                  <Text fontWeight="medium">{result.target.name}</Text>
                </HStack>
                <Text
                  fontSize={{ base: "xl", md: "2xl" }}
                  fontWeight="semibold"
                >
                  {result.nativeAmount} {result.target.nativeCurrency.symbol}
                </Text>
                <Text color="gray.400" mt={1}>
                  {result.usd ?? "USD unavailable"}
                </Text>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  {formatUnits(result.gasPrice, 9)} gwei now
                </Text>
              </Box>
            </SimpleGrid>
            <Box
              borderTopWidth="1px"
              borderColor="whiteAlpha.200"
              mt={5}
              pt={4}
            >
              {result.delta ? (
                <Box
                  color={
                    result.delta.direction === "saving"
                      ? "green.300"
                      : result.delta.direction === "extra"
                        ? "red.300"
                        : "gray.300"
                  }
                >
                  <Text color="inherit" fontSize="lg" fontWeight="semibold">
                    {result.delta.direction === "equal"
                      ? "Same gas cost"
                      : `${result.delta.direction === "saving" ? "Save" : "Pay extra"}${result.delta.percent ? ` ${result.delta.percent}%` : ""}`}
                  </Text>
                  {result.delta.direction !== "equal" && (
                    <Text color="inherit" mt={1}>
                      {result.delta.nativeAmount !== undefined
                        ? `${result.delta.nativeAmount} ${result.target.nativeCurrency.symbol}`
                        : result.delta.usd}
                      {result.delta.nativeAmount !== undefined &&
                      result.delta.usd
                        ? ` · ${result.delta.usd}`
                        : ""}
                      {result.delta.direction === "saving" ? " less" : " more"}{" "}
                      than the original gas cost
                    </Text>
                  )}
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.400">
                  {result.sourceCost
                    ? "USD prices needed to compare these tokens."
                    : "Original gas price unavailable for comparison."}
                </Text>
              )}
              <Text fontSize="xs" color="gray.400" mt={3}>
                {result.gasUsed.toString()} gas · Block{" "}
                {result.sourceBlock.toString()}
                {result.sourceStatus === "reverted" ? " · Reverted" : ""}
                {" · "}Updated{" "}
                {new Date(result.gasPriceReadAt).toLocaleTimeString()}
              </Text>
              {(result.usd || result.sourceCost?.usd) && (
                <Text fontSize="xs" color="gray.400" mt={1}>
                  USD values use current token prices.
                </Text>
              )}
            </Box>
          </Box>
        )}
        <Text fontSize="sm" color="gray.400">
          Uses the original gas usage without simulation. Extra L2 fees are
          excluded; L2 gas accounting may differ.
        </Text>
      </VStack>
    </Box>
  );
}
