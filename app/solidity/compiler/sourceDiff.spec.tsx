// @vitest-environment node
import { expect, it } from "vitest";
import { compareSourceFiles } from "@/lib/sourceDiff";
it("retains the complete file tree and identifies modified, added, removed and unchanged sources", () => {
  const result = compareSourceFiles(
    {
      "A.sol": "a\nb\n",
      "Removed.sol": "old",
      "Same.sol": "same",
      "Empty.sol": "",
    },
    { "A.sol": "a\nc\n", "Added.sol": "new", "Same.sol": "same" }
  );
  expect(result["A.sol"]).toMatchObject({
    linesAdded: 1,
    linesRemoved: 1,
    changesCount: 2,
  });
  expect(result["A.sol"].diffCode).toContain("-→b\n+→c");
  expect(result["Same.sol"].changesCount).toBe(0);
  expect(result["Removed.sol"].newExists).toBe(false);
  expect(result["Added.sol"].oldExists).toBe(false);
  expect(result["Empty.sol"].changesCount).toBe(1);
});
it("bounds expensive comparisons and keeps source previews available", () => {
  const result = compareSourceFiles(
    { "Large.sol": "a".repeat(260000) },
    { "Large.sol": "b".repeat(260000) }
  );
  expect(result["Large.sol"].previewOnly).toBe(true);
  expect(result["Large.sol"].newCode).toHaveLength(260000);
});
