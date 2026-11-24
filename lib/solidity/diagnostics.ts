import type { CompilerError } from "@/app/solidity/compiler/types";
export type InlineDiagnostic = {
  severity: "error" | "warning";
  message: string;
  code?: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  source: string;
};
// Map all requested compiler byte offsets in a single source pass. Monaco uses
// UTF-16 columns; Solidity uses UTF-8 byte offsets (including in Unicode comments).
function bytePositions(content: string, offsets: number[]) {
  const targets = [...new Set(offsets)].sort((a, b) => a - b);
  const points = new Map<number, { lineNumber: number; column: number }>();
  let target = 0,
    bytes = 0,
    lineNumber = 1,
    column = 1;
  for (let index = 0; target < targets.length; ) {
    while (target < targets.length && targets[target] <= bytes)
      points.set(targets[target++], { lineNumber, column });
    if (index >= content.length) break;
    const cp = content.codePointAt(index)!;
    const width = cp > 0xffff ? 2 : 1;
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    index += width;
    if (cp === 10) {
      lineNumber++;
      column = 1;
    } else column += width;
  }
  while (target < targets.length)
    points.set(targets[target++], { lineNumber, column });
  return points;
}
export function inlineDiagnostics(
  content: string,
  path: string,
  diagnostics: CompilerError[]
): InlineDiagnostic[] {
  const located = diagnostics.filter(
    (item) =>
      (item.severity === "error" || item.severity === "warning") &&
      item.sourceLocation?.file === path &&
      item.sourceLocation.start >= 0
  );
  if (!located.length) return [];
  const offsets = located.flatMap((item) => [
    item.sourceLocation!.start,
    Math.max(item.sourceLocation!.start, item.sourceLocation!.end),
  ]);
  const points = bytePositions(content, offsets);
  return located.map((item) => {
    const start = points.get(item.sourceLocation!.start)!;
    const end = points.get(
      Math.max(item.sourceLocation!.start, item.sourceLocation!.end)
    )!;
    return {
      severity: item.severity as "error" | "warning",
      message: item.message ?? item.formattedMessage,
      code: item.errorCode,
      source: "solc",
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn:
        end.column === start.column && end.lineNumber === start.lineNumber
          ? end.column + 1
          : end.column,
    };
  });
}
