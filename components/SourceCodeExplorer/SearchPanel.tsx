"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Button,
  Collapse,
  Icon,
  Tooltip,
} from "@chakra-ui/react";
import { CloseIcon, ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import {
  Search,
  CaseSensitive,
  Regex,
  FileText,
  ReplaceAll,
} from "lucide-react";
import { SiSolidity } from "react-icons/si";
import { searchAllFiles, getTotalMatchCount, searchExpression } from "./search";
import { SearchResult, SearchMatch, SearchOptions } from "./types";

export interface SearchDraft {
  query: string;
  options: SearchOptions;
  replacement: string;
  replacing: boolean;
}
interface SearchPanelProps {
  initialDraft?: SearchDraft;
  onDraftChange?: (draft: SearchDraft) => void;
  replacement?: {
    writablePaths: ReadonlySet<string>;
    disabled: boolean;
    onPreview: (
      query: string,
      replacement: string,
      options: SearchOptions,
      path?: string
    ) => void;
  };
  sourceCode: Record<string, string>;
  onResultClick: (path: string, content: string, lineNumber: number) => void;
  isOpen: boolean;
  showHeader?: boolean;
  onCloseSearch?: () => void;
  onSearchQueryChange?: (query: string, options: SearchOptions) => void;
}

// Debounce hook
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Highlighted text component
function HighlightedLine({
  content,
  matchStart,
  matchEnd,
}: {
  content: string;
  matchStart: number;
  matchEnd: number;
}) {
  const before = content.slice(0, matchStart);
  const match = content.slice(matchStart, matchEnd);
  const after = content.slice(matchEnd);

  // Truncate long lines intelligently around the match
  const maxLength = 60;
  let displayBefore = before;
  let displayAfter = after;

  if (before.length + match.length + after.length > maxLength) {
    const availableSpace = maxLength - match.length;
    const beforeSpace = Math.min(before.length, Math.floor(availableSpace / 2));
    const afterSpace = availableSpace - beforeSpace;

    if (before.length > beforeSpace) {
      displayBefore = "..." + before.slice(-beforeSpace);
    }
    if (after.length > afterSpace) {
      displayAfter = after.slice(0, afterSpace) + "...";
    }
  }

  return (
    <Text fontSize="xs" color="text.tertiary" opacity={0.75} isTruncated>
      <Text as="span">{displayBefore}</Text>
      <Text
        as="span"
        bg="yellow.600"
        color="black"
        px={0.5}
        borderRadius="sm"
        opacity={1}
      >
        {match}
      </Text>
      <Text as="span">{displayAfter}</Text>
    </Text>
  );
}

// Single file result with collapsible matches
function FileResult({
  result,
  sourceCode,
  onMatchClick,
  defaultOpen = true,
  onReplace,
}: {
  result: SearchResult;
  sourceCode: Record<string, string>;
  onMatchClick: (path: string, content: string, lineNumber: number) => void;
  defaultOpen?: boolean;
  onReplace?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [visibleMatches, setVisibleMatches] = useState(20);
  const isSolidity = result.fileName.endsWith(".sol");

  return (
    <Box>
      <HStack
        spacing={1}
        py={1}
        px={2}
        cursor="pointer"
        _hover={{ bg: "whiteAlpha.100" }}
        onClick={() => setIsOpen(!isOpen)}
        userSelect="none"
        title={result.filePath}
      >
        <Icon
          as={isOpen ? ChevronDownIcon : ChevronRightIcon}
          boxSize={3}
          color="text.tertiary"
        />
        <Icon
          as={isSolidity ? SiSolidity : FileText}
          boxSize={3}
          color={isSolidity ? "blue.400" : "text.tertiary"}
        />
        <Text fontSize="xs" color="text.primary" flex={1} isTruncated>
          {result.fileName}
        </Text>
        {onReplace && (
          <IconButton
            aria-label={`Replace in ${result.filePath}`}
            title="Replace in file"
            icon={<ReplaceAll size={13} />}
            size="xs"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onReplace();
            }}
          />
        )}
        <Text
          fontSize="xs"
          color="text.tertiary"
          bg="whiteAlpha.100"
          px={1.5}
          borderRadius="full"
        >
          {result.matches.length}
        </Text>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <VStack spacing={0} align="stretch" pl={3}>
          {result.matches.slice(0, visibleMatches).map((match, idx) => (
            <HStack
              key={`${match.lineNumber}-${idx}`}
              spacing={1.5}
              py={0.5}
              px={1}
              cursor="pointer"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() =>
                onMatchClick(
                  result.filePath,
                  sourceCode[result.filePath],
                  match.lineNumber
                )
              }
            >
              <Text
                fontSize="9px"
                color="text.tertiary"
                minW="24px"
                textAlign="right"
                opacity={0.6}
              >
                L{match.lineNumber}
              </Text>
              <Box flex={1} overflow="hidden">
                <HighlightedLine
                  content={match.lineContent}
                  matchStart={match.matchStart}
                  matchEnd={match.matchEnd}
                />
              </Box>
            </HStack>
          ))}
          {result.matches.length > visibleMatches && (
            <Button
              size="xs"
              variant="ghost"
              justifyContent="start"
              fontWeight="normal"
              onClick={() => setVisibleMatches((value) => value + 20)}
            >
              Show more ({result.matches.length - visibleMatches})
            </Button>
          )}
        </VStack>
      </Collapse>
    </Box>
  );
}

