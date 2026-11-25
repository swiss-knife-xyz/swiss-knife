"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  Icon,
} from "@chakra-ui/react";
import { NetworkSelect } from "@/components/NetworkSelect";
import { FiGitBranch, FiUpload, FiDownload } from "react-icons/fi";
import { parseTraceInput } from "@/lib/tracer/input";
import { parseTransactionExplorerUrl } from "@/lib/contractExplorerInput";
import { useCustomChains, waitForCustomChains } from "@/lib/customChains/store";
import {
  MAX_TRACE_BYTES,
  HASH,
  parseTraceJson,
  type TraceCall,
  type TraceDocument,
} from "@/lib/tracer/model";
import { fetchTransactionTrace } from "@/lib/tracer/fetch";
import { demoTrace, demoAbis } from "@/lib/tracer/demo";
import { getRpcUrlsForChain, getNetworkName } from "@/data/networks";
import { useTraceDecoding } from "@/components/tracer/useTraceDecoding";
import { TraceResultSkeleton } from "@/components/tracer/TraceResultSkeleton";
import { getTraceExplorerLinks } from "@/lib/tracer/links";

const TraceCallTree = dynamic(() =>
  import("@/components/tracer/TraceCallTree").then(
    (module) => module.TraceCallTree
  )
);
const TraceCallDetails = dynamic(
  () => import("@/components/tracer/TraceCallDetails")
);
type Result = { document: TraceDocument; source: string; sequence: number };

