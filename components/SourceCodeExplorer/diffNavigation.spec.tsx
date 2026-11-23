// @vitest-environment node
import { expect, it } from "vitest";
import { parseDiffFromFile } from "@pierre/diffs";
import { currentDiffLine } from "./diffNavigation";
it("maps old/context lines after insertions and replaced/deleted lines to their nearest local location", () => {
  const diff = parseDiffFromFile(
    { name: "A.sol", contents: "a\nb\nc\nd\ne\nf\n" },
    { name: "A.sol", contents: "inserted\na\nb\nnew c\nnew d\nf\n" }
  );
  expect(currentDiffLine(diff, 1, "deletions")).toBe(2);
  expect(currentDiffLine(diff, 3, "deletions")).toBe(4);
  expect(currentDiffLine(diff, 4, "deletions")).toBe(5);
  expect(currentDiffLine(diff, 5, "deletions")).toBe(5);
  expect(currentDiffLine(diff, 6, "deletions")).toBe(6);
  expect(currentDiffLine(diff, 4, "additions")).toBe(4);
});
it("handles removals at EOF and new or empty local files", () => {
  const diff = parseDiffFromFile(
    { name: "A.sol", contents: "a\nb\nc\n" },
    { name: "A.sol", contents: "a\n" }
  );
  expect(currentDiffLine(diff, 3, "deletions")).toBe(1);
  const added = parseDiffFromFile(null, { name: "A.sol", contents: "a\nb\n" });
  expect(currentDiffLine(added, 2, "additions")).toBe(2);
});