export function SearchPanel({
  sourceCode,
  onResultClick,
  isOpen,
  showHeader = true,
  onCloseSearch,
  onSearchQueryChange,
  initialDraft,
  onDraftChange,
  replacement,
}: SearchPanelProps) {
  const [query, setQuery] = useState(initialDraft?.query ?? "");
  const [options, setOptions] = useState<SearchOptions>(
    initialDraft?.options ?? {
      caseSensitive: false,
      regex: false,
    }
  );
  const [replaceText, setReplaceText] = useState(
    initialDraft?.replacement ?? ""
  );
  const [replacing, setReplacing] = useState(initialDraft?.replacing ?? false);
  useEffect(() => {
    onDraftChange?.({ query, options, replacement: replaceText, replacing });
  }, [query, options, replaceText, replacing, onDraftChange]);
  useEffect(() => {
    if (initialDraft?.replacing) setReplacing(true);
  }, [initialDraft?.replacing]);
  let regexError = "";
  try {
    if (query) searchExpression(query, options);
  } catch {
    regexError = "Invalid regular expression";
  }
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query, 200);
  const debouncedSources = useDebouncedValue(sourceCode, 200);

  // Compute search results
  const results = useMemo(() => {
    if (!isOpen || !debouncedQuery || !debouncedSources) return [];
    return searchAllFiles(debouncedSources, debouncedQuery, options);
  }, [isOpen, debouncedSources, debouncedQuery, options]);

  const totalMatches = useMemo(() => getTotalMatchCount(results), [results]);
  const fileCount = results.length;

  // Notify parent of search query changes for editor highlighting
  useEffect(() => {
    onSearchQueryChange?.(debouncedQuery, options);
  }, [debouncedQuery, options, onSearchQueryChange]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const toggleOption = useCallback((key: keyof SearchOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!isOpen) return null;

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Search Header */}
      {showHeader && (
        <Box
          px={3}
          py={2}
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          flexShrink={0}
        >
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color="text.tertiary"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            Search
          </Text>
        </Box>
      )}

      {/* Search Input */}
      <Box px={2} py={2} flexShrink={0}>
        {(replacement || onCloseSearch) && (
          <HStack justify="space-between" mb={1}>
            {replacement ? (
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<ReplaceAll size={13} />}
                onClick={() => setReplacing((value) => !value)}
                aria-expanded={replacing}
              >
                Replace
              </Button>
            ) : (
              <Box />
            )}
            {onCloseSearch && (
              <IconButton
                aria-label="Close search"
                title="Return to Explorer"
                icon={<CloseIcon boxSize={2.5} />}
                size="xs"
                variant="ghost"
                color="text.tertiary"
                onClick={onCloseSearch}
              />
            )}
          </HStack>
        )}
        <InputGroup size="sm">
          <Input
            ref={inputRef}
            placeholder="Search in files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: "whiteAlpha.300" }}
            _focus={{
              borderColor: "primary.400",
              boxShadow: "none",
            }}
            fontSize="xs"
            pr="70px"
          />
          <InputRightElement w="auto" pr={1}>
            <HStack spacing={0}>
              <Tooltip label="Case Sensitive" placement="top" hasArrow>
                <IconButton
                  aria-label="Case sensitive"
                  icon={<CaseSensitive size={14} />}
                  size="xs"
                  variant="ghost"
                  color={
                    options.caseSensitive ? "primary.400" : "text.tertiary"
                  }
                  bg={options.caseSensitive ? "whiteAlpha.200" : "transparent"}
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={() => toggleOption("caseSensitive")}
                />
              </Tooltip>
              <Tooltip label="Use Regex" placement="top" hasArrow>
                <IconButton
                  aria-label="Use regex"
                  icon={<Regex size={14} />}
                  size="xs"
                  variant="ghost"
                  color={options.regex ? "primary.400" : "text.tertiary"}
                  bg={options.regex ? "whiteAlpha.200" : "transparent"}
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={() => toggleOption("regex")}
                />
              </Tooltip>
              {query && (
                <IconButton
                  aria-label="Clear search"
                  icon={<CloseIcon boxSize={2} />}
                  size="xs"
                  variant="ghost"
                  color="text.tertiary"
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={handleClear}
                />
              )}
            </HStack>
          </InputRightElement>
        </InputGroup>
        {replacement && replacing && (
          <VStack align="stretch" spacing={2} mt={2}>
            <Input
              size="sm"
              fontSize="xs"
              placeholder="Replace with..."
              aria-label="Replace with"
              value={replaceText}
              onChange={(event) => setReplaceText(event.target.value)}
            />
            <Button
              size="xs"
              variant="outline"
              leftIcon={<ReplaceAll size={13} />}
              isDisabled={
                replacement.disabled ||
                !query ||
                !!regexError ||
                query !== debouncedQuery ||
                !results.some((result) =>
                  replacement.writablePaths.has(result.filePath)
                )
              }
              onClick={() => replacement.onPreview(query, replaceText, options)}
            >
              Replace all…
            </Button>
            <Text fontSize="xs" color="text.tertiary">
              Dependencies are read-only.
            </Text>
          </VStack>
        )}
        {regexError && (
          <Text role="alert" fontSize="xs" color="red.300" mt={2}>
            {regexError}
          </Text>
        )}
      </Box>

      {/* Results Summary */}
      {debouncedQuery && (
        <Box px={3} py={1} flexShrink={0}>
          <Text fontSize="xs" color="text.tertiary">
            {totalMatches === 0
              ? "No results"
              : `${totalMatches >= 1000 ? "1000+" : totalMatches} result${totalMatches !== 1 ? "s" : ""} in ${fileCount} file${fileCount !== 1 ? "s" : ""}`}
          </Text>
        </Box>
      )}

      {results.some((result) => result.matches.length >= 100) && (
        <Text px={3} py={1} fontSize="xs" color="text.tertiary">
          Showing up to 100 matches per file. Replacement includes all matches.
        </Text>
      )}
      {/* Results List */}
      <Box
        flex={1}
        overflow="auto"
        css={{
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.2)",
            borderRadius: "3px",
          },
        }}
      >
        <VStack spacing={0} align="stretch">
          {results.map((result) => (
            <FileResult
              key={result.filePath}
              result={result}
              sourceCode={debouncedSources}
              onMatchClick={onResultClick}
              defaultOpen={true}
              onReplace={
                replacement &&
                replacing &&
                !replacement.disabled &&
                !regexError &&
                query === debouncedQuery &&
                replacement.writablePaths.has(result.filePath)
                  ? () =>
                      replacement.onPreview(
                        query,
                        replaceText,
                        options,
                        result.filePath
                      )
                  : undefined
              }
            />
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
