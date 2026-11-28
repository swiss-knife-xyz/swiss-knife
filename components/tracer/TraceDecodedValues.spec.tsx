import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TraceDecodedValues } from "./TraceDecodedValues";
import { normalizeTrace } from "@/lib/tracer/model";
import type { Arg } from "@/types";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  }),
});

afterEach(cleanup);
const call = normalizeTrace({
  type: "STATICCALL",
  from: `0x${"11".repeat(20)}`,
  input: "0x5c975abb",
  output: "0x",
}).call;
it.each([false, true])(
  "defaults input expansion to whether parameters exist (%s)",
  (hasParams) => {
    const args: Arg[] = hasParams
      ? [
          {
            name: "value",
            type: "uint256",
            baseType: "uint256",
            value: "7",
            rawValue: 7n,
          },
        ]
      : [];
    render(
      <ChakraProvider>
        <TraceDecodedValues
          call={call}
          decoded={{
            input: {
              functionName: "paused",
              signature: "paused()",
              args,
              rawArgs: [],
            },
            inputInferred: false,
            revert: null,
            logs: {},
            note: "",
          }}
        />
      </ChakraProvider>
    );
    const header = screen.getByRole("button", { name: "paused" });
    expect(header.getAttribute("aria-expanded")).toBe(String(hasParams));
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe(String(!hasParams));
  }
);
