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
import { SignatureRegistryForm } from "./SignatureRegistryForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function openAndPreview() {
  fireEvent.click(
    screen.getByRole("button", { name: "Add a missing signature" })
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Canonical function signature" }),
    { target: { value: "transfer(address,uint256)" } }
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Preview public submission" })
  );
}

it("rejects a wrong or noncanonical signature without network access", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Add a missing signature" })
  );
  for (const value of [
    "transfer(address,uint)",
    "wrong()",
    "",
    "function transfer(address,uint256)",
  ]) {
    fireEvent.change(
      screen.getByRole("textbox", { name: "Canonical function signature" }),
      { target: { value } }
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Preview public submission" })
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

it("requires a manually entered exact selector when no calldata is available", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ChakraProvider>
      <SignatureRegistryForm />
    </ChakraProvider>
  );
  openAndPreview();
  expect(screen.getByRole("alert").textContent).toContain("4-byte selector");
  fireEvent.change(screen.getByRole("textbox", { name: "4-byte selector" }), {
    target: { value: "0xa9059cbb" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Preview public submission" })
  );
  expect(screen.getByRole("checkbox")).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("invalidates preview and consent when the signature changes", () => {
  vi.stubGlobal("fetch", vi.fn());
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  openAndPreview();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Canonical function signature" }),
    { target: { value: "wrong()" } }
  );
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Submit signature to Sourcify" })
  ).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("changing calldata selector resets disclosure, signature, preview and consent", () => {
  vi.stubGlobal("fetch", vi.fn());
  const { rerender } = render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  openAndPreview();
  fireEvent.click(screen.getByRole("checkbox"));
  rerender(
    <ChakraProvider>
      <SignatureRegistryForm selector="0x095ea7b3" />
    </ChakraProvider>
  );
  expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Add a missing signature" })
  );
  expect(
    (
      screen.getByRole("textbox", {
        name: "Canonical function signature",
      }) as HTMLInputElement
    ).value
  ).toBe("");
  expect(
    (
      screen.getByRole("textbox", {
        name: "4-byte selector",
      }) as HTMLInputElement
    ).value
  ).toBe("0x095ea7b3");
  expect(fetch).not.toHaveBeenCalled();
});

it("Enter previews locally but never submits even after consent", () => {
  vi.stubGlobal("fetch", vi.fn());
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  openAndPreview();
  fireEvent.click(screen.getByRole("checkbox"));
  const input = screen.getByRole("textbox", {
    name: "Canonical function signature",
  });
  fireEvent.submit(input.closest("form")!);
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(
    false
  );
  expect(fetch).not.toHaveBeenCalled();
});

it("disables fields and guards duplicate clicks while a mocked submission is pending", async () => {
  let resolve!: (value: Response) => void;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      })
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  openAndPreview();
  fireEvent.click(screen.getByRole("checkbox"));
  const submit = screen.getByRole("button", {
    name: "Submit signature to Sourcify",
  });
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(
    (
      screen.getByRole("textbox", {
        name: "Canonical function signature",
      }) as HTMLInputElement
    ).disabled
  ).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  resolve(
    new Response(
      JSON.stringify({
        ok: true,
        result: {
          function: {
            imported: {},
            duplicated: { "transfer(address,uint256)": "0xa9059cbb" },
            invalid: [],
          },
        },
      })
    )
  );
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("already exists")
  );
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("failed submission clears authorization and warns about uncertain delivery without retry", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValue(new Error("upstream private detail"));
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  openAndPreview();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: "Submit signature to Sourcify" })
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "may have reached Sourcify"
    )
  );
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.getByRole("alert").textContent).not.toContain(
    "upstream private detail"
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("keeps public writes opt-in through preview and separate consent", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        ok: true,
        result: {
          function: {
            imported: { "transfer(address,uint256)": "0xa9059cbb" },
            duplicated: {},
            invalid: [],
          },
        },
      })
    )
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  expect(
    screen.queryByRole("textbox", { name: "Canonical function signature" })
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Add a missing signature" })
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Canonical function signature" }),
    { target: { value: "transfer(address,uint256)" } }
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Preview public submission" })
  );
  expect(
    screen.getByText(
      "https://api.4byte.sourcify.dev/signature-database/v1/import"
    )
  ).toBeTruthy();
  expect(
    screen.getByText('{"function":["transfer(address,uint256)"]}')
  ).toBeTruthy();
  const submit = screen.getByRole("button", {
    name: "Submit signature to Sourcify",
  }) as HTMLButtonElement;
  expect(submit.disabled).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(submit);
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("Imported")
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
