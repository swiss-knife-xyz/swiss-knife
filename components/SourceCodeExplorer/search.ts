import { SearchMatch, SearchResult, SearchOptions } from "./types";

export const MAX_TOTAL_MATCHES = 1000;
const MAX_MATCHES_PER_FILE = 100;

export function searchExpression(
  query: string,
  options: SearchOptions
): RegExp {
  return new RegExp(
    options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    options.caseSensitive ? "g" : "gi"
  );
}

/** Search is line-based, matching the replacement engine. Cap rendered results. */
export function searchAllFiles(
  sourceCode: Record<string, string>,
  query: string,
  options: SearchOptions
): SearchResult[] {
  if (!query) return [];
  let expression: RegExp;
  try {
    expression = searchExpression(query, options);
  } catch {
    return [];
  }
  const results: SearchResult[] = [];
  let total = 0;
  for (const [filePath, content] of Object.entries(sourceCode)) {
    const matches: SearchMatch[] = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      expression.lastIndex = 0;
      for (const match of lines[i].matchAll(expression)) {
        matches.push({
          lineNumber: i + 1,
          lineContent: lines[i],
          matchStart: match.index!,
          matchEnd: match.index! + match[0].length,
        });
        total++;
        if (
          matches.length >= MAX_MATCHES_PER_FILE ||
          total >= MAX_TOTAL_MATCHES
        )
          break;
      }
      if (matches.length >= MAX_MATCHES_PER_FILE || total >= MAX_TOTAL_MATCHES)
        break;
    }
    if (matches.length)
      results.push({
        filePath,
        fileName: filePath.split("/").pop() || filePath,
        matches,
      });
    if (total >= MAX_TOTAL_MATCHES) break;
  }
  return results;
}

/**
 * Get total match count across all results
 */
export function getTotalMatchCount(results: SearchResult[]): number {
  return results.reduce((sum, r) => sum + r.matches.length, 0);
}
