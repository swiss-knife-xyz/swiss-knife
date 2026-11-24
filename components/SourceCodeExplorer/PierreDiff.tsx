"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, Text, Textarea } from "@chakra-ui/react";
import { FileDiff } from "@pierre/diffs/react";
import { getFiletypeFromFileName, parseDiffFromFile, preloadHighlighter, type FileContents } from "@pierre/diffs";
import { currentDiffLine } from "./diffNavigation";
import type { DiffFileData } from "./types";

export default function PierreDiff({ path, diff, diffStyle, showAllLines, onNavigate, diffLabels }: {
  diffLabels?: { old: string; new: string };
  path: string;
  diff: DiffFileData;
  diffStyle: "split" | "unified";
  showAllLines: boolean;
  onNavigate?(lineNumber: number): void;
}) {
  const previewOnly = diff.previewOnly || diff.oldCode.length + diff.newCode.length > 250_000;
  const files = useMemo(() => {
    // Explorer language detection also supports extensionless Solidity sources.
    const lang = /\.sol$/i.test(path) || /\bpragma\s+solidity\b/.test(diff.oldCode + diff.newCode)
      ? "solidity" as const : undefined;
    return {
      oldFile: diff.oldExists === false ? null : { name: path, contents: diff.oldCode, lang } satisfies FileContents,
      newFile: diff.newExists === false ? null : { name: path, contents: diff.newCode, lang } satisfies FileContents,
    };
  }, [path, diff]);
  const fileDiff = useMemo(() => {
    if (previewOnly) return null;
    if (files.oldFile === null && files.newFile === null) return null;
    if (files.oldFile === null) return parseDiffFromFile(null, files.newFile!);
    return parseDiffFromFile(files.oldFile, files.newFile);
  }, [files, previewOnly]);
  const language = fileDiff?.lang ?? getFiletypeFromFileName(path);
  const [highlighterState, setHighlighterState] = useState<{
    language: string;
    error?: string;
  } | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setHighlighterState(null);
    if (previewOnly) return;
    // Mount only after the theme and grammar are loaded. A cold FileDiff mount
    // can otherwise leave an empty body until an options change forces a render.
    preloadHighlighter({ themes: ["pierre-dark"], langs: [language] }).then(
      () => { if (!cancelled) setHighlighterState({ language }); },
      () => { if (!cancelled) setHighlighterState({ language, error: "Could not load the diff renderer." }); }
    );
    return () => { cancelled = true; };
  }, [language, loadAttempt, previewOnly]);

  const options = useMemo(() => ({
    theme: "pierre-dark",
    themeType: "dark" as const,
    diffStyle,
    lineDiffType: "word-alt" as const,
    overflow: "wrap" as const,
    disableFileHeader: true,
    expandUnchanged: showAllLines,
    ...(onNavigate && fileDiff ? {
      lineHoverHighlight: "both" as const,
      onLineClick: (event: import("@pierre/diffs").OnDiffLineClickProps) => onNavigate(currentDiffLine(fileDiff, event.lineNumber, event.annotationSide)),
      onLineNumberClick: (event: import("@pierre/diffs").OnDiffLineClickProps) => onNavigate(currentDiffLine(fileDiff, event.lineNumber, event.annotationSide)),
    } : {}),
  }), [diffStyle, showAllLines, onNavigate, fileDiff]);

  return (
    <Box h="100%" display="flex" flexDirection="column" minW={0}>
      <Grid templateColumns={diffStyle === "split" ? "1fr 1fr" : "1fr"}
        px={3} py={1.5} borderBottom="1px solid" borderColor="border.default" bg="bg.subtle" flexShrink={0}>
        {diffStyle === "split" ? <>
          <Text fontSize="xs" color="text.secondary">{diffLabels?.old ?? "Old source"} <Box as="span" color="red.400">−{diff.linesRemoved}</Box></Text>
          <Text fontSize="xs" color="text.secondary">{diffLabels?.new ?? "New source"} <Box as="span" color="green.400">+{diff.linesAdded}</Box></Text>
        </> : <Text fontSize="xs" color="text.secondary">{diffLabels?.old ?? "Old"} → {diffLabels?.new ?? "New"} <Box as="span" ml={2} color="green.400">+{diff.linesAdded}</Box> <Box as="span" color="red.400">−{diff.linesRemoved}</Box></Text>}
      </Grid>
      {diff.changesCount === 0 && <Text px={3} py={2} fontSize="sm" color="text.secondary" role="status">No differences in this file.</Text>}
      <Box flex={1} minW={0} w="full" overflowY="auto" overflowX="hidden" minH={0} fontSize="13px"
        sx={{ "diffs-container": { display: "block", width: "100%", minWidth: 0 } }}>
        {previewOnly ? <Box p={3}>
          <Text fontSize="xs" color="text.secondary" mb={2}>Large diff · source preview</Text>
          <Text fontSize="xs" mb={1}>{diffLabels?.old ?? "Old source"}</Text><Textarea aria-label="Original source" isReadOnly value={diff.oldCode} fontFamily="mono" fontSize="xs" h={48}/>
          <Text fontSize="xs" my={1}>{diffLabels?.new ?? "New source"}</Text><Textarea aria-label="Local source" isReadOnly value={diff.newCode} fontFamily="mono" fontSize="xs" h={48}/>
        </Box> : highlighterState?.language !== language ? (
          <Text p={4} color="text.secondary" role="status">Loading diff…</Text>
        ) : highlighterState.error ? (
          <Box p={4}>
            <Text color="text.secondary" role="alert">{highlighterState.error}</Text>
            <Button mt={2} size="sm" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</Button>
          </Box>
        ) : fileDiff ? <FileDiff fileDiff={fileDiff} options={options} /> : null}
      </Box>
    </Box>
  );
}
