import type { FileDiffMetadata } from "@pierre/diffs";

/** Map original-side lines through insertions/deletions to the nearest live line. */
export function currentDiffLine(
  diff: FileDiffMetadata,
  line: number,
  side: "additions" | "deletions"
) {
  const clamp = (value: number) =>
    Math.max(1, Math.min(value, Math.max(1, diff.additionLines.length)));
  if (side === "additions") return clamp(line);
  let offset = 0;
  for (const hunk of diff.hunks) {
    if (line < hunk.deletionStart) return clamp(line + offset);
    let oldLine = hunk.deletionStart,
      newLine = hunk.additionStart;
    for (const block of hunk.hunkContent) {
      if (block.type === "context") {
        if (line < oldLine + block.lines)
          return clamp(newLine + line - oldLine);
        oldLine += block.lines;
        newLine += block.lines;
      } else {
        if (line < oldLine + block.deletions)
          return clamp(
            newLine + Math.min(line - oldLine, Math.max(0, block.additions - 1))
          );
        oldLine += block.deletions;
        newLine += block.additions;
      }
    }
    offset = newLine - oldLine;
  }
  return clamp(line + offset);
}
