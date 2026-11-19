"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import { traceInput, TRACE_EXAMPLE, type TraceResult } from "@/lib/trace/model";
import { TraceTree } from "./TraceTree";

export function TraceTool({
  initialHash = "",
  initialChain = "1",
}: {
  initialHash?: string;
  initialChain?: string;
}) {
  const [hash, setHash] = useState(initialHash);
  const [chain, setChain] = useState(initialChain);
  const [result, setResult] = useState<TraceResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const version = useRef(0);
  const active = useRef<AbortController | undefined>(undefined);
  useEffect(
    () => () => {
      version.current++;
      active.current?.abort();
    },
    []
  );
  const invalidate = () => {
    version.current++;
    active.current?.abort();
    setBusy(false);
    setResult(undefined);
    setError("");
    setCopied(false);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    invalidate();
    const current = version.current;
    try {
      const input = traceInput(chain, hash.trim());
      setBusy(true);
      const controller = new AbortController();
      active.current = controller;
      const response = await fetch(
        `/api/trace?chain=${input.chainId}&hash=${input.hash}`,
        {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(30_000),
          ]),
          cache: "no-store",
          credentials: "same-origin",
        }
      );
      const body = await response.json();
      if (version.current !== current) return;
      if (!response.ok)
        throw new Error(
          body.error
            ? `${body.error.code}: ${body.error.message}`
            : "Trace service is unavailable."
        );
      setResult(body);
    } catch (e) {
      if (version.current === current)
        setError(
          e instanceof Error
            ? e.name === "TimeoutError" || e.name === "AbortError"
              ? "TIMEOUT: Trace request timed out."
              : e.message.slice(0, 500)
            : "Trace service is unavailable."
        );
    } finally {
      if (version.current === current) setBusy(false);
    }
  };
  const share = async () => {
    if (!result) return;
    const url = new URL("/trace", window.location.origin);
    url.searchParams.set("chain", String(result.chainId));
    url.searchParams.set("hash", result.hash);
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
    } catch {
      setError("Unable to copy the link. Clipboard access is unavailable.");
    }
  };
  return (
    <VStack align="stretch" spacing={5} minW={0}>
      <Box>
        <HStack flexWrap="wrap">
          <Heading as="h1" size="lg">
            Transaction tracer
          </Heading>
          <Badge colorScheme="yellow">Experimental · Ethereum</Badge>
        </HStack>
        <Text mt={2} color="text.secondary">
          Inspect actual nested execution with Geth callTracer. No wallet,
          simulation or transaction broadcast.
        </Text>
      </Box>
      <Box
        as="form"
        onSubmit={submit}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        p={4}
      >
        <VStack align="stretch" spacing={3}>
          <FormControl>
            <FormLabel htmlFor="trace-chain">Chain</FormLabel>
            <Select
              id="trace-chain"
              value={chain}
              onChange={(event) => {
                invalidate();
                setChain(event.target.value);
              }}
            >
              <option value="1">
                Ethereum mainnet · experimental public RPC
              </option>
              {chain !== "1" && (
                <option value={chain}>Unsupported chain ({chain})</option>
              )}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="trace-hash">
              Confirmed transaction hash
            </FormLabel>
            <Input
              id="trace-hash"
              value={hash}
              onChange={(event) => {
                invalidate();
                setHash(event.target.value);
              }}
              placeholder="0x…"
              fontFamily="mono"
              autoComplete="off"
              spellCheck={false}
              maxLength={66}
            />
          </FormControl>
          <HStack flexWrap="wrap">
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={busy}
              loadingText="Tracing"
            >
              Trace transaction
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                invalidate();
                setHash(TRACE_EXAMPLE);
              }}
            >
              Use nested example
            </Button>
          </HStack>
          <Text fontSize="xs" color="text.tertiary">
            Only Ethereum is allowlisted. Your public hash is sent to this site
            and dRPC. Best-effort availability: dRPC documents tracing as
            paid-only; public access worked in our spot-check but may be
            withdrawn. No API key or account is used.
          </Text>
        </VStack>
      </Box>
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text overflowWrap="anywhere">{error}</Text>
        </Alert>
      )}
      {result && (
        <Box minW={0}>
          <HStack mb={2} justify="space-between" flexWrap="wrap">
            <Heading size="md">Executed call frames</Heading>
            <Button size="sm" variant="outline" onClick={share}>
              {copied ? "Link copied" : "Copy trace link"}
            </Button>
          </HStack>
          <Box
            fontSize="xs"
            color="text.secondary"
            mb={3}
            overflowWrap="anywhere"
          >
            <Text fontFamily="mono">Ethereum · {result.hash}</Text>
            <Text>
              Block {result.blockNumber} · transaction {result.status} ·{" "}
              {result.provider}
            </Text>
            <Text>
              {result.method} · fetched {result.fetchedAt}
            </Text>
            <Text fontFamily="mono">Block hash: {result.blockHash}</Text>
          </Box>
          <TraceTree
            key={`${result.hash}-${result.fetchedAt}`}
            root={result.root}
          />
        </Box>
      )}
      <Box fontSize="sm" color="text.secondary">
        <Text>
          Execution frames come from the provider’s replay, not inferred
          calldata, receipt logs or token-transfer lists. A failed internal call
          may be caught while the transaction succeeds. Returned calls inside a
          reverted ancestor are rolled back.
        </Text>
        <Text mt={2}>
          Limits: 512 frames, 32 nested levels, 1 MB per RPC response, 25-second
          server budget, no automatic retries. No opcode steps, storage diffs,
          verified ABIs or gas profiler. Selector names are local hints and can
          collide. Historical state can be pruned.
        </Text>
        <Link
          href="https://geth.ethereum.org/docs/developers/evm-tracing/built-in-tracers"
          isExternal
          color="blue.300"
        >
          callTracer documentation ↗
        </Link>
        {" · "}
        <Link
          href="https://drpc.org/docs/ethereum-api/debugandtrace/debug_traceTransaction"
          isExternal
          color="blue.300"
        >
          Provider method / access limits ↗
        </Link>
      </Box>
    </VStack>
  );
}
