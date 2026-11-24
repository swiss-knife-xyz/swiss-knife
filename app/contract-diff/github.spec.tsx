import { afterEach, expect, it, vi } from "vitest";
import {
  matchGithubFiles,
  parseGithubTreeUrl,
  loadGithubComparison,
} from "@/lib/contractDiffGithub";
import {
  githubCommit,
  githubSolidityTree,
  githubSourceFile,
} from "@/lib/solidity/githubDependencies";
vi.mock("@/lib/solidity/githubDependencies", () => ({
  githubCommit: vi.fn(),
  githubSolidityTree: vi.fn(),
  githubSourceFile: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());
it("prefers exact paths and longest suffixes before unique filenames", () => {
  expect({
    ...matchGithubFiles(
      [
        "contracts/Token.sol",
        "@openzeppelin/contracts/utils/Math.sol",
        "Other.sol",
      ],
      [
        "contracts/Token.sol",
        "test/Token.sol",
        "lib/contracts/utils/Math.sol",
        "test/Math.sol",
        "src/Other.sol",
      ]
    ),
  }).toEqual({
    "contracts/Token.sol": "contracts/Token.sol",
    "@openzeppelin/contracts/utils/Math.sol": "lib/contracts/utils/Math.sol",
    "Other.sol": "src/Other.sol",
  });
});
it("refuses ambiguous and many-to-one mappings and supports a folder scope", () => {
  expect(() =>
    matchGithubFiles(["Token.sol"], ["src/Token.sol", "test/Token.sol"])
  ).toThrow("Multiple");
  expect({
    ...matchGithubFiles(
      ["Token.sol"],
      ["src/Token.sol", "test/Token.sol"],
      "src"
    ),
  }).toEqual({ "Token.sol": "src/Token.sol" });
  expect(() =>
    matchGithubFiles(["a/Token.sol", "b/Token.sol"], ["src/Token.sol"])
  ).toThrow("More than one");
});
it("pins the reference and fetches only matched files, retaining explorer keys and reporting missing sources", async () => {
  const sha = "a".repeat(40),
    signal = new AbortController().signal;
  vi.mocked(githubCommit).mockResolvedValue(sha);
  vi.mocked(githubSolidityTree).mockResolvedValue(
    new Map([
      ["src/Token.sol", { sha: "b".repeat(40), size: 20 }],
      ["test/Test.sol", { sha, size: 20 }],
    ])
  );
  vi.mocked(githubSourceFile).mockResolvedValue("contract Token {}");
  const result = await loadGithubComparison(
    { "Token.sol": "old", "Dependency.sol": "dep" },
    "https://github.com/owner/repo",
    "main",
    "",
    signal
  );
  expect(githubCommit).toHaveBeenCalledWith("owner/repo", "main", signal);
  expect(githubSourceFile).toHaveBeenCalledExactlyOnceWith(
    "owner/repo",
    sha,
    "src/Token.sol",
    "b".repeat(40),
    signal
  );
  expect(result.sources).toEqual({ "Token.sol": "contract Token {}" });
  expect(result.missing).toEqual(["Dependency.sol"]);
  expect(result.commit).toBe(sha);
});
it("rejects a comparison with no matching files", async () => {
  vi.mocked(githubCommit).mockResolvedValue("a".repeat(40));
  vi.mocked(githubSolidityTree).mockResolvedValue(new Map());
  await expect(
    loadGithubComparison(
      { "Flat.sol": "old" },
      "owner/repo",
      "HEAD",
      "",
      new AbortController().signal
    )
  ).rejects.toThrow("No repository Solidity");
  expect(githubSourceFile).not.toHaveBeenCalled();
});

it("matches extensionless single-file explorer names", () => {
  expect({ ...matchGithubFiles(["WETH9"], ["contracts/WETH9.sol"]) }).toEqual({
    WETH9: "contracts/WETH9.sol",
  });
});

it("extracts repository, revision and nested folder from GitHub tree URLs", () => {
  expect(
    parseGithubTreeUrl("https://github.com/Uniswap/v4-periphery/tree/main/src")
  ).toEqual({
    repository: "Uniswap/v4-periphery",
    revision: "main",
    folder: "src",
  });
  expect(
    parseGithubTreeUrl(
      "https://github.com/owner/repo/tree/v1.0/contracts/utils/"
    )
  ).toEqual({
    repository: "owner/repo",
    revision: "v1.0",
    folder: "contracts/utils",
  });
  expect(parseGithubTreeUrl("https://github.com/owner/repo/tree/main")).toEqual(
    { repository: "owner/repo", revision: "main", folder: "" }
  );
  expect(
    parseGithubTreeUrl(
      "https://github.com/owner/repo/tree/feature%2Fbranch/src"
    )?.revision
  ).toBe("feature/branch");
  for (const value of [
    "owner/repo",
    "https://github.com.evil/owner/repo/tree/main/src",
    "https://user:secret@github.com/owner/repo/tree/main/src",
    "https://github.com/owner/repo/tree/main/src%2F..%2Fother",
    "https://github.com/owner/repo/tree/main/%ZZ",
  ])
    expect(parseGithubTreeUrl(value)).toBeNull();
});
