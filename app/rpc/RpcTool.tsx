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
  Select,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  parseRpcInput,
  RPC_CHAINS,
  RPC_EXAMPLES,
  RPC_LIMITS,
  RPC_METHODS,
  RPC_MESSAGES,
  RpcError,
} from "@/lib/rawRpc/model";
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
export function RpcTool() {
  const [chain, setChain] = useState("1");
  const [draft, setDraft] = useState(pretty(RPC_EXAMPLES["Chain ID"]));
  const [example, setExample] = useState("Chain ID");
  const [result, setResult] = useState("");
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
    setResult("");
    setError("");
    setCopied(false);
  };
  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    invalidate();
    const current = version.current;
    try {
      if (new TextEncoder().encode(draft).length > RPC_LIMITS.requestBytes)
        throw new RpcError("LIMIT");
      let raw: unknown;
      try {
        raw = JSON.parse(draft);
      } catch {
        throw new RpcError("INVALID");
      }
      const input = parseRpcInput({ chain, request: raw });
      if (
        new TextEncoder().encode(JSON.stringify(input)).length >
        RPC_LIMITS.requestBytes
      )
        throw new RpcError("LIMIT");
      const controller = new AbortController();
      active.current = controller;
      setBusy(true);
      const response = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15_000),
        ]),
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = await response.json();
      if (version.current !== current) return;
      if (!response.ok) {
        // Only known static service messages are displayed; never raw HTTP/provider errors.
        throw new RpcError(
          Object.hasOwn(RPC_MESSAGES, body?.error?.code)
            ? body.error.code
            : "UNAVAILABLE"
        );
      }
      setResult(pretty(body));
    } catch (e) {
      if (version.current === current)
        setError(
          e instanceof RpcError
            ? e.message
            : e instanceof Error &&
                ["AbortError", "TimeoutError"].includes(e.name)
              ? new RpcError("TIMEOUT").message
              : new RpcError("UNAVAILABLE").message
        );
    } finally {
      if (version.current === current) setBusy(false);
    }
  };
  const copy = async () => {
    const current = version.current;
    try {
      await navigator.clipboard.writeText(result);
      if (current === version.current) setCopied(true);
    } catch {
      if (current === version.current)
        setError(
          "Clipboard unavailable. Select and copy the response manually."
        );
    }
  };
  return (
    <VStack align="stretch" spacing={5} minW={0}>
      <Box>
        <HStack flexWrap="wrap">
          <Heading as="h1" size="lg">
            Raw RPC console
          </Heading>
          <Badge colorScheme="green">Read only · no wallet</Badge>
        </HStack>
        <Text mt={2} color="text.secondary">
          Inspect raw JSON-RPC results from fixed public chain providers. No
          signing, transaction submission, admin methods or state changes.
        </Text>
      </Box>
      <Box
        as="form"
        onSubmit={run}
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="lg"
        p={{ base: 3, md: 5 }}
        minW={0}
      >
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel htmlFor="rpc-chain">Chain</FormLabel>
            <Select
              id="rpc-chain"
              value={chain}
              onChange={(e) => {
                invalidate();
                setChain(e.target.value);
              }}
            >
              {RPC_CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.provider}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="rpc-example">Example</FormLabel>
            <Select
              id="rpc-example"
              value={example}
              onChange={(e) => {
                invalidate();
                setExample(e.target.value);
                setDraft(
                  pretty(
                    RPC_EXAMPLES[e.target.value as keyof typeof RPC_EXAMPLES]
                  )
                );
              }}
            >
              <option value="" disabled>
                Custom draft
              </option>
              {Object.keys(RPC_EXAMPLES).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="rpc-request">JSON-RPC request</FormLabel>
            <Textarea
              id="rpc-request"
              value={draft}
              onChange={(e) => {
                invalidate();
                setDraft(e.target.value);
                setExample("");
              }}
              rows={12}
              fontFamily="mono"
              fontSize="sm"
              spellCheck={false}
              autoComplete="off"
              aria-describedby="rpc-help"
              resize="vertical"
            />
          </FormControl>
          <Text id="rpc-help" fontSize="sm" color="text.secondary">
            JSON-RPC 2.0 object or batch of 1–10 reads. Include a unique
            string/integer id and params array for each request. Mixed or
            invalid batches are rejected in full before querying.
          </Text>
          <HStack flexWrap="wrap">
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={busy}
              loadingText="Reading"
              whiteSpace="normal"
              h="auto"
              minH="44px"
              py={2}
            >
              Run read query
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                invalidate();
              }}
            >
              Clear result / cancel
            </Button>
          </HStack>
          <Text fontSize="xs" color="text.tertiary">
            Queries are sent only when you run them, via this site to the
            selected public provider. Treat addresses and calldata as public; do
            not paste secrets. Drafts/results are memory-only, not added to URLs
            or browser storage. Providers and hosting may log requests. Public
            RPC availability and historical state vary.
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
          <HStack justify="space-between" flexWrap="wrap" mb={2}>
            <Heading as="h2" size="md">
              Response
            </Heading>
            <Button size="sm" onClick={copy}>
              {copied ? "Response copied" : "Copy response"}
            </Button>
          </HStack>
          <Text fontSize="sm" color="text.secondary" mb={2}>
            {RPC_CHAINS.find((c) => c.id === chain)?.name} ·{" "}
            {RPC_CHAINS.find((c) => c.id === chain)?.provider} · raw JSON-RPC
            result; quantities remain hexadecimal.
          </Text>
          <Box
            as="pre"
            tabIndex={0}
            aria-label="JSON-RPC response"
            p={4}
            bg="blackAlpha.400"
            borderRadius="md"
            maxH="600px"
            overflow="auto"
            fontSize="sm"
            whiteSpace="pre-wrap"
            overflowWrap="anywhere"
          >
            {result}
          </Box>
          <Text fontSize="xs" mt={2} color="text.tertiary">
            Provider error codes are preserved, but diagnostic messages/data are
            redacted. Batch responses may arrive out of order; match their IDs.
            Results are not a proof of chain state.
          </Text>
        </Box>
      )}
      <Box as="details" minW={0}>
        <Box as="summary" cursor="pointer" fontWeight="bold" py={2}>
          Allowed methods and parameter reference
        </Box>
        <Text mt={2} fontFamily="mono" fontSize="sm" overflowWrap="anywhere">
          {RPC_METHODS.join(" · ")}
        </Text>
        <VStack
          align="stretch"
          spacing={2}
          mt={3}
          fontSize="sm"
          color="text.secondary"
        >
          <Text>
            chainId, blockNumber, gasPrice, maxPriorityFeePerGas: [].
            getBalance, getTransactionCount, getCode: [address, block].
            getStorageAt: [address, storageSlot, block].
          </Text>
          <Text>
            getBlockByNumber: [block, fullTransactionsBoolean]. getBlockByHash:
            [blockHash, fullTransactionsBoolean]. getTransactionByHash /
            getTransactionReceipt / getBlockTransactionCountByHash: [hash].
            getBlockTransactionCountByNumber: [block]. Use the full eth_ method
            names above.
          </Text>
          <Text>
            eth_call: [&#123;to, from?, data?, gas?, value?&#125;, block].
            Simulated read only; no changes persist. Requires a destination; no
            contract creation, state/block overrides, access lists or other
            fields. Gas defaults to and is capped at 2,000,000; calldata at 8
            KiB. Even non-view calls cannot submit transactions here.
          </Text>
          <Text>
            Addresses/hashes must be exact 20/32-byte 0x hex, not ENS.
            Quantities/slots are canonical hex (0x0, 0x1; no leading zeros), up
            to uint256. Block is latest, earliest, pending, safe, finalized or a
            hex quantity. No EIP-1898 objects.
          </Text>
          <Text>
            Limits: 32 KiB request, 512 KiB per upstream response, 12-second
            total server budget; up to 2 concurrent / 30 starts per minute per
            server process. No retries, subscriptions, log scans, filters,
            tracing, custom endpoints or credentials. The server independently
            checks the allowlist and provider chain ID. A process-local gate is
            not a distributed abuse quota.
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
}
