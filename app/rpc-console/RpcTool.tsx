"use client";

import { getSavedCustomChain, waitForCustomChains, useCustomChains } from "@/lib/customChains/store";
import { readCustomRpc } from "@/lib/customChains/rpc";
import { NetworkSelect } from "@/components/NetworkSelect";
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
  SimpleGrid,
  Text,
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
import { DarkSelect } from "@/components/DarkSelect";
import { Editor } from "@monaco-editor/react";
const exampleOptions = Object.keys(RPC_EXAMPLES).map((name) => ({
  value: name,
  label: name,
}));
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
export function RpcTool() {
  const savedChains = useCustomChains();
  const [chain, setChain] = useState("1");
  const [draft, setDraft] = useState(pretty(RPC_EXAMPLES["Latest block"]));
  const [example, setExample] = useState("Latest block");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result) return;
    const frame = requestAnimationFrame(() => {
      responseRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [result]);
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
  useEffect(() => { invalidate(); }, [savedChains.revision]);
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
      await waitForCustomChains();
      if (version.current !== current) return;
      const customChain = getSavedCustomChain(Number(chain));
      const input = parseRpcInput({ chain, request: raw }, customChain ? [chain] : undefined);
      if (
        new TextEncoder().encode(JSON.stringify(input)).length >
        RPC_LIMITS.requestBytes
      )
        throw new RpcError("LIMIT");
      const controller = new AbortController();
      active.current = controller;
      setBusy(true);
      if (customChain) {
        const body = await readCustomRpc(customChain, input.request, AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]));
        if (version.current === current) setResult(pretty(body));
        return;
      }
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
          <Badge colorScheme="green">Read only</Badge>
        </HStack>
        <Text mt={2} color="text.secondary">
          Query blockchain data with JSON-RPC.
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
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Chain</FormLabel>
              <NetworkSelect
                ariaLabel="Chain"
                networks={RPC_CHAINS.map(chain => Number(chain.id))}
                chainId={Number(chain)}
                onChange={(chainId) => {
                  invalidate();
                  setChain(String(chainId));
                }}
                boxProps={{ w: "full", minW: 0 }}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Example</FormLabel>
              <DarkSelect
                ariaLabel="Example"
                placeholder="Custom request"
                options={exampleOptions}
                selectedOption={
                  exampleOptions.find((option) => option.value === example) ??
                  null
                }
                setSelectedOption={(option) => {
                  if (!option) return;
                  invalidate();
                  const name = String(
                    option.value
                  ) as keyof typeof RPC_EXAMPLES;
                  setExample(name);
                  setDraft(pretty(RPC_EXAMPLES[name]));
                }}
                boxProps={{ w: "full", minW: 0 }}
              />
            </FormControl>
          </SimpleGrid>
          <FormControl>
            <FormLabel htmlFor="rpc-request">JSON-RPC request</FormLabel>
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              overflow="hidden"
              minW={0}
            >
              <Editor
                theme="vs-dark"
                defaultLanguage="json"
                height="280px"
                value={draft}
                onChange={(value) => {
                  invalidate();
                  setDraft(value ?? "");
                  setExample("");
                }}
                onMount={(editor) => {
                  const input = editor.getDomNode()?.querySelector("textarea");
                  input?.setAttribute("id", "rpc-request");
                  input?.setAttribute("aria-describedby", "rpc-help");
                }}
                options={{
                  readOnly: false,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  fontSize: 13,
                  lineHeight: 20,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  folding: true,
                  lineNumbers: "on",
                  formatOnPaste: true,
                  padding: { top: 12, bottom: 12 },
                  ariaLabel: "JSON-RPC request",
                }}
              />
            </Box>
          </FormControl>
          <Text id="rpc-help" fontSize="sm" color="text.secondary">
            JSON-RPC 2.0. Up to 10 requests per batch.
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
              {busy ? "Cancel" : "Clear result"}
            </Button>
          </HStack>
        </VStack>
      </Box>
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text overflowWrap="anywhere">{error}</Text>
        </Alert>
      )}
      {result && (
        <Box ref={responseRef} minW={0} scrollMarginTop={6}>
          <HStack justify="space-between" flexWrap="wrap" mb={2}>
            <Heading as="h2" size="md">
              Response
            </Heading>
            <Button size="sm" onClick={copy}>
              {copied ? "Response copied" : "Copy response"}
            </Button>
          </HStack>
          <Text fontSize="sm" color="text.secondary" mb={2}>
            {getSavedCustomChain(Number(chain))?.name ?? RPC_CHAINS.find((c) => c.id === chain)?.name} ·{" "}
            {getSavedCustomChain(Number(chain)) ? "Custom RPC · direct browser connection" : RPC_CHAINS.find((c) => c.id === chain)?.provider}
          </Text>
          <Box
            role="region"
            aria-label="JSON-RPC response"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            overflow="hidden"
            minW={0}
          >
            <Editor
              theme="vs-dark"
              defaultLanguage="json"
              value={result}
              height={`${Math.min(600, Math.max(140, result.split("\n").length * 20 + 24))}px`}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                automaticLayout: true,
                fontSize: 13,
                lineHeight: 20,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                folding: true,
                lineNumbers: "on",
                padding: { top: 12, bottom: 12 },
                ariaLabel: "RPC JSON response editor",
              }}
            />
          </Box>
        </Box>
      )}
      <Box as="details" minW={0}>
        <Box as="summary" cursor="pointer" fontWeight="bold" py={2}>
          Supported methods
        </Box>
        <Text mt={2} fontFamily="mono" fontSize="sm" overflowWrap="anywhere">
          {RPC_METHODS.join(" · ")}
        </Text>
      </Box>
    </VStack>
  );
}
