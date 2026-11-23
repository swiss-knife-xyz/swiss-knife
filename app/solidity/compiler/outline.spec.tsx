// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { solidityOutline } from "@/lib/solidity/outline";
it("outlines all mock contracts, constructors and member signatures with declaration positions", () => {
  const input = JSON.parse(
    readFileSync(
      new URL(
        "../../../public/mock-tokens-standard-input.json",
        import.meta.url
      ),
      "utf8"
    )
  );
  const source = input.sources["contracts/mocks/MockTokens.sol"].content;
  const result = solidityOutline(source);
  expect(result.unavailable).not.toBe(true);
  expect(result.symbols.map((symbol) => symbol.name)).toEqual([
    "MockERC20",
    "MockERC721",
    "MockERC1155",
  ]);
  const mint = result.symbols[0].children.find(
    (symbol) => symbol.name === "mint"
  )!;
  expect(mint.detail).toBe("(address, uint256)");
  expect(mint.tags).toContain("external");
  expect(source.split("\n")[mint.line - 1]).toContain("function mint");
  expect(
    result.symbols[0].children.find((symbol) => symbol.kind === "constructor")
  ).toBeTruthy();
});
it("captures nested declaration types without exposing local variables or fake comment declarations", () => {
  const result = solidityOutline(
    `// function fake(){}\ncontract A is Base {\nuint public constant LIMIT=4;\naddress immutable owner;\nstruct S {uint x;}\nenum Choice {One,Two}\nevent Sent(address indexed to);\nerror Denied(address who);\nmodifier only(){_;}\nreceive() external payable{}\nfallback() external{}\nfunction run(uint[2][] memory values) external view returns(uint) {uint local=1;return local;}\n}\ntype Price is uint256;`
  );
  const contract = result.symbols[0];
  expect(contract.detail).toBe("is Base");
  expect(contract.children.map((symbol) => symbol.kind)).toEqual([
    "variable",
    "variable",
    "struct",
    "enum",
    "event",
    "error",
    "modifier",
    "receive",
    "fallback",
    "function",
  ]);
  expect(contract.children[0].tags).toEqual(["public", "constant"]);
  expect(contract.children[1].tags).toContain("immutable");
  expect(contract.children[2].children[0].name).toBe("x");
  expect(contract.children[3].children.map((symbol) => symbol.name)).toEqual([
    "One",
    "Two",
  ]);
  expect(contract.children.at(-1)?.detail).toBe("(uint[2][])");
  expect(
    contract.children.some((symbol) => ["local", "fake"].includes(symbol.name))
  ).toBe(false);
  expect(result.symbols[1]).toMatchObject({
    kind: "type",
    name: "Price",
    detail: "is uint256",
  });
});
it("handles interfaces, libraries, empty sources and malformed Solidity without throwing", () => {
  expect(
    solidityOutline(
      "interface I{function f() external;} library L{}"
    ).symbols.map((symbol) => symbol.kind)
  ).toEqual(["interface", "library"]);
  expect(solidityOutline("").symbols).toEqual([]);
  expect(solidityOutline("contract { function")).toMatchObject({
    symbols: [],
    unavailable: true,
  });
});
