import { diffLines } from "diff";
import type { DiffFileData } from "@/components/SourceCodeExplorer/types";

/** Shared source comparison data for Contract Diff and imported workspaces. */
export function compareSourceFiles(
  oldSources: Record<string, string>,
  newSources: Record<string, string>
): Record<string, DiffFileData> {
  const result: Record<string, DiffFileData> = Object.create(null);
  const deadline = performance.now() + 200;
  const paths = [
    ...new Set([...Object.keys(oldSources), ...Object.keys(newSources)]),
  ];
  const lineCount = (value: string) =>
    value ? value.split("\n").length - Number(value.endsWith("\n")) : 0;
  for (const path of paths) {
    const oldCode = oldSources[path] ?? "",
      newCode = newSources[path] ?? "";
    const changed =
      oldCode !== newCode ||
      Object.hasOwn(oldSources, path) !== Object.hasOwn(newSources, path);
    const parts = !changed
      ? []
      : oldCode.length + newCode.length > 250_000 ||
          performance.now() >= deadline
        ? undefined
        : diffLines(oldCode, newCode, {
            ignoreWhitespace: false,
            ...{
              timeout: Math.max(1, Math.min(100, deadline - performance.now())),
            },
          });
    let diffCode = changed ? "" : newCode,
      linesAdded = 0,
      linesRemoved = 0;
    const previewOnly = changed && !parts;
    if (previewOnly) {
      linesAdded = lineCount(newCode);
      linesRemoved = lineCount(oldCode);
    } else
      for (const part of parts ?? []) {
        const lines = part.value.split("\n");
        if (lines[lines.length - 1] === "") lines.pop();
        for (const line of lines) {
          diffCode += `${part.added ? "+→" : part.removed ? "-→" : ""}${line}\n`;
          if (part.added) linesAdded++;
          if (part.removed) linesRemoved++;
        }
      }
    result[path] = {
      oldCode,
      newCode,
      oldExists: Object.hasOwn(oldSources, path),
      newExists: Object.hasOwn(newSources, path),
      diffCode,
      linesAdded,
      linesRemoved,
      changesCount: linesAdded + linesRemoved || (changed ? 1 : 0),
      ...(previewOnly ? { previewOnly: true } : {}),
    };
  }
  return result;
}
