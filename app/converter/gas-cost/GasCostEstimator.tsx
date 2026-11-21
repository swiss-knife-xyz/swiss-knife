"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { formatUnits } from "viem";
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

  async function estimate(event: React.FormEvent) {
    event.preventDefault();
    const request = ++requestId.current;
    setResult(undefined);
    setError("");
    setLoading(true);
    try {
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
  const options = chains.map((chain) => (
    <option key={chain.id} value={chain.id}>
      {chain.name} ({chain.nativeCurrency.symbol})
      {chain.testnet ? " · testnet" : ""}
    </option>
  ));
  return (
    <Box w="full" maxW="900px" mx="auto" p={{ base: 4, md: 6 }}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl">
          Cross-chain Gas Cost
        </Heading>
        <Text color="gray.400">
          What would the same gas usage cost at another chain’s current gas
          price?
        </Text>
        <Box as="form" onSubmit={estimate}>
          <VStack spacing={4} align="stretch">
            <Stack direction={{ base: "column", md: "row" }} spacing={4}>
              <FormControl>
                <FormLabel htmlFor="gas-source">Source chain</FormLabel>
                <Select
                  id="gas-source"
                  value={sourceId}
                  onChange={(event) => {
                    invalidate();
                    setSourceId(Number(event.target.value));
                  }}
                >
                  {options}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="gas-target">Destination chain</FormLabel>
                <Select
                  id="gas-target"
                  value={targetId}
                  onChange={(event) => {
                    invalidate();
                    setTargetId(Number(event.target.value));
                  }}
                >
                  {options}
                </Select>
              </FormControl>
            </Stack>
            <FormControl>
              <FormLabel htmlFor="gas-hash">Transaction hash</FormLabel>
              <Input
                id="gas-hash"
                placeholder="0x… (mined transaction on source chain)"
                value={hash}
                onChange={(event) => {
                  invalidate();
                  setHash(event.target.value);
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
            <VStack align="stretch" spacing={3}>
              <Heading as="h2" size="md">
                Estimated gas-only cost on {result.target.name}
              </Heading>
              <Text fontSize="2xl" fontWeight="bold">
                {result.nativeAmount} {result.target.nativeCurrency.symbol}
              </Text>
              <Text>{result.usd ?? "USD unavailable"}</Text>
              <Text>
                {result.gasUsed.toString()} gas × {result.gasPrice.toString()}{" "}
                base units / gas
              </Text>
              <Text fontSize="sm">
                Gas price: {formatUnits(result.gasPrice, 9)} gwei (10⁹ base
                units). {result.target.nativeCurrency.symbol} uses{" "}
                {result.target.nativeCurrency.decimals} decimals.
              </Text>
              <Text fontSize="sm">
                Source: {result.source.name}, block{" "}
                {result.sourceBlock?.toString()}, status {result.sourceStatus}.
              </Text>
              <Text fontSize="sm">
                Gas price fetched{" "}
                {new Date(result.gasPriceReadAt).toISOString()}. Refresh with
                Estimate gas cost; prices change.
              </Text>
              <Text fontSize="sm" color="gray.400">
                USD is approximate, using the destination native asset’s
                CoinGecko price (updated within 15 minutes), not a historical
                exchange rate. Missing or unavailable feeds do not affect the
                native estimate.
              </Text>
            </VStack>
          </Box>
        )}
        <Box bg="whiteAlpha.50" rounded="lg" p={4}>
          <Text fontWeight="semibold" mb={2}>
            Estimate only — not an execution simulation.
          </Text>
          <Text fontSize="sm" color="gray.400">
            Assumes exactly the same gas used as the historical receipt.
            Contract availability, chain rules and state may differ; this does
            not predict success, gas usage or an executable transaction. Failed
            source transactions still consume gas.
          </Text>
          <Text fontSize="sm" color="gray.400" mt={2}>
            Not an all-in fee: L1 data, blob, sequencer and other chain-specific
            fees are not separately calculated. L2 receipts (especially
            Arbitrum) may already include data-related gas; reusing that gas on
            another chain can distort the comparison. Gas accounting and
            native-token units may differ across chains. No savings guarantee.
          </Text>
          <Text fontSize="sm" color="gray.400" mt={2}>
            Read-only. Only the selected RPCs and optional public price feed are
            queried after you submit. No wallet, signing, broadcasting or input
            storage.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