export default function TracerPage() {
  const query = useSearchParams().toString();
  const handledQuery = useRef<string | null>(null);
  const [chainId, setChainId] = useState(1);
  const [hash, setHash] = useState("");
  const [json, setJson] = useState("");
  const [result, setResult] = useState<Result>();
  const [selection, setSelection] = useState<{
    call: TraceCall;
    rolledBack: boolean;
  }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failedTrace, setFailedTrace] = useState<{
    chainId: number;
    hash: string;
  }>();
  const request = useRef(0);
  const mounted = useRef(false);
  const activeRpc = useRef<{ chainId: number; key: string } | null>(null);
  const inspector = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const saved = useCustomChains();
  const fallbackLinks =
    !saved.error && failedTrace
      ? getTraceExplorerLinks(failedTrace.chainId, failedTrace.hash)
      : [];
  const decoding = useTraceDecoding(
    result?.document,
    selection?.call,
    result?.source === "Demo" ? demoAbis : undefined
  );
  const rpcKey = getRpcUrlsForChain(chainId).join("\n");
  const clear = useCallback(() => {
    ++request.current;
    activeRpc.current = null;
    setLoading(false);
    setResult(undefined);
    setSelection(undefined);
    setError("");
    setFailedTrace(undefined);
  }, []);
  // A saved RPC replacement invalidates in-flight work and its decoding context.
  useEffect(() => {
    const active = activeRpc.current;
    if (
      active &&
      saved.ready &&
      active.key !== getRpcUrlsForChain(active.chainId).join("\n")
    )
      clear();
  }, [rpcKey, saved.revision, saved.ready, clear]);
  useEffect(() => {
    mounted.current = true;
    const cancelIfUnmounted = () => {
      if (!mounted.current) ++request.current;
    };
    return () => {
      mounted.current = false;
      // Strict Mode may reconnect this effect after a lazy tree mounts.
      queueMicrotask(cancelIfUnmounted);
    };
  }, []);
  const updateTraceUrl = useCallback((tx?: string, network?: number) => {
    const url = new URL(window.location.href);
    if (tx) url.searchParams.set("tx", tx);
    else url.searchParams.delete("tx");
    if (network) url.searchParams.set("chainId", String(network));
    else url.searchParams.delete("chainId");
    handledQuery.current = url.searchParams.toString();
    window.history.replaceState(null, "", url.toString());
  }, []);
  const show = useCallback(
    (document: TraceDocument, source: string, sequence: number) => {
      setResult({ document, source, sequence });
      setSelection({ call: document.call, rolledBack: !!document.call.error });
    },
    []
  );
  const fetchTrace = useCallback(
    async (input: string, network: number) => {
      clear();
      setHash(input.trim());
      const sequence = ++request.current;
      setLoading(true);
      let transaction: ReturnType<typeof parseTraceInput> | undefined;
      try {
        await waitForCustomChains();
        if (request.current !== sequence) return;
        const parsed = parseTraceInput(input, network);
        transaction = parsed;
        setChainId(parsed.chainId);
        setHash(parsed.hash);
        updateTraceUrl(parsed.hash, parsed.chainId);
        activeRpc.current = {
          chainId: parsed.chainId,
          key: getRpcUrlsForChain(parsed.chainId).join("\n"),
        };
        const document = await fetchTransactionTrace(
          parsed.chainId,
          parsed.hash
        );
        if (request.current === sequence)
          show(document, "RPC call trace", sequence);
      } catch (error) {
        if (request.current === sequence) {
          setFailedTrace(transaction);
          setError(
            error instanceof Error ? error.message : "Could not load trace."
          );
        }
      } finally {
        if (request.current === sequence) setLoading(false);
      }
    },
    [clear, show, updateTraceUrl]
  );
  useEffect(() => {
    if (handledQuery.current === query) return;
    handledQuery.current = query;
    const params = new URLSearchParams(query);
    const tx = params.get("tx") ?? "";
    const chain = params.get("chainId");
    const network = chain === null ? 1 : Number(chain);
    clear();
    setHash(tx);
    if (
      !Number.isSafeInteger(network) ||
      network <= 0 ||
      (chain !== null && !/^\d+$/.test(chain))
    ) {
      setError("Enter a valid chain ID in the URL.");
      return;
    }
    setChainId(network);
    if (tx) void fetchTrace(tx, network);
  }, [query, clear, fetchTrace]);
  function importJson(text: string) {
    clear();
    updateTraceUrl();
    try {
      const document = parseTraceJson(text);
      show(
        { ...document, chainId: document.chainId ?? chainId },
        "Imported call trace",
        request.current
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid trace JSON.");
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    clear();
    const sequence = request.current;
    try {
      if (file.size > MAX_TRACE_BYTES)
        throw new Error("Trace JSON must be smaller than 8 MiB.");
      const text = await file.text();
      if (request.current === sequence) importJson(text);
    } catch (error) {
      if (request.current === sequence)
        setError(
          error instanceof Error ? error.message : "Could not read file."
        );
    }
  }
  function exportJson() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result.document, null, 2)], {
        type: "application/json",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `trace-${result.document.transactionHash ?? "import"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Box minW={0} pb={8} maxW="1440px" mx="auto">
      <HStack justify="center" spacing={3} mb={6} mt={2}>
        <Icon as={FiGitBranch} color="orange.300" boxSize={7} />
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }}>
          Transaction Tracer
        </Heading>
      </HStack>
      <Box
        maxW="1040px"
        mx="auto"
        mb={result || loading ? 6 : 10}
        p={{ base: 4, md: 5 }}
        border="1px solid"
        borderColor="border.default"
        borderRadius="lg"
        bg="bg.subtle"
      >
        <Tabs isLazy>
          <Flex align="center" justify="space-between" gap={2} mb={4}>
            <TabList borderBottom="0">
              <Tab px={3} py={2} fontSize="sm">
                Transaction
              </Tab>
              <Tab px={3} py={2} fontSize="sm">
                Import JSON
              </Tab>
            </TabList>
            <HStack spacing={1}>
              <Button
                size="xs"
                variant="ghost"
                color="orange.300"
                onClick={() => {
                  clear();
                  updateTraceUrl();
                  show(demoTrace, "Demo", request.current);
                }}
              >
                Load demo
              </Button>
              {result && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    clear();
                    updateTraceUrl(undefined, chainId);
                  }}
                >
                  Clear
                </Button>
              )}
            </HStack>
          </Flex>
          <TabPanels>
            <TabPanel p={0}>
              <Box
                as="form"
                onSubmit={(event: React.FormEvent) => {
                  event.preventDefault();
                  void fetchTrace(hash, chainId);
                }}
                display="grid"
                gridTemplateColumns={{
                  base: "minmax(0,1fr)",
                  md: "minmax(0,1fr) 210px auto",
                }}
                gap={3}
                alignItems="end"
              >
                <FormControl minW={0}>
                  <FormLabel fontSize="xs" htmlFor="trace-hash">
                    Transaction hash or explorer URL
                  </FormLabel>
                  <Input
                    id="trace-hash"
                    value={hash}
                    onChange={(event) => {
                      clear();
                      setHash(event.target.value);
                      updateTraceUrl(
                        HASH.test(event.target.value.trim())
                          ? event.target.value.trim()
                          : undefined,
                        chainId
                      );
                    }}
                    onPaste={(event) => {
                      const pasted = event.clipboardData.getData("text").trim();
                      if (parseTransactionExplorerUrl(pasted)) {
                        event.preventDefault();
                        void fetchTrace(pasted, chainId);
                      }
                    }}
                    placeholder="0x.. or etherscan.io/tx/0x…"
                    fontFamily="mono"
                    fontSize="sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </FormControl>
                <FormControl minW={0}>
                  <FormLabel fontSize="xs">Network</FormLabel>
                  <NetworkSelect
                    ariaLabel="Trace network"
                    chainId={chainId}
                    onChange={(id) => {
                      clear();
                      setChainId(id);
                      updateTraceUrl(HASH.test(hash) ? hash : undefined, id);
                    }}
                  />
                </FormControl>
                <Button
                  type="submit"
                  h="40px"
                  bg="primary.500"
                  color="white"
                  _hover={{ bg: "primary.600" }}
                  isDisabled={loading || !hash.trim() || !!saved.error}
                >
                  {loading ? "Tracing…" : "Trace"}
                </Button>
              </Box>
            </TabPanel>
            <TabPanel p={0}>
              <FormControl>
                <FormLabel htmlFor="trace-json" fontSize="xs">
                  callTracer JSON
                </FormLabel>
                <Textarea
                  id="trace-json"
                  value={json}
                  onChange={(event) => setJson(event.target.value)}
                  rows={5}
                  fontFamily="mono"
                  fontSize="xs"
                  placeholder='{"type":"CALL", "from":"0x…", "calls": […]}'
                />
              </FormControl>
              <Flex
                mt={3}
                gap={3}
                align="center"
                justify="space-between"
                wrap="wrap"
              >
                <HStack>
                  <Button
                    size="sm"
                    bg="primary.500"
                    color="white"
                    _hover={{ bg: "primary.600" }}
                    isDisabled={!json.trim()}
                    onClick={() => importJson(json)}
                  >
                    Import
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<FiUpload />}
                    onClick={() => fileInput.current?.click()}
                  >
                    Open file
                  </Button>
                  <input
                    ref={fileInput}
                    aria-label="Trace JSON file"
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(event) => {
                      void importFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </HStack>
                <Box w="210px">
                  <NetworkSelect
                    ariaLabel="Import network"
                    chainId={chainId}
                    onChange={(id) => {
                      clear();
                      setChainId(id);
                      updateTraceUrl(undefined, id);
                    }}
                  />
                </Box>
              </Flex>
              <Text fontSize="xs" color="text.tertiary" mt={2}>
                Geth / Anvil · up to 8 MiB
              </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
        {(saved.error || error) && (
          <Box
            mt={4}
            p={3}
            bg="red.900"
            border="1px solid"
            borderColor="red.700"
            borderRadius="md"
          >
            <Text
              fontSize="sm"
              color="red.200"
              role="alert"
              overflowWrap="anywhere"
            >
              {saved.error || error}
            </Text>
            {fallbackLinks.length > 0 && (
              <Flex gap={2} mt={3} wrap="wrap">
                {fallbackLinks.map(({ name, href }) => (
                  <Button
                    key={name}
                    as="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    variant="outline"
                    rightIcon={<ExternalLinkIcon />}
                  >
                    Open in {name}
                  </Button>
                ))}
              </Flex>
            )}
          </Box>
        )}
        {loading && (
          <Flex justify="flex-end" mt={3}>
            <Button size="xs" variant="ghost" onClick={clear}>
              Cancel
            </Button>
          </Flex>
        )}
      </Box>
      {loading && <TraceResultSkeleton />}
      {result && selection ? (
        <Box key={result.sequence}>
          <Flex
            justify="space-between"
            align="center"
            gap={3}
            mb={3}
            wrap="wrap"
          >
            <Box minW={0}>
              <Text fontSize="sm" fontWeight="medium">
                {result.document.chainId
                  ? getNetworkName(result.document.chainId)
                  : result.source}
              </Text>
              {result.document.transactionHash && (
                <Text
                  fontSize="xs"
                  color="text.secondary"
                  fontFamily="mono"
                  overflowWrap="anywhere"
                >
                  {result.document.transactionHash}
                </Text>
              )}
            </Box>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FiDownload />}
              onClick={exportJson}
            >
              Export JSON
            </Button>
          </Flex>
          <Box
            display="grid"
            gridTemplateColumns={{
              base: "minmax(0, 1fr)",
              xl: "minmax(0, 1fr) 420px",
            }}
            gap={4}
            alignItems="start"
          >
            <TraceCallTree
              root={result.document.call}
              chainId={result.document.chainId}
              selectedId={selection.call.id}
              entries={decoding.entries}
              onVisibleCalls={decoding.enqueue}
              completed={decoding.completed}
              requested={decoding.requested}
              onSelect={(call, rolledBack) => {
                setSelection({ call, rolledBack });
                if (window.innerWidth < 1280)
                  inspector.current?.scrollIntoView({
                    behavior: "instant",
                    block: "start",
                  });
              }}
            />
            <Box
              ref={inspector}
              minW={0}
              position={{ xl: "sticky" }}
              top={4}
              scrollMarginTop={4}
            >
              <TraceCallDetails
                key={`${result.sequence}:${selection.call.id}`}
                call={selection.call}
                chainId={result.document.chainId}
                rolledBack={selection.rolledBack}
                entry={decoding.entries[selection.call.id]}
                onAbi={async (address, abi) => {
                  await decoding.setAbi(address, abi);
                  decoding.enqueue([selection.call], true);
                }}
              />
            </Box>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
