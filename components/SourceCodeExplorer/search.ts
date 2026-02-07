import { SearchMatch, SearchResult, SearchOptions } from "./types";

const MAX_TOTAL_MATCHES = 1000;
const MAX_MATCHES_PER_FILE = 100;

/**
 * Search across all source code files for a query string
 * Optimized for performance with early exits and limits
 */
export function searchAllFiles(
  sourceCode: Record<string, string>,
  query: string,
  options: SearchOptions
): SearchResult[] {
  // Early exit for empty or too short queries
  if (!query || query.length < 2) {
    return [];
  }

  const results: SearchResult[] = [];
  let totalMatches = 0;

  const files = Object.entries(sourceCode);

  for (const [filePath, content] of files) {
    // Stop if we've hit the global limit
    if (totalMatches >= MAX_TOTAL_MATCHES) {
      break;
    }

    const matches = searchInFile(
      content,
      query,
      options,
      MAX_TOTAL_MATCHES - totalMatches
    );

    if (matches.length > 0) {
      const fileName = filePath.split("/").pop() || filePath;
      results.push({
        filePath,
        fileName,
        matches: matches.slice(0, MAX_MATCHES_PER_FILE),
      });
      totalMatches += matches.length;
    }
  }

  // Sort results: files with more matches first
  return results.sort((a, b) => b.matches.length - a.matches.length);
}

/**
 * Search within a single file's content
 */
function searchInFile(
  content: string,
  query: string,
  options: SearchOptions,
  maxMatches: number
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lines = content.split("\n");

  let searchQuery = query;
  let searchFn: (line: string, query: string) => { start: number; end: number }[];

  if (options.regex) {
    try {
      const flags = options.caseSensitive ? "g" : "gi";
      const regex = new RegExp(query, flags);
      searchFn = (line: string) => {
        const results: { start: number; end: number }[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          results.push({ start: match.index, end: match.index + match[0].length });
          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) break;
        }
        return results;
      };
    } catch {
      // Invalid regex, fall back to literal search
      searchFn = createLiteralSearchFn(query, options.caseSensitive);
    }
  } else {
    searchFn = createLiteralSearchFn(query, options.caseSensitive);
  }

  for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
    const line = lines[i];
    const lineMatches = searchFn(line, searchQuery);

    for (const match of lineMatches) {
      if (matches.length >= maxMatches) break;

      matches.push({
        lineNumber: i + 1, // 1-indexed
        lineContent: line,
        matchStart: match.start,
        matchEnd: match.end,
      });
    }
  }

  return matches;
}

/**
 * Create a literal (non-regex) search function
 * Uses indexOf for better performance
 */
function createLiteralSearchFn(
  query: string,
  caseSensitive: boolean
): (line: string) => { start: number; end: number }[] {
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  return (line: string) => {
    const searchLine = caseSensitive ? line : line.toLowerCase();
    const results: { start: number; end: number }[] = [];
    let pos = 0;

    while (pos < searchLine.length) {
      const index = searchLine.indexOf(searchQuery, pos);
      if (index === -1) break;
      results.push({ start: index, end: index + query.length });
      pos = index + 1; // Move past this match to find overlapping matches
    }

    return results;
  };
}

/**
 * Get total match count across all results
 */
export function getTotalMatchCount(results: SearchResult[]): number {
  return results.reduce((sum, r) => sum + r.matches.length, 0);
}
