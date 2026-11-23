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
import { DeploymentConstructorArguments } from "./DeploymentConstructorArguments";
import {
  decodeConstructorArguments,
  stringifyConstructorValues,
} from "@/lib/solidity/constructorArguments";
import {
  importEtherscanSource,
  importSourcifySource,
} from "@/lib/verification/normalize";
import { importBlockscoutSource } from "@/lib/verification/source";
import { fixture as blockscoutFixture } from "@/lib/verification/fixtures";
import {
  etherscanFixture,
  sourcifyFixture,
} from "@/lib/verification/testHelpers";
const inputs = [
  { name: "owner", type: "address" },
  { name: "amount", type: "uint256" },
  {
    name: "orders",
    type: "tuple[]",
    components: [
      { name: "id", type: "uint256" },
      { name: "enabled", type: "bool" },
    ],
  },
  { name: "payload", type: "bytes" },
] as const;
const owner = `0x${"12".repeat(20)}` as const,
  amount = 2n ** 255n;
const encoded = encodeAbiParameters(inputs, [
  owner,
  amount,
  [{ id: 7n, enabled: false }],
  "0x1234",
]);
const constructorAbi = {
  type: "constructor",
  inputs,
  stateMutability: "nonpayable",
} as const;
const record: any = {
  id: "imported",
  buildId: "build",
  workspaceId: "one",
  chainId: 1,
  address: owner,
  contractName: "Token",
  sourcePath: "Token.sol",
  status: "success",
  createdAt: 1,
  updatedAt: 1,
  revision: 1,
  constructorArgs: encoded,
  arguments: JSON.stringify({ encoded }),
  imported: { provider: "etherscan", sourceUrl: "https://etherscan.io" },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("decodes addresses, arbitrary precision uints, nested tuples, arrays, bools and bytes", () => {
  const values = decodeConstructorArguments(inputs, encoded)!;
  expect(values).toEqual([
    owner,
    amount,
    [{ id: 7n, enabled: false }],
    "0x1234",
  ]);
  expect(JSON.parse(stringifyConstructorValues(values))[1]).toBe(
    amount.toString()
  );
  expect(decodeConstructorArguments(inputs, "0x12")).toBeUndefined();
});
it("preserves constructor ABI metadata from Etherscan, Sourcify and Blockscout", () => {
  expect(
    importEtherscanSource({
      ...etherscanFixture,
      result: [
        {
          ...etherscanFixture.result[0],
          ABI: JSON.stringify([constructorAbi]),
        },
      ],
    }).constructorAbi
  ).toEqual(constructorAbi);
  expect(
    importSourcifySource({
      ...sourcifyFixture,
      metadata: { output: { abi: [constructorAbi] } },
    }).constructorAbi
  ).toEqual(constructorAbi);
  expect(
    importBlockscoutSource({ ...blockscoutFixture, abi: [constructorAbi] })
      .constructorAbi
  ).toEqual(constructorAbi);
});
it("shows named typed values from a saved verified ABI without a network request", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  render(
    <ChakraProvider>
      <DeploymentConstructorArguments
        record={{ ...record, constructorInputs: inputs }}
        getBuild={vi.fn()}
      />
    </ChakraProvider>
  );
  expect(fetcher).not.toHaveBeenCalled();
  const details = screen.getByText("Constructor arguments").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await screen.findByText(amount.toString());
  expect(screen.getByText(owner)).toBeTruthy();
  expect(screen.getByText(/\(tuple\[\]\)/)).toBeTruthy();
  for (const name of ["owner", "amount", "orders", "payload"])
    expect(
      screen.getByRole("button", { name: `Copy ${name}` })
    ).toBeTruthy();
  const originalClipboard = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard"
  );
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  try {
    fireEvent.click(
      screen.getByRole("button", { name: "Copy amount" })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(amount.toString())
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Copy orders" })
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '[\n  {\n    "id": "7",\n    "enabled": false\n  }\n]'
      )
    );
  } finally {
    if (originalClipboard)
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    else delete (navigator as any).clipboard;
  }

  expect(fetcher).not.toHaveBeenCalled();
});
it("hydrates older imports from verified metadata only after expansion", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ chainId: 1, address: owner, source: { constructorAbi } })
    );
  vi.stubGlobal("fetch", fetcher);
  render(
    <ChakraProvider>
      <DeploymentConstructorArguments
        record={record}
        getBuild={vi.fn().mockResolvedValue({ contract: { name: "Token" } })}
      />
    </ChakraProvider>
  );
  expect(fetcher).not.toHaveBeenCalled();
  const details = screen.getByText("Constructor arguments").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await screen.findByText(amount.toString());
  expect(fetcher).toHaveBeenCalledOnce();
});
it("keeps raw arguments available if the verified ABI cannot decode them", async () => {
  render(
    <ChakraProvider>
      <DeploymentConstructorArguments
        record={{
          ...record,
          constructorArgs: "0x12",
          constructorInputs: inputs,
        }}
        getBuild={vi.fn()}
      />
    </ChakraProvider>
  );
  const details = screen.getByText("Constructor arguments").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await screen.findByText(/Couldn’t decode/);
  expect(screen.getByText(/encoded/)).toBeTruthy();
});
