import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { encodeAbiParameters } from "viem";
import { ReuseConstructorArguments } from "./ReuseConstructorArguments";
import {
  constructorsMatch,
  reuseConstructorValues,
} from "@/lib/solidity/deploymentConstructor";
import { deploymentData } from "./ContractDeployment";
const inputs = [
  {
    name: "config",
    type: "tuple",
    components: [
      { name: "active", type: "bool" },
      { name: "limits", type: "uint256[]" },
    ],
  },
  { name: "enabled", type: "bool[]" },
] as const;
const large = 2n ** 255n;
const encoded = encodeAbiParameters(inputs, [
  { active: false, limits: [large, 7n] },
  [true, false],
]);
const record: any = {
  id: "one",
  buildId: "build",
  workspaceId: "workspace",
  contractName: "Token",
  sourcePath: "Token.sol",
  chainId: 1,
  createdAt: 1,
  updatedAt: 1,
  status: "success",
  constructorArgs: encoded,
  arguments: "[]",
  imported: { provider: "etherscan", sourceUrl: "https://etherscan.io" },
  constructorInputs: inputs,
};
const abi = [
  { type: "constructor", inputs, stateMutability: "nonpayable" },
] as const;
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("round-trips nested constructor values into the existing form shape with exact calldata", () => {
  const values = reuseConstructorValues(inputs, inputs, encoded);
  expect(values).toEqual({
    0: ["false", [large.toString(), "7"]],
    1: ["true", "false"],
  });
  expect(
    deploymentData(
      {
        name: "Token",
        sourcePath: "Token.sol",
        abi: [...abi],
        bytecode: "6000",
        deployedBytecode: "",
      },
      values
    )
  ).toBe(`0x6000${encoded.slice(2)}`);
});
it("rejects changed types, order, array sizes and nested tuple names", () => {
  expect(
    constructorsMatch(
      [{ name: "x", type: "uint" }],
      [{ name: "x", type: "uint256" }]
    )
  ).toBe(true);
  expect(
    constructorsMatch(
      [
        { name: "first", type: "address" },
        { name: "second", type: "address" },
      ],
      [
        { name: "second", type: "address" },
        { name: "first", type: "address" },
      ]
    )
  ).toBe(false);
  expect(
    constructorsMatch(
      [{ name: "enabled", type: "bool[2]" }],
      [{ name: "enabled", type: "bool[]" }]
    )
  ).toBe(false);
  expect(
    constructorsMatch(
      [
        {
          ...inputs[0],
          components: [
            { name: "changed", type: "bool" },
            { name: "limits", type: "uint256[]" },
          ],
        },
        inputs[1],
      ],
      inputs
    )
  ).toBe(false);
  expect(() =>
    reuseConstructorValues(
      [{ name: "changed", type: "uint256" }],
      inputs,
      encoded
    )
  ).toThrow(/changed/);
});
it("lists decoded saved and imported deployments, disables mismatches and applies only compatible parameters", async () => {
  const changed = {
    ...record,
    id: "changed",
    contractName: "Token",
    constructorInputs: [{ name: "amount", type: "uint256" }],
    constructorArgs: encodeAbiParameters([{ type: "uint256" }], [123n]),
  };
  const history: any = {
    records: [
      record,
      changed,
      { ...record, id: "other", contractName: "Other" },
      { ...record, id: "other-path", sourcePath: "Other.sol" },
    ],
    getBuild: vi.fn(),
  };
  const reuse = vi.fn();
  render(
    <ChakraProvider>
      <ReuseConstructorArguments
        contract={{ name: "Token", sourcePath: "Token.sol" }}
        inputs={inputs}
        history={history}
        disabled={false}
        onReuse={reuse}
      />
    </ChakraProvider>
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Reuse from prev deployments" })
  );
  await screen.findByText("Constructor parameters don’t match");
  expect(
    screen.queryByRole("button", { name: "Reuse Other constructor arguments" })
  ).toBeNull();
  expect(
    screen.getAllByRole("button", { name: "Reuse Token constructor arguments" })
  ).toHaveLength(2);
  expect(
    (
      screen.getAllByRole("button", {
        name: "Reuse Token constructor arguments",
      })[1] as HTMLButtonElement
    ).disabled
  ).toBe(true);
  const button = screen.getAllByRole("button", {
    name: "Reuse Token constructor arguments",
  })[0];
  await waitFor(() =>
    expect((button as HTMLButtonElement).disabled).toBe(false)
  );
  fireEvent.click(button);
  expect(reuse).toHaveBeenCalledWith({
    0: ["false", [large.toString(), "7"]],
    1: ["true", "false"],
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(history.getBuild).not.toHaveBeenCalled();
});
it("hides the action when there are no deployments", () => {
  render(
    <ChakraProvider>
      <ReuseConstructorArguments
        contract={{ name: "Token", sourcePath: "Token.sol" }}
        inputs={inputs}
        history={{ records: [] } as any}
        disabled={false}
        onReuse={vi.fn()}
      />
    </ChakraProvider>
  );
  expect(
    screen.queryByRole("button", { name: "Reuse from prev deployments" })
  ).toBeNull();
});

it("shows reuse only for the selected contract name and source path", () => {
  const show = (name: string, sourcePath: string) => (
    <ChakraProvider>
      <ReuseConstructorArguments
        contract={{ name, sourcePath }}
        inputs={inputs}
        history={{ records: [record], getBuild: vi.fn() } as any}
        disabled={false}
        onReuse={vi.fn()}
      />
    </ChakraProvider>
  );
  const view = render(show("Other", "Token.sol"));
  expect(
    screen.queryByRole("button", { name: "Reuse from prev deployments" })
  ).toBeNull();
  view.rerender(show("Token", "Other.sol"));
  expect(
    screen.queryByRole("button", { name: "Reuse from prev deployments" })
  ).toBeNull();
  view.rerender(show("Token", "Token.sol"));
  expect(
    screen.getByRole("button", { name: "Reuse from prev deployments" })
  ).toBeTruthy();
});
