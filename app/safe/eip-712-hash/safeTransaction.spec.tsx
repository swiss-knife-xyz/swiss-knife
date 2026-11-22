import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ManualSafeTransaction } from "./ManualSafeTransaction";
import SafeHashPage from "./page";

const query = vi.hoisted(() => ({ value: "", set: vi.fn() }));
vi.mock("nuqs", () => ({
  parseAsString: { withDefault: () => ({}) },
  useQueryState: () => [query.value, query.set],
}));
vi.mock("@monaco-editor/react", () => ({
  Editor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Typed JSON editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

afterEach(() => {
  cleanup();
  query.value = "";
  query.set.mockClear();
  vi.restoreAllMocks();
});
function setup() {
  return render(
    <ChakraProvider>
      <ManualSafeTransaction />
    </ChakraProvider>
  );
}
const expectedHash =
  "0xad06b099fca34e51e4886643d95d9a19ace2cd024065efb66662a876e8c40343";
function example() {
  fireEvent.click(screen.getByRole("button", { name: "Load public example" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Calculate Safe hashes" })
  );
}

describe("manual Safe verification", () => {
  it("is reachable from the existing page, preserves drafts across tabs, and never writes manual input to URL", () => {
    render(
      <ChakraProvider>
        <SafeHashPage />
      </ChakraProvider>
    );
    expect(
      screen
        .getByRole("tab", { name: "Typed data JSON" })
        .getAttribute("aria-selected")
    ).toBe("true");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Manual calculation must not fetch"));
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    fireEvent.click(
      screen.getByRole("tab", { name: "Manual Safe transaction" })
    );
    example();
    expect(screen.getByDisplayValue(expectedHash)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Typed data JSON" }));
    fireEvent.click(
      screen.getByRole("tab", { name: "Manual Safe transaction" })
    );
    expect(screen.getByDisplayValue(expectedHash)).toBeTruthy();
    expect(query.set).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
  it("preserves the #98 public SafeMessage URL vector in the typed-data tab", async () => {
    query.value = JSON.stringify({
      types: {
        SafeMessage: [{ name: "message", type: "bytes" }],
        EIP712Domain: [
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
      },
      domain: {
        chainId: "0x1",
        verifyingContract: "0x35ea56fd9ead2567f339eb9564b6940b9dd5653f",
      },
      primaryType: "SafeMessage",
      message: {
        message:
          "0x1be8e5ff60e3a11c229dd65f64fcead922ed2e56991362d76f5df5a8e7d4c1c0",
      },
    });
    render(
      <ChakraProvider>
        <SafeHashPage />
      </ChakraProvider>
    );
    expect(
      await screen.findByText(
        "0x1497354498e270c5ae2652ab217b16deb04c5017635f1f5f229f541998495a6a"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "0x04836bd2dbdcbf68aef3b82e83babee1e988fb3c6fe1e9319d77a125e02a66cd"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "0x9b80505023ee7505d826afcf368ef1df4d18e088e773cf51dc5484858be18187"
      )
    ).toBeTruthy();
  });
  it("labels all required fields, preserves zero defaults and calculates the public example", () => {
    setup();
    for (const label of [
      "Safe address (proxy)",
      "Chain ID",
      "Nonce",
      "To",
      "Value (wei)",
      "Data (hex bytes)",
      "Safe transaction gas",
      "Base gas",
      "Gas price (wei)",
      "Gas token",
      "Refund receiver",
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect((screen.getByLabelText("Nonce") as HTMLInputElement).value).toBe(
      "0"
    );
    example();
    expect(screen.getByDisplayValue(expectedHash)).toBeTruthy();
    expect(
      screen.getByDisplayValue(
        "0x1655e94a9bcc5a957daa1acae692b4c22e7aaf146b4deb9194f8221d2f09d8c3"
      )
    ).toBeTruthy();
    expect(
      screen.getByDisplayValue(
        "0xf22754eba5a2b230714534b4657195268f00dc0031296de4b835d82e7aa1e574"
      )
    ).toBeTruthy();
    const typed = JSON.parse(
      (screen.getByLabelText("EIP-712 JSON") as HTMLTextAreaElement)
        .value
    );
    expect(typed.domain.chainId).toBe("1");
    expect(typed.message.value).toBe("0");
    expect(typed.domain.verifyingContract).toBe(
      "0x1c694Fc3006D81ff4a56F97E1b99529066a23725"
    );
  });
  it("never retains a stale hash after any field changes", () => {
    setup();
    example();
    fireEvent.change(screen.getByLabelText("Value (wei)"), {
      target: { value: "1" },
    });
    expect(screen.queryByDisplayValue(expectedHash)).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Calculate Safe hashes" })
    );
    expect(screen.getByLabelText("Safe transaction hash")).toBeTruthy();
    expect(
      (screen.getByLabelText("Safe transaction hash") as HTMLInputElement).value
    ).not.toBe(expectedHash);
    fireEvent.change(screen.getByLabelText("Safe version"), {
      target: { value: "1.4.1" },
    });
    expect(screen.queryByLabelText("Safe transaction hash")).toBeNull();
  });
  it("announces invalid data without showing previous results", () => {
    setup();
    example();
    fireEvent.change(screen.getByLabelText("Nonce"), {
      target: { value: "1e3" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Calculate Safe hashes" })
    );
    expect(screen.getByRole("alert").textContent).toContain("nonce:");
    expect(screen.queryByDisplayValue(expectedHash)).toBeNull();
  });
  it("does not expose wallet, signing or execution actions", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: /connect|sign|execute/i })
    ).toBeNull();
  });
});
