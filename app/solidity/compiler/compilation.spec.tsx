// @vitest-environment node
import { expect, it } from "vitest";
import { createRequire } from "node:module";
import {
  compilationSources,
  importPaths,
  importDeclarations,
  resolveImport,
  sourceSnapshot,
  diagnosticPosition,
} from "@/lib/solidity/compilation";
import {
  addFolder,
  moveFolder,
  removeFolder,
  assertPaths,
  workspaceFolders,
} from "@/lib/solidity/paths";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
const solc = createRequire(import.meta.url)("solc");
const file = (name: string, content: string) => ({ id: name, name, content });
const header = "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n";
const files = [
  file(
    "src/Main.sol",
    header +
      'import {Base} from "./base/Base.sol"; import "../lib/Math.sol"; contract Main is Base {function answer() external pure returns(uint) {return Math.answer();}}'
  ),
  file(
    "src/base/Base.sol",
    header + 'import "../../lib/Math.sol"; contract Base {}'
  ),
  file(
    "lib/Math.sol",
    header +
      "library Math {function answer() internal pure returns(uint){return 42;}}"
  ),
  file("scratch/Broken.sol", "THIS IS NOT SOLIDITY"),
];
const compile = (sources: ReturnType<typeof compilationSources>) =>
  JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources,
        settings: {
          outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
        },
      })
    )
  );
it("compiles only the selected entry and transitive imports with real solc", () => {
  const sources = compilationSources(files, "src/Main.sol");
  expect(Object.keys(sources).sort()).toEqual([
    "lib/Math.sol",
    "src/Main.sol",
    "src/base/Base.sol",
  ]);
  const output = compile(sources);
  expect(
    output.errors?.filter((error: any) => error.severity === "error") ?? []
  ).toEqual([]);
  expect(
    output.contracts["src/Main.sol"].Main.evm.bytecode.object.length
  ).toBeGreaterThan(0);
  expect(output.contracts["lib/Math.sol"].Math).toBeDefined();
});
it("ignores fake imports, supports all import forms, escaped strings and cycles", () => {
  expect(
    importPaths(
      '// import "fake.sol";\n/* import "fake2.sol"; */ string constant x = "import fake"; import "./A.sol" as A; import * as B from \'./B.sol\'; import {C as D} from "./\\x43.sol";'
    )
  ).toEqual(["./A.sol", "./B.sol", "./C.sol"]);
  expect(resolveImport("src/base/Base.sol", "../../lib/Math.sol")).toBe(
    "lib/Math.sol"
  );
  expect(resolveImport("src/Main.sol", "lib/Math.sol")).toBe("lib/Math.sol");
  const cycle = [
    file("A.sol", 'import "./B.sol";'),
    file("B.sol", 'import "./A.sol";'),
  ];
  expect(Object.keys(compilationSources(cycle, "A.sol"))).toHaveLength(2);
});
it("reports missing imports and errors with the correct source locations", () => {
  const missing = compile(
    compilationSources(
      [
        file(
          "src/Main.sol",
          header + 'import "./Missing.sol"; contract Main {}'
        ),
      ],
      "src/Main.sol"
    )
  );
  expect(missing.errors[0].sourceLocation.file).toBe("src/Main.sol");
  expect(missing.errors[0].formattedMessage).toContain("src/Missing.sol");
  const bad = compile(
    compilationSources(
      files.map((item) =>
        item.name === "lib/Math.sol"
          ? { ...item, content: header + "library Math { invalid }" }
          : item
      ),
      "src/Main.sol"
    )
  );
  expect(
    bad.errors.some(
      (error: any) =>
        error.severity === "error" &&
        error.sourceLocation.file === "lib/Math.sol"
    )
  ).toBe(true);
});
it("retains duplicate contract names under distinct source paths", () => {
  const output = compile(
    compilationSources(
      [
        file(
          "Entry.sol",
          header +
            'import "./a/Token.sol" as A; import "./b/Token.sol" as B; contract Entry {}'
        ),
        file("a/Token.sol", header + "contract Token {}"),
        file("b/Token.sol", header + "contract Token {}"),
      ],
      "Entry.sol"
    )
  );
  expect(output.contracts["a/Token.sol"].Token).toBeDefined();
  expect(output.contracts["b/Token.sol"].Token).toBeDefined();
});
it("snapshots dependency edits and maps UTF-8 diagnostic positions to Monaco", () => {
  const snapshot = sourceSnapshot(files);
  expect(sourceSnapshot([...files].reverse())).toBe(snapshot);
  expect(
    sourceSnapshot(
      files.map((item) =>
        item.name === "lib/Math.sol"
          ? { ...item, content: item.content + "//edit" }
          : item
      )
    )
  ).not.toBe(snapshot);
  expect(
    diagnosticPosition(
      "// ⚡\ncontract Broken",
      new TextEncoder().encode("// ⚡\ncontract ").length
    )
  ).toEqual({ lineNumber: 2, column: 10 });
});
it("creates, moves and deletes folders while preserving stable file IDs and tabs", () => {
  const workspace: SolidityWorkspace = {
    files,
    activeFileId: files[0].id,
    openFileIds: [files[0].id, files[2].id],
  };
  const next = moveFolder(
    addFolder(workspace, "empty/nested"),
    "src",
    "contracts"
  );
  expect(next.files[0]).toMatchObject({
    id: files[0].id,
    name: "contracts/Main.sol",
  });
  expect(workspaceFolders(next)).toContain("empty/nested");
  expect(next.openFileIds).toEqual(workspace.openFileIds);
  expect(() => moveFolder(next, "contracts", "contracts/inside")).toThrow(
    "inside itself"
  );
  expect(() => addFolder(next, "lib/Math.sol")).toThrow();
  expect(() =>
    assertPaths([file("lib/Math.sol/Child.sol", "")], ["lib/Math.sol"])
  ).not.toThrow();
  expect(() =>
    assertPaths([file("A.sol", ""), file("A.sol/B.sol", "")])
  ).toThrow();
  const removed = removeFolder(next, "contracts");
  expect(removed.files.map((item) => item.name)).toEqual([
    "lib/Math.sol",
    "scratch/Broken.sol",
  ]);
  expect(removed.activeFileId).toBe(files[2].id);
});

it("positions import annotations above multiline imports while excluding comments and quoted examples", () => {
  const source =
    '// import "fake.sol";\ncontract A { string constant text = "import fake.sol"; }\n  import {\n ERC20\n} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";';
  expect(importDeclarations(source)).toEqual([
    {
      path: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
      line: 3,
      column: 3,
    },
  ]);
});
