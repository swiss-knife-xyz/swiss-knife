import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TraceData } from "./TraceData";

afterEach(cleanup);

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
