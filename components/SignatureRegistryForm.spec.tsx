import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { SignatureRegistryForm } from "./SignatureRegistryForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const dialogName = "Add a missing signature";

async function openModal() {
  fireEvent.click(
    screen.getByRole("button", { name: "Add a missing signature" })
  );
  return screen.findByRole("dialog", { name: dialogName });
}

async function openAndPreview() {
  const dialog = await openModal();
  fireEvent.change(
    within(dialog).getByRole("textbox", {
      name: "Canonical function signature",
    }),
    { target: { value: "transfer(address,uint256)" } }
  );
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Preview public submission" })
  );
  return dialog;
}

it("opens the form in a titled modal with a close button and returns focus on close", async () => {
  vi.stubGlobal("fetch", vi.fn());
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(
    screen.queryByRole("textbox", { name: "Canonical function signature" })
  ).toBeNull();
  const trigger = screen.getByRole("button", {
    name: "Add a missing signature",
  });
  expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
  trigger.focus();
  const dialog = await openModal();
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(
    within(dialog).getByRole("heading", { name: "Add a missing signature" })
  ).toBeTruthy();
  // Focus is moved inside the modal.
  await waitFor(() =>
    expect(dialog.contains(document.activeElement)).toBe(true)
  );

  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(fetch).not.toHaveBeenCalled();
});

it("Escape closes the modal and clears preview/consent without submitting", async () => {
  vi.stubGlobal("fetch", vi.fn());
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  const dialog = await openAndPreview();
  fireEvent.click(within(dialog).getByRole("checkbox"));
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const reopened = await openModal();
  expect(within(reopened).queryByRole("checkbox")).toBeNull();
  expect(
    within(reopened).queryByRole("button", {
      name: "Submit signature to Sourcify",
    })
  ).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("omits the removed caveat and keeps IP disclosure on the consent", async () => {
  vi.stubGlobal("fetch", vi.fn());
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  const dialog = await openAndPreview();
  expect(within(dialog).queryByText(/Selector matches can collide/)).toBeNull();
  expect(within(dialog).queryByText(/No guesses or private signatures/)).toBeNull();
  expect(
    within(dialog).getByRole("checkbox", {
      name: /publish this signature to Sourcify.*my IP address/,
    })
  ).toBeTruthy();
  expect(
    (
      within(dialog).getByRole("button", {
        name: "Submit signature to Sourcify",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

it("rejects a wrong or noncanonical signature without network access", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  await openModal();
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

it("requires a manually entered exact selector when no calldata is available", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ChakraProvider>
      <SignatureRegistryForm />
    </ChakraProvider>
  );
  await openAndPreview();
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

it("invalidates preview and consent when the signature changes", async () => {
  vi.stubGlobal("fetch", vi.fn());
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  await openAndPreview();
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

it("changing calldata selector resets disclosure, signature, preview and consent", async () => {
  vi.stubGlobal("fetch", vi.fn());
  const { rerender } = render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  await openAndPreview();
  fireEvent.click(screen.getByRole("checkbox"));
  rerender(
    <ChakraProvider>
      <SignatureRegistryForm selector="0x095ea7b3" />
    </ChakraProvider>
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryByRole("checkbox")).toBeNull();
  await openModal();
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
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("Enter previews locally but never submits even after consent", async () => {
  vi.stubGlobal("fetch", vi.fn());
  render(
    <ChakraProvider>
      <SignatureRegistryForm selector="0xa9059cbb" />
    </ChakraProvider>
  );
  await openAndPreview();
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

it("disables fields, close controls and duplicate clicks while a mocked submission is pending", async () => {
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
  const dialog = await openAndPreview();
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
  expect(
    (within(dialog).getByRole("button", { name: "Close" }) as HTMLButtonElement)
      .disabled
  ).toBe(true);
  // Escape cannot dismiss (or resubmit) a pending submission.
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  expect(screen.getByRole("dialog", { name: dialogName })).toBeTruthy();
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
  await openAndPreview();
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
  await openModal();
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
