import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { SignatureRegistryForm } from "./SignatureRegistryForm";

const signature = "transfer(address,uint256)";
const selector = "0xa9059cbb";
const lookup = (names: string[] = []) =>
  new Response(
    JSON.stringify({
      ok: true,
      result: { function: { [selector]: names.map((name) => ({ name })) } },
    })
  );
const imported = () =>
  new Response(
    JSON.stringify({
      ok: true,
      result: {
        function: {
          imported: { [signature]: selector },
          duplicated: {},
          invalid: [],
        },
      },
    })
  );
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(target = selector) {
  return render(
    <ChakraProvider>
      <SignatureRegistryForm selector={target} />
    </ChakraProvider>
  );
}
async function open() {
  fireEvent.click(
    screen.getByRole("button", { name: "Add a missing signature" })
  );
  return screen.findByRole("dialog", { name: "Add a missing signature" });
}
async function fill() {
  const dialog = await open();
  fireEvent.change(
    within(dialog).getByRole("textbox", {
      name: "Canonical function signature",
    }),
    {
      target: { value: signature },
    }
  );
  return dialog;
}
function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Submit to Sourcify" }));
}

it("opens a focused modal with one submit button and no preview or API details", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  mount();
  const trigger = screen.getByRole("button", {
    name: "Add a missing signature",
  });
  trigger.focus();
  const dialog = await fill();
  await waitFor(() =>
    expect(dialog.contains(document.activeElement)).toBe(true)
  );
  expect(
    within(dialog).getByRole("button", { name: "Submit to Sourcify" })
  ).toBeTruthy();
  expect(within(dialog).queryByRole("checkbox")).toBeNull();
  expect(
    within(dialog).queryByText(
      /POST destination|Exact JSON payload|Preview public/
    )
  ).toBeNull();
  expect(dialog.textContent).not.toContain("/signature-database/");
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(fetchMock).not.toHaveBeenCalled();
});

it("validates mismatched or noncanonical signatures before making requests", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  mount();
  await open();
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
    submit();
    await screen.findByRole("alert");
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

it("requires an exact selector when there is no calldata", async () => {
  const fetchMock = vi.fn().mockResolvedValue(lookup([signature]));
  vi.stubGlobal("fetch", fetchMock);
  mount("");
  await fill();
  submit();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "4-byte selector"
  );
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox", { name: "4-byte selector" }), {
    target: { value: selector },
  });
  submit();
  expect((await screen.findByRole("status")).textContent).toContain(
    "already exists"
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("shows an existing signature without posting an import", async () => {
  const fetchMock = vi.fn().mockResolvedValue(lookup([signature]));
  vi.stubGlobal("fetch", fetchMock);
  mount();
  await fill();
  submit();
  expect((await screen.findByRole("status")).textContent).toContain(
    "already exists"
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].method).toBe("GET");
});

it("checks and imports a missing signature from a single form submission", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(lookup())
    .mockResolvedValueOnce(imported());
  vi.stubGlobal("fetch", fetchMock);
  mount();
  await fill();
  fireEvent.submit(
    screen
      .getByRole("textbox", { name: "Canonical function signature" })
      .closest("form")!
  );
  expect((await screen.findByRole("status")).textContent).toContain(
    "submitted to Sourcify"
  );
  expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual([
    "GET",
    "POST",
  ]);
});

it("disables editing, dismissal and duplicate submissions while checking", async () => {
  let resolve!: (r: Response) => void;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      })
  );
  vi.stubGlobal("fetch", fetchMock);
  mount();
  const dialog = await fill();
  submit();
  fireEvent.submit(
    screen
      .getByRole("textbox", { name: "Canonical function signature" })
      .closest("form")!
  );
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
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => resolve(lookup([signature])));
  await screen.findByRole("status");
});

it("shows lookup failures without importing, and clears status when input changes", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error("private detail"))
    .mockResolvedValueOnce(lookup([signature]));
  vi.stubGlobal("fetch", fetchMock);
  mount();
  await fill();
  submit();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Nothing was submitted"
  );
  expect(screen.getByRole("alert").textContent).not.toContain("private detail");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  submit();
  await screen.findByRole("status");
  fireEvent.change(
    screen.getByRole("textbox", { name: "Canonical function signature" }),
    { target: { value: "wrong()" } }
  );
  expect(screen.queryByRole("status")).toBeNull();
});

it("reports an unconfirmed import without retrying it automatically", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(lookup())
    .mockRejectedValueOnce(new Error("private detail"));
  vi.stubGlobal("fetch", fetchMock);
  mount();
  await fill();
  submit();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "may have reached Sourcify"
  );
  expect(screen.queryByRole("status")).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("resets the form when the calldata selector changes", async () => {
  vi.stubGlobal("fetch", vi.fn());
  const view = mount();
  await fill();
  view.rerender(
    <ChakraProvider>
      <SignatureRegistryForm selector="0x095ea7b3" />
    </ChakraProvider>
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await open();
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
