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
  SimpleGrid,
} from "@chakra-ui/react";
import { NetworkSelect } from "@/components/NetworkSelect";
import { CustomChainModal } from "@/components/CustomChainModal";
import { FiGitBranch, FiUpload, FiDownload, FiArrowRight } from "react-icons/fi";
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
import { traceExamples } from "./examples";
import { getTraceExampleSnapshot, type TraceExampleSnapshot } from "./exampleSnapshots";
import { ExampleSnapshotContext } from "@/components/decodedParams/ExampleSnapshotContext";
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
type Result = { document: TraceDocument; source: string; sequence: number; snapshot?: TraceExampleSnapshot };

export default function TracerPage() {
  const query = useSearchParams().toString();
  const handledQuery = useRef<string | null>(null);
  const [chainId, setChainId] = useState(1);
  const [hash, setHash] = useState("");
  const [json, setJson] = useState("");
  const [inputTab, setInputTab] = useState(0);
  const [result, setResult] = useState<Result>();
  const [selection, setSelection] = useState<{
    call: TraceCall;
    rolledBack: boolean;
  }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rpcEditorOpen, setRpcEditorOpen] = useState(false);
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
    result?.snapshot?.abis,
    result?.snapshot?.entries
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
    (document: TraceDocument, source: string, sequence: number, snapshot?: TraceExampleSnapshot) => {
      setResult({ document, source, sequence, snapshot });
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
        let exampleInput: ReturnType<typeof parseTraceInput> | undefined;
        try { exampleInput = parseTraceInput(input, network); } catch { /* Saved explorers may not be loaded yet. */ }
        const snapshot = exampleInput && getTraceExampleSnapshot(exampleInput.hash, exampleInput.chainId);
        if (snapshot) {
          setChainId(snapshot.chainId);
          setHash(snapshot.hash);
          updateTraceUrl(snapshot.hash, snapshot.chainId);
          await new Promise((resolve) => setTimeout(resolve, 450));
          if (request.current === sequence)
            show(snapshot.document, "Example", sequence, snapshot);
          return;
        }
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
          <Box
            as="button"
            type="button"
            borderRadius="sm"
            _focusVisible={{ outline: "2px solid", outlineColor: "blue.300", outlineOffset: "4px" }}
            onClick={() => {
              clear();
              setHash("");
              setJson("");
              setChainId(1);
              setInputTab(0);
              setRpcEditorOpen(false);
              if (fileInput.current) fileInput.current.value = "";
              updateTraceUrl();
            }}
          >
            Transaction Tracer
          </Box>
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
        <Tabs isLazy index={inputTab} onChange={setInputTab}>
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
            <Flex align="center" justify="space-between" gap={3} wrap="wrap">
              <Text
                fontSize="sm"
                color="red.200"
                role="alert"
                overflowWrap="anywhere"
                flex={{ base: "1 1 100%", md: "1" }}
                minW={0}
              >
                {saved.error || error}
              </Text>
              {fallbackLinks.length > 0 && (
                <Flex gap={2} ml="auto" wrap="wrap">
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
            </Flex>
            {!saved.error && failedTrace && (
              <Flex justify="center" mt={3}>
                <Button
                  h="40px"
                  bg="primary.500"
                  color="white"
                  _hover={{ bg: "primary.600" }}
                  onClick={() => setRpcEditorOpen(true)}
                >
                  Use your custom RPC
                </Button>
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
      {!result && !loading && !error && inputTab === 0 && !hash.trim() && !json.trim() && (
        <Box as="section" aria-labelledby="trace-examples-heading" maxW="920px" mx="auto">
          <Text as="h2" id="trace-examples-heading" fontSize="20px" fontWeight="semibold" color="text.secondary" mb={3}>
            Try tracing these:
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            {traceExamples.map((example) => (
              <Box
                as="button"
                type="button"
                key={example.hash}
                aria-label={`Trace ${example.title}`}
                data-group=""
                display="flex"
                flexDirection="column"
                gap={3}
                minW={0}
                minH="124px"
                p={5}
                textAlign="left"
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="lg"
                cursor="pointer"
                _hover={{ bg: "whiteAlpha.100", borderColor: "blue.400" }}
                _active={{ bg: "whiteAlpha.200" }}
                _focusVisible={{ outline: "2px solid", outlineColor: "blue.400", outlineOffset: "2px" }}
                onClick={() => { void fetchTrace(example.hash, example.chainId); }}
              >
                <Box as="span" display="flex" flexDirection="column" gap={0}>
                  <Text as="span" fontSize="20px" lineHeight="24px" fontWeight="semibold" color="white">{example.title}</Text>
                  <Text as="span" fontSize="sm" lineHeight="20px" color="text.secondary">{example.detail}</Text>
                </Box>
                <Flex as="span" justify="space-between" align="center" gap={3} mt="auto">
                  <Text as="span" fontSize="xs" color="text.tertiary">Ethereum</Text>
                  <HStack as="span" spacing={1} color="blue.400" _groupHover={{ color: "blue.300" }} aria-hidden>
                    <Text as="span" fontSize="xs" fontWeight="medium">Trace</Text>
                    <Icon as={FiArrowRight} boxSize={3.5} />
                  </HStack>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
      <CustomChainModal
        isOpen={rpcEditorOpen}
        initialChainId={failedTrace?.chainId ?? chainId}
        onClose={() => setRpcEditorOpen(false)}
        onSaved={(chain) => {
          setRpcEditorOpen(false);
          setChainId(chain.id);
          void fetchTrace(hash, chain.id);
        }}
      />
      {loading && <TraceResultSkeleton />}
      {result && selection ? (
        <ExampleSnapshotContext.Provider key={result.sequence} value={result.snapshot ?? null}>
        <Box>
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
              defaultExpanded={!!result.snapshot}
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
        </ExampleSnapshotContext.Provider>
      ) : null}
    </Box>
  );
}
