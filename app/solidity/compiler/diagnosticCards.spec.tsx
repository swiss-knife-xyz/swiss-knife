import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { CompilationErrors } from "./CompilationErrors";
import type { CompilerError } from "./types";
afterEach(cleanup);
it("shows separate concise error cards and navigates directly to each source location", () => {
  const source = '// ⚡\nimport "./Missing.sol";\ncontract A {}';
  const offset = new TextEncoder().encode("// ⚡\n").length;
  const first: CompilerError = {
    severity: "error",
    type: "ParserError",
    message: 'Source "Missing.sol" not found.',
    formattedMessage:
      'ParserError: Source "Missing.sol" not found.\n --> A.sol:2:1:\n ^^^^^',
    sourceLocation: { file: "A.sol", start: offset, end: offset + 6 },
  };
  const second: CompilerError = {
    severity: "error",
    type: "TypeError",
    message: "Unknown identifier.",
    formattedMessage: "TypeError: Unknown identifier.\n --> A.sol:3:1:\n ^^^^^",
    sourceLocation: {
      file: "A.sol",
      start: new TextEncoder().encode(
        source.split("\n").slice(0, 2).join("\n") + "\n"
      ).length,
      end: source.length,
    },
  };
  const jump = vi.fn();
  render(
    <ChakraProvider>
      <CompilationErrors
        diagnostics={[first, second]}
        fallback="combined text"
        files={[{ id: "a", name: "A.sol", content: source }]}
        disabled={false}
        onSelect={jump}
      />
    </ChakraProvider>
  );
  expect(screen.getByText("2 errors")).toBeTruthy();
  expect(screen.queryByText(/\^\^\^/)).toBeNull();
  expect(screen.queryByText("combined text")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open A.sol:2:1" }));
  expect(jump).toHaveBeenLastCalledWith(first);
  fireEvent.click(screen.getByRole("button", { name: "Open A.sol:3:1" }));
  expect(jump).toHaveBeenLastCalledWith(second);
});
it("keeps worker failures visible without offering nonexistent source navigation", () => {
  render(
    <ChakraProvider>
      <CompilationErrors
        fallback="Compiler worker failed to load."
        files={[]}
        disabled={false}
        onSelect={vi.fn()}
      />
    </ChakraProvider>
  );
  expect(screen.getByText("Compiler worker failed to load.")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
