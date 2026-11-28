import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TraceReturnValues } from "./TraceReturnValues";
vi.mock("@/components/decodedParams/AddressParam", () => ({
  AddressParam: ({
    address,
    chainId,
  }: {
    address: string;
    chainId: number;
  }) => <span data-chain={chainId}>{address}</span>,
}));
afterEach(cleanup);
it("shows inferred address controls by default and preserves the exact raw return bytes in a tab", () => {
  const address = "0x73c0ada25913c6789a97183de9cba20abf2da923";
  const output = `0x${"0".repeat(24)}${address.slice(2)}`;
  render(
    <ChakraProvider>
      <TraceReturnValues
        output={output}
        outputs={[
          {
            name: "result0",
            type: "address",
            baseType: "address",
            value: address,
            rawValue: address,
          },
        ]}
        chainId={8453}
        resolveAddresses={false}
      />
    </ChakraProvider>
  );
  expect(screen.getByText(address).getAttribute("data-chain")).toBe("8453");
  expect(
    screen.getByRole("tab", { name: "Decoded" }).getAttribute("aria-selected")
  ).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Raw" }));
  expect(screen.getByText(output)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Copy Raw return data" })
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Decoded" }));
  expect(screen.getByText(address)).toBeTruthy();
});
