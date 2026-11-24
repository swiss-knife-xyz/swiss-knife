// @vitest-environment node
import { expect, it } from "vitest";
import { functionSelectors } from "@/lib/solidity/functionSelectors";
import { encodeFunctionData, parseAbi } from "viem";

it("matches known ERC20 selectors and ignores names, aliases, returns and data locations", () => {
  const source = `contract Token {
    function mint(address to, uint amount) external {}
    function transfer(address payable to, uint256 amount) public returns(bool) {}
    function totalSupply() external view returns(uint) {}
    function overloaded(bytes memory data) public {}
    function overloaded(bytes32 data) external {}
    function helper() internal {}
    function secret() private {}
    constructor() {}
    receive() external payable {}
    fallback() external {}
  }`;
  const result = functionSelectors(source);
  expect(result.map((item) => item.selector)).toEqual([
    "0x40c10f19",
    "0xa9059cbb",
    "0x18160ddd",
    encodeFunctionData({
      abi: parseAbi(["function overloaded(bytes data)"]),
      functionName: "overloaded",
      args: ["0x"],
    }).slice(0, 10),
    encodeFunctionData({
      abi: parseAbi(["function overloaded(bytes32 data)"]),
      functionName: "overloaded",
      args: [`0x${"00".repeat(32)}`],
    }).slice(0, 10),
  ]);
  expect(result[0]).toMatchObject({
    signature: "mint(address,uint256)",
    line: 2,
    column: 5,
  });
});

it("resolves nested structs, enums, value types and contract parameters to ABI types", () => {
  const source = `type Price is uint128;
  interface I {}
  contract A {
    enum Side {Buy, Sell}
    struct Inner {Price price; address payable recipient;}
    struct Order {Inner[] entries; Side side; I target;}
    function submit(Order[2][] calldata orders) external {}
    function callback(function(uint) external returns(bool) cb) external {}
  }`;
  const result = functionSelectors(source);
  expect(result.map((item) => item.signature)).toEqual([
    "submit(((uint128,address)[],uint8,address)[2][])",
    "callback(function)",
  ]);
});

it("never guesses unresolved/imported types, constant array dimensions or library storage signatures", () => {
  expect(
    functionSelectors(`import {Unknown} from "unknown.sol";
    contract A {
      uint constant N = 2;
      function unresolved(Unknown value) external {}
      function array(uint[N] calldata values) external {}
      function known(uint[][] calldata values) external {}
    }
    library L {function storageRef(bytes storage data) external {} }
  `).map((item) => item.signature)
  ).toEqual(["known(uint256[][])"]);
  expect(functionSelectors("contract A { function broken(")).toEqual([]);
  expect(functionSelectors("// function fake() external {} ")).toEqual([]);
});
