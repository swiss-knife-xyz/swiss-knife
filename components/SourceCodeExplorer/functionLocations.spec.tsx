import { expect, it } from "vitest";
import { buildFunctionLocations } from "./functionLocations";

it("indexes unopened inherited files, overloads, imported structs, enums, aliases and getters", () => {
  const sources = {
    "Main.sol": `import {Base as Parent} from "./lib/Base.sol";
import * as Types from "./Types.sol";
contract Main is Parent {
  function foo(address x) public override {}
  function set(Types.Item[] calldata items) external {}
}`,
    "lib/Base.sol": `contract Base {
  mapping(address => uint256[]) public balances;
  function foo(uint x) public virtual {}
  function foo(address x) public virtual {}
}`,
    "Types.sol": `enum Kind { A, B }
type Id is uint256;
struct Item { Id id; Kind kind; address payable recipient; }`,
    "Noise.sol": `interface Noise { function foo(uint256) external; }`,
  };
  const locations = buildFunctionLocations(sources, "Main");
  expect(locations["foo(uint256)"]).toMatchObject({
    path: "lib/Base.sol",
    line: 3,
  });
  expect(locations["foo(address)"]).toMatchObject({
    path: "Main.sol",
    line: 4,
  });
  expect(locations["set((uint256,uint8,address)[])"]).toMatchObject({
    path: "Main.sol",
    line: 5,
  });
  expect(locations["balances(address,uint256)"]).toMatchObject({
    path: "lib/Base.sol",
    line: 2,
  });
});

it("uses Solidity C3 ordering across diamonds rather than depth first search", () => {
  const sources = {
    "All.sol": `contract A { function f() public virtual {} }
contract B is A { function f() public virtual override {} }
contract C is A {}
contract D is B, C {}`,
  };
  expect(buildFunctionLocations(sources, "D")["f()"]).toMatchObject({
    line: 2,
  });
  const rightmost = {
    "All.sol": `contract A { function f() public virtual {} }
contract B is A { function f() public virtual override {} }
contract C is A { function f() public virtual override {} }
contract D is B, C { function f() public override(B,C) {} }`,
  };
  expect(buildFunctionLocations(rightmost, "D")["f()"]).toMatchObject({
    line: 4,
  });
  expect(
    buildFunctionLocations(
      {
        "All.sol": rightmost["All.sol"].replace(
          " { function f() public override(B,C) {} }",
          " {}"
        ),
      },
      "D"
    )["f()"]
  ).toMatchObject({ line: 3 });
});

it("resolves inherited and qualified struct types and contract parameters", () => {
  const sources = {
    "A.sol": `contract A { struct Item { uint n; } }
contract Token {}`,
    "Main.sol": `import "./A.sol";
contract Main is A {
 function inherited(Item calldata item) external {}
 function qualified(A.Item calldata item, Token token) external {}
}`,
  };
  expect(Object.keys(buildFunctionLocations(sources, "Main"))).toEqual([
    "inherited((uint256))",
    "qualified((uint256),address)",
  ]);
});

it("does not select interface declarations, unrelated functions or ambiguous root names", () => {
  expect(
    buildFunctionLocations(
      { "A.sol": "interface A { function f() external; }" },
      "A"
    )
  ).toEqual({});
  expect(
    buildFunctionLocations(
      { "A.sol": "contract A {} contract B { function f() external {} }" },
      "A"
    )
  ).toEqual({});
  expect(
    buildFunctionLocations(
      {
        "A.sol": "contract A {}",
        "B.sol": "contract A { function f() external {} }",
      },
      "A"
    )
  ).toEqual({});
});

it("fails closed for missing bases, syntax errors, cycles, and unresolved parameter types", () => {
  for (const source of [
    "contract Main is Missing { function f() external {} }",
    "contract Main is Base {} contract Base is Main {}",
    "contract Main { function f(Unknown value) external {} }",
    "contract Main { invalid solidity",
  ])
    expect(buildFunctionLocations({ "Main.sol": source }, "Main")).toEqual({});
});


it("finds root declarations with comments between tokens and ignores unrelated invalid files", () => {
  expect(buildFunctionLocations({
    "A.sol": "contract /* documentation */ A { function f() external {} }",
    "Invalid.sol": "not solidity",
  }, "A")["f()"]).toMatchObject({ path: "A.sol", line: 1 });
});
