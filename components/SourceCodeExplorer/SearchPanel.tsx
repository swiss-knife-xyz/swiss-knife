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
import { Search, CaseSensitive, Regex, FileText } from "lucide-react";
import { SiSolidity } from "react-icons/si";
import { searchAllFiles, getTotalMatchCount } from "./search";
import { SearchResult, SearchMatch, SearchOptions } from "./types";

interface SearchPanelProps {
  sourceCode: Record<string, string>;
  onResultClick: (path: string, content: string, lineNumber: number) => void;
  isOpen: boolean;
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
      <Text as="span" bg="yellow.600" color="black" px={0.5} borderRadius="sm" opacity={1}>
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
}: {
  result: SearchResult;
  sourceCode: Record<string, string>;
  onMatchClick: (path: string, content: string, lineNumber: number) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
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
          {result.matches.slice(0, 20).map((match, idx) => (
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
          {result.matches.length > 20 && (
            <Text fontSize="xs" color="text.tertiary" pl={1} py={1}>
              +{result.matches.length - 20} more matches
            </Text>
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
  onSearchQueryChange,
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    regex: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query, 200);

  // Compute search results
  const results = useMemo(() => {
    if (!debouncedQuery || !sourceCode) return [];
    return searchAllFiles(sourceCode, debouncedQuery, options);
  }, [sourceCode, debouncedQuery, options]);

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
      <Box px={3} py={2} borderBottom="1px solid" borderColor="whiteAlpha.100" flexShrink={0}>
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

      {/* Search Input */}
      <Box px={2} py={2} flexShrink={0}>
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
                  color={options.caseSensitive ? "primary.400" : "text.tertiary"}
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
      </Box>

      {/* Results Summary */}
      {debouncedQuery && (
        <Box px={3} py={1} flexShrink={0}>
          <Text fontSize="xs" color="text.tertiary">
            {totalMatches === 0
              ? "No results"
              : `${totalMatches} result${totalMatches !== 1 ? "s" : ""} in ${fileCount} file${fileCount !== 1 ? "s" : ""}`}
          </Text>
        </Box>
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
              sourceCode={sourceCode}
              onMatchClick={onResultClick}
              defaultOpen={true}
            />
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
