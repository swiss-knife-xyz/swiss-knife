"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ChevronDown, ChevronRight, Download, FileCode2 } from "lucide-react";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { MOCK_ARTIFACTS } from "@/lib/mockTokens.generated";

const SourceCodeExplorer = dynamic(
  () =>
    import("@/components/SourceCodeExplorer").then(
      (module) => module.SourceCodeExplorer
    ),
  { ssr: false, loading: () => <Spinner size="sm" /> }
);

export function MockContractFiles({ standard }: { standard: string }) {
  const sectionRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [sources, setSources] = useState<Record<string, string>>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const artifact = MOCK_ARTIFACTS[standard as keyof typeof MOCK_ARTIFACTS];
  const abi = JSON.stringify(artifact.abi, null, 2);
  const abiFiles = useMemo(
    () => ({ [`${artifact.contractName}.abi.json`]: abi }),
    [artifact.contractName, abi]
  );

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView?.({
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || sources) return;
    const controller = new AbortController();
    setError(false);
    fetch("/mock-tokens-standard-input.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Source unavailable");
        return response.json();
      })
      .then((input: { sources: Record<string, { content: string }> }) => {
        setSources(
          Object.fromEntries(
            Object.entries(input.sources).map(([path, file]) => [
              path,
              file.content,
            ])
          )
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [open, sources, attempt]);

  async function downloadSource() {
    if (!sources) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const [path, content] of Object.entries(sources))
      zip.file(path, content);
    const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${artifact.contractName}-source.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box
      as="details"
      ref={sectionRef}
      scrollMarginTop="6rem"
      mt={5}
      borderBottomWidth="1px"
      borderColor="border.default"
      pb={3}
      onToggle={(event: React.SyntheticEvent<HTMLDetailsElement>) =>
        setOpen((event.currentTarget as HTMLDetailsElement).open)
      }
    >
      <HStack
        as="summary"
        cursor="pointer"
        fontSize="sm"
        color="text.secondary"
        py={1}
      >
        {open ? (
          <ChevronDown size={16} aria-hidden="true" />
        ) : (
          <ChevronRight size={16} aria-hidden="true" />
        )}
        <FileCode2 size={15} />
        <Text color="inherit">Contract files</Text>
      </HStack>
      {open && (
        <Stack spacing={3} pt={4} minW={0} minH="680px">
          <HStack flexWrap="wrap" gap={2}>
            <TabsSelector
              tabs={["Source Code", "ABI"]}
              selectedTabIndex={tab}
              setSelectedTabIndex={setTab}
              mt={0}
            />
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download size={14} />}
              onClick={downloadSource}
              isDisabled={!sources}
            >
              Download source
            </Button>
            <Button
              as="a"
              size="sm"
              variant="outline"
              leftIcon={<Download size={14} />}
              href={`data:application/json;charset=utf-8,${encodeURIComponent(abi)}`}
              download={`${artifact.contractName}.abi.json`}
            >
              Download ABI
            </Button>
            <Button
              as="a"
              size="sm"
              variant="outline"
              leftIcon={<Download size={14} />}
              href="/mock-tokens-standard-input.json"
              download
            >
              Download compiler JSON
            </Button>
          </HStack>
          {tab === 1 ? (
            <SourceCodeExplorer
              key={artifact.contractName}
              sourceCode={abiFiles}
              initialHeight={600}
              initialSidebarWidth={320}
            />
          ) : sources ? (
            <SourceCodeExplorer
              sourceCode={sources}
              initialHeight={600}
              initialSidebarWidth={320}
              targetFileName="contracts/mocks/MockTokens.sol"
              contractName={artifact.contractName}
            />
          ) : error ? (
            <HStack>
              <Text fontSize="sm" color="red.300">
                Could not load source code.
              </Text>
              <Button
                size="sm"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Retry
              </Button>
            </HStack>
          ) : (
            <HStack py={4}>
              <Spinner size="sm" />
              <Text fontSize="sm">Loading source code…</Text>
            </HStack>
          )}
        </Stack>
      )}
    </Box>
  );
}
