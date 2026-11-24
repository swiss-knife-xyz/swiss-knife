// @vitest-environment node
import { expect, it } from "vitest";
import {
  selectCompilerRelease,
  solidityPragmas,
} from "@/lib/solidity/compilerVersions";
import { DEFAULT_COMPILER_SETTINGS as defaults } from "@/lib/solidity/settings";
const releases = [
  { label: "0.8.30", value: "soljson-v0.8.30+commit.73712a01.js" },
  { label: "0.8.28", value: "soljson-v0.8.28+commit.7893614a.js" },
  { label: "0.8.24", value: "soljson-v0.8.24+commit.e11b9ed9.js" },
  { label: "0.7.6", value: "soljson-v0.7.6+commit.7338295f.js" },
];
const pick = (source: string) =>
  selectCompilerRelease(
    [{ name: "Main.sol", content: source }],
    "Main.sol",
    releases,
    defaults
  );
it("selects exact pragmas and the newest release satisfying Solidity version ranges", () => {
  expect(pick("pragma solidity 0.8.28; contract A{}")).toBe(releases[1].value);
  expect(pick("pragma solidity ^0.8.24;")).toBe(releases[0].value);
  expect(pick("pragma solidity >=0.8.24 <0.8.30;")).toBe(releases[1].value);
  expect(pick("pragma solidity ~0.7.0 || =0.8.24;")).toBe(releases[2].value);
  expect(pick("pragma solidity >=0.8.0; pragma solidity <0.8.28;")).toBe(
    releases[2].value
  );
});
it("ignores commented or quoted fake pragmas and leaves no-pragma entries unchanged", () => {
  expect(
    solidityPragmas(
      '// pragma solidity 0.7.6;\n/* pragma solidity 0.8.24; */ string constant x="pragma solidity 0.7.6;"; pragma solidity /* ok */ 0.8.28;'
    )
  ).toEqual(["0.8.28"]);
  expect(pick("contract A{}")).toBeNull();
  expect(() => pick("pragma solidity nonsense;")).toThrow("pragma");
  expect(() => pick("pragma solidity 0.6.12;")).toThrow("No compiler");
});
it("honors transitive import pragmas and preserves incompatible imported settings", () => {
  const files = [
    {
      name: "Main.sol",
      content: 'pragma solidity ^0.8.0; import "./Lib.sol";',
    },
    { name: "Lib.sol", content: "pragma solidity 0.8.28; library Lib{}" },
  ];
  expect(selectCompilerRelease(files, "Main.sol", releases, defaults)).toBe(
    releases[1].value
  );
  expect(() =>
    selectCompilerRelease(files, "Main.sol", releases, {
      ...defaults,
      evmVersion: "prague",
    })
  ).toThrow("settings");
  expect(() =>
    selectCompilerRelease(
      [...files, { name: "Lib.sol", content: "pragma solidity 0.7.6;" }],
      "Main.sol",
      releases,
      defaults
    )
  ).toThrow("No compiler");
});
