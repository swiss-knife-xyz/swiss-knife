"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { diffLines } from "diff";
import {
  Box,
  Button,
  Checkbox,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Tooltip,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { History, RotateCcw, RefreshCw, Search, Filter } from "lucide-react";
import {
  listSourceRevisions,
  readSourceRevision,
  type SolidityFile,
  type SolidityWorkspace,
} from "@/lib/solidity/workspace";
import type { SourceRevision } from "@/lib/solidity/revisionHistory";
import type { DiffFileData } from "@/components/SourceCodeExplorer/types";
const PierreDiff = dynamic(
  () => import("@/components/SourceCodeExplorer/PierreDiff"),
  {
    ssr: false,
    loading: () => (
      <Text p={4} fontSize="sm" color="text.secondary">
        Loading diff…
      </Text>
    ),
  }
);
type Preview = {
  revision: SourceRevision & { content: string };
  expected: SolidityFile | null;
};
export function LocalHistory({
  request,
  workspace,
  disabled,
  warning,
  onClose,
  onRestore,
}: {
  request: { workspaceId: string; fileId?: string } | null;
  workspace: SolidityWorkspace | null;
  disabled: boolean;
  warning?: string;
  onClose(): void;
  onRestore(
    id: string,
    expected: SolidityFile | null,
    workspaceId: string
  ): Promise<void>;
}) {
  const [rows, setRows] = useState<SourceRevision[]>([]);
  const [selected, setSelected] = useState("");
  const [previewNonce, setPreviewNonce] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [visible, setVisible] = useState(100);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setPreview(null);
    setSelected("");
    setQuery("");
    setDeletedOnly(false);
    setVisible(100);
    listSourceRevisions(request.workspaceId)
      .then(
        (values) => {
          if (!cancelled) setRows(values);
        },
        () => {
          if (!cancelled) setError("Couldn't load local history.");
        }
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request, refresh]);
  useEffect(() => {
    if (!request || !selected) return;
    let cancelled = false;
    setPreview(null);
    setLoadingPreview(true);
    setError("");
    const expected =
      workspace?.files.find(
        (file) => file.id === rows.find((row) => row.id === selected)?.fileId
      ) ?? null;
    readSourceRevision(request.workspaceId, selected)
      .then(
        (revision) => {
          if (cancelled) return;
          if (!revision)
            setError("This revision is no longer available. Refresh history.");
          else setPreview({ revision, expected });
        },
        () => {
          if (!cancelled) setError("Couldn't load this revision.");
        }
      )
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
    // Snapshot the current file when selecting a revision; don't silently retarget a restore.
  }, [selected, request, rows, previewNonce]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!request?.fileId || row.fileId === request.fileId) &&
          (!deletedOnly ||
            !workspace?.files.some((file) => file.id === row.fileId)) &&
          row.path.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, request?.fileId, workspace?.files, deletedOnly, query]
  );
  const current = preview
    ? (workspace?.files.find((file) => file.id === preview.revision.fileId) ??
      null)
    : null;
  const stale =
    !!preview &&
    (preview.expected
      ? !current ||
        current.content !== preview.expected.content ||
        current.name !== preview.expected.name
      : !!current);
  const unchanged =
    !!preview?.expected &&
    preview.expected.content === preview.revision.content;
  const diff = useMemo<DiffFileData | null>(() => {
    if (!preview) return null;
    const oldCode = preview.expected?.content ?? "";
    const newCode = preview.revision.content;
    if (oldCode.length + newCode.length > 250_000) return null;
    const parts = diffLines(oldCode, newCode, {
      ignoreWhitespace: false,
      ...{ timeout: 100 },
    });
    if (!parts) return null;
    let linesAdded = 0;
    let linesRemoved = 0;
    for (const part of parts) {
      if (part.added) linesAdded += part.count ?? 0;
      if (part.removed) linesRemoved += part.count ?? 0;
    }
    return {
      oldCode,
      newCode,
      oldExists: !!preview.expected,
      newExists: true,
      diffCode: "",
      linesAdded,
      linesRemoved,
      changesCount: linesAdded + linesRemoved,
    };
  }, [preview]);
  const close = () => {
    if (!saving) onClose();
  };
  return (
    <Modal
      isOpen={!!request}
      onClose={close}
      size="6xl"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent bg="bg.muted" mx={3}>
        <ModalHeader pr={12}>
          <HStack spacing={2}>
            <History size={19} />
            <Text>Local history</Text>
          </HStack>
          <Text fontSize="sm" color="text.secondary" fontWeight="normal" mt={1}>
            {request?.fileId
              ? (workspace?.files.find((file) => file.id === request.fileId)
                  ?.name ?? "Deleted file")
              : "Workspace source revisions"}
          </Text>
        </ModalHeader>
        <ModalCloseButton isDisabled={saving} />
        <ModalBody
          px={0}
          py={0}
          borderTopWidth="1px"
          borderBottomWidth="1px"
          borderColor="border.default"
        >
          <Grid
            templateColumns={{ base: "1fr", md: "260px minmax(0,1fr)" }}
            h={{ base: "68vh", md: "min(620px, 65vh)" }}
            minH="300px"
            templateRows={{ base: "190px minmax(0,1fr)", md: "1fr" }}
          >
            <Box
              minH={0}
              overflowY="auto"
              borderRightWidth={{ base: 0, md: "1px" }}
              borderBottomWidth={{ base: "1px", md: 0 }}
              borderColor="border.default"
            >
              <VStack
                align="stretch"
                spacing={2}
                px={3}
                py={2.5}
                position="sticky"
                top={0}
                bg="bg.muted"
                borderBottomWidth="1px"
                borderColor="border.default"
                zIndex={1}
              >
                {!request?.fileId && (
                  <InputGroup size="sm">
                    <InputLeftElement
                      pointerEvents="none"
                      color="text.tertiary"
                    >
                      <Search size={14} />
                    </InputLeftElement>
                    <Input
                      aria-label="Filter files"
                      fontSize="xs"
                      placeholder="Filter files…"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setVisible(100);
                      }}
                    />
                  </InputGroup>
                )}
                <HStack justify="space-between" spacing={2} minH={6}>
                  {!request?.fileId ? (
                    <Checkbox
                      size="sm"
                      isChecked={deletedOnly}
                      sx={{
                        ".chakra-checkbox__label": {
                          fontSize: "12px",
                          lineHeight: "20px",
                        },
                      }}
                      onChange={(event) => setDeletedOnly(event.target.checked)}
                    >
                      <HStack as="span" spacing={1.5}>
                        <span>Deleted files</span>
                        <Filter size={12} aria-hidden="true" />
                      </HStack>
                    </Checkbox>
                  ) : (
                    <Text fontSize="xs" color="text.secondary">
                      Revisions
                    </Text>
                  )}
                  <Tooltip label="Refresh history" hasArrow>
                    <IconButton
                      aria-label="Refresh history"
                      icon={<RefreshCw size={14} />}
                      size="xs"
                      variant="ghost"
                      color="text.secondary"
                      isLoading={loading}
                      isDisabled={saving || loading}
                      onClick={() => setRefresh((value) => value + 1)}
                    />
                  </Tooltip>
                </HStack>
              </VStack>
              {loading ? (
                <Box p={4}>
                  <Spinner size="sm" />
                </Box>
              ) : !filtered.length ? (
                <Text p={4} fontSize="sm" color="text.secondary">
                  No revisions yet.
                </Text>
              ) : (
                filtered.slice(0, visible).map((row) => {
                  const file = workspace?.files.find(
                    (file) => file.id === row.fileId
                  );
                  return (
                    <Button
                      key={row.id}
                      aria-pressed={selected === row.id}
                      onClick={() => {
                        setSelected(row.id);
                        setPreviewNonce((value) => value + 1);
                      }}
                      variant="unstyled"
                      w="full"
                      h="auto"
                      borderRadius={0}
                      textAlign="left"
                      py={3}
                      px={4}
                      borderLeftWidth="2px"
                      borderColor={
                        selected === row.id ? "primary.400" : "transparent"
                      }
                      bg={
                        selected === row.id ? "whiteAlpha.100" : "transparent"
                      }
                      _hover={{ bg: "whiteAlpha.50" }}
                    >
                      <Text fontSize="sm" noOfLines={1}>
                        {file?.name ?? row.path}
                      </Text>
                      <Text
                        fontSize="xs"
                        color="text.secondary"
                        fontWeight="normal"
                        mt={1}
                      >
                        {new Date(row.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </Text>
                      <Text
                        fontSize="xs"
                        color="text.tertiary"
                        fontWeight="normal"
                        mt={1}
                      >
                        {row.reason}
                        {!file ? " · Deleted" : ""}
                      </Text>
                    </Button>
                  );
                })
              )}
              {filtered.length > visible && (
                <Button
                  m={3}
                  size="xs"
                  variant="ghost"
                  onClick={() => setVisible((value) => value + 100)}
                >
                  Show more
                </Button>
              )}
            </Box>
            <Box minW={0} minH={0} overflow="hidden">
              {loadingPreview ? (
                <Box p={5}>
                  <Spinner size="sm" />
                </Box>
              ) : preview && diff ? (
                <Box h="full" display="flex" flexDirection="column">
                  <HStack
                    px={4}
                    py={2}
                    borderBottomWidth="1px"
                    borderColor="border.default"
                    flexShrink={0}
                    justify="space-between"
                  >
                    <Text fontSize="xs" color="text.secondary">
                      Current → Selected revision
                    </Text>
                    <Text fontSize="xs" color="text.tertiary">
                      {preview.revision.bytes.toLocaleString()} B
                    </Text>
                  </HStack>
                  <Box flex={1} minH={0}>
                    <PierreDiff
                      path={current?.name ?? preview.revision.path}
                      diff={diff}
                      diffStyle="unified"
                      showAllLines={false}
                    />
                  </Box>
                </Box>
              ) : preview ? (
                <Box
                  h="full"
                  display="flex"
                  flexDirection="column"
                  p={3}
                  gap={2}
                >
                  <Text fontSize="xs" color="text.secondary">
                    Large file · selected revision source
                  </Text>
                  <Textarea
                    aria-label="Revision source"
                    isReadOnly
                    value={preview.revision.content}
                    flex={1}
                    minH={0}
                    fontFamily="mono"
                    fontSize="xs"
                    resize="none"
                  />
                </Box>
              ) : (
                <Text p={5} fontSize="sm" color="text.secondary">
                  Choose a revision to preview changes.
                </Text>
              )}
            </Box>
          </Grid>
        </ModalBody>
        <ModalFooter gap={3} flexWrap="wrap" justifyContent="space-between">
          <Box flex={1} minW={0}>
            <Text fontSize="xs" color="text.tertiary">
              Stored in this browser. 30 revisions per file · 25 MB per
              workspace.
            </Text>
            {(error || warning || stale) && (
              <Text role="alert" fontSize="sm" color="yellow.300" mt={1}>
                {error ||
                  warning ||
                  "The file changed after this preview. Select the revision again before restoring."}
              </Text>
            )}
          </Box>
          <HStack>
            <Button variant="ghost" onClick={close} isDisabled={saving}>
              Close
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<RotateCcw size={15} />}
              isLoading={saving}
              isDisabled={
                disabled || !preview || stale || unchanged || loadingPreview
              }
              onClick={async () => {
                if (!preview || !request || disabled || stale) return;
                setSaving(true);
                setError("");
                try {
                  await onRestore(
                    preview.revision.id,
                    preview.expected,
                    request.workspaceId
                  );
                  onClose();
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Couldn't restore the revision."
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              {preview && !preview.expected
                ? "Restore file"
                : "Restore revision"}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
