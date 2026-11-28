import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TraceData } from "./TraceData";

afterEach(cleanup);

it("links addresses to our Explorer on the selected chain", () => {
  const address = `0x${"11".repeat(20)}`;
  render(
    <ChakraProvider>
      <TraceData label="From" value={address} address chainId={8453} />
    </ChakraProvider>
  );
  const link = screen.getByRole("link", { name: "Open From in Explorer" });
  expect(link.getAttribute("href")).toBe(
    `https://explorer.eth.sh/8453/${address}`
  );
  expect(link.getAttribute("target")).toBe("_blank");
  expect(screen.getByRole("button", { name: "Copy From" })).toBeTruthy();
});
it("omits explorer links without a chain or for contract creation", () => {
  render(
    <ChakraProvider>
      <TraceData
        label="From"
        value={`0x${"11".repeat(20)}`}
        address
      />
      <TraceData label="To" value="—" address chainId={1} />
    </ChakraProvider>
  );
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button", { name: "Copy To" })).toBeNull();
});

it("highlights JSON tokens while preserving and escaping the original log data", () => {
  const value = JSON.stringify(
    {
      data: '</code><img src=x onerror="alert(1)">',
      position: 0,
      removed: false,
    },
    null,
    2
  );
  const ui = render(
    <ChakraProvider>
      <TraceData label="Log 0 data" value={value} language="json" />
    </ChakraProvider>
  );
  const code = ui.container.querySelector("code.language-json")!;
  expect(code.textContent).toBe(value);
  for (const token of ["attr", "string", "number", "literal"]) {
    expect(code.querySelector(`.hljs-${token}`)).toBeTruthy();
  }
  expect(code.querySelector("img")).toBeNull();
});
