import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { Omnibox } from "./Omnibox";

const { push, resolveName } = vi.hoisted(() => ({
  push: vi.fn(),
  resolveName: vi.fn(),
}));
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => ({ push }),
}));
vi.mock("@/utils", () => ({
  getPath: (base: string) => `/${base}/`,
  resolveNameToAddress: resolveName,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resolveName.mockReset();
});
const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const hash = `0x${"ab".repeat(32)}`;
function enter(value: string) {
  render(
    <ChakraProvider>
      <Omnibox />
    </ChakraProvider>
  );
  const input = screen.getByRole("textbox", { name: /Paste to explore/ });
  input.focus();
  fireEvent.change(input, { target: { value } });
  return input;
}

it("makes Contract Explorer the address default with a directory alternative", () => {
  const input = enter(`https://basescan.org/address/${address}`);
  expect(
    screen.getByRole("link", { name: /Open Explorer/ }).getAttribute("href")
  ).toBe(`/explorer/8453/${address}`);
  expect(
    screen
      .getByRole("link", { name: /Explorer Directory/ })
      .getAttribute("href")
  ).toBe(`/explorers/address/${address}?chainId=8453`);
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenCalledExactlyOnceWith(`/explorer/8453/${address}`);
});

it("sends transactions to the decoder with inferred chain and keeps the explorers alternative", () => {
  const input = enter(`https://basescan.org/tx/${hash}`);
  const primary = screen
    .getByRole("link", { name: /Decode transaction calldata/ })
    .getAttribute("href")!;
  const url = new URL(primary, "http://localhost");
  expect(url.pathname).toBe("/calldata/decoder");
  expect(url.searchParams.get("tx")).toBe(hash);
  expect(url.searchParams.get("chainId")).toBe("8453");
  expect(
    screen
      .getByRole("link", { name: /Explorer Directory/ })
      .getAttribute("href")
  ).toBe(`/explorers/tx/${hash}?chainId=8453`);
  expect(screen.queryByRole("link", { name: /Decode as calldata/ })).toBeNull();
  expect(screen.getAllByRole("link")).toHaveLength(2);
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenCalledExactlyOnceWith(primary);
});

it.each([
  ["0x18160ddd", "/calldata/decoder?calldata=0x18160ddd"],
  ["-1000000000000000001", "/converter/eth?wei=-1000000000000000001"],
])("passes %s to its tool without rounding", (value, href) => {
  const input = enter(value);
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenCalledExactlyOnceWith(href);
});

it("navigates choices with arrows while retaining input focus and resets when edited", () => {
  const input = enter(hash);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(document.activeElement).toBe(input);
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenLastCalledWith(`/explorers/tx/${hash}?chainId=1`);
  fireEvent.change(input, { target: { value: address } });
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenLastCalledWith(`/explorer/1/${address}`);
});

it("leaves invalid text in place and shows an inline error instead of navigating", () => {
  const input = enter("not valid");
  fireEvent.submit(input.closest("form")!);
  expect(push).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeTruthy();
  expect((input as HTMLInputElement).value).toBe("not valid");
  fireEvent.change(input, { target: { value: "42" } });
  expect(screen.queryByRole("alert")).toBeNull();
});

it.each([
  ["0x18160ddd", "/calldata/decoder?calldata=0x18160ddd"],
  [address, `/explorer/1/${address}`],
  [`https://basescan.org/address/${address}`, `/explorer/8453/${address}`],
  [hash, `/calldata/decoder?tx=${hash}&chainId=1`],
  [
    `https://basescan.org/tx/${hash}`,
    `/calldata/decoder?tx=${hash}&chainId=8453`,
  ],
])("navigates immediately on pasting %s", (value, href) => {
  const input = enter("");
  const paste = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(paste, "clipboardData", {
    value: { getData: () => ` ${value} ` },
  });
  fireEvent(input, paste);
  expect(paste.defaultPrevented).toBe(true);
  expect(push).toHaveBeenCalledExactlyOnceWith(href);
  expect((input as HTMLInputElement).value).toBe(value);
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.queryByRole("link", { name: /Explorer Directory/ })).toBeNull();
  expect(screen.getByRole("link").getAttribute("aria-busy")).toBe("true");
  expect(screen.getByText("Opening…")).toBeTruthy();
  expect((input as HTMLInputElement).readOnly).toBe(true);
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenCalledTimes(1);
});

it.each(["123456789", "not an address"])(
  "does not auto-navigate for pasted %s",
  (value) => {
    const input = enter("");
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", {
      value: { getData: () => value },
    });
    fireEvent(input, paste);
    expect(paste.defaultPrevented).toBe(false);
    expect(push).not.toHaveBeenCalled();
  }
);

it.each([
  ["1700000000", "1700000000"],
  ["1700000000123", "1700000000.123"],
])(
  "prioritizes Epoch Converter for probable timestamp %s and retains unit conversion",
  (value, seconds) => {
    const input = enter(value);
    const links = screen.getAllByRole("link");
    expect(links[0].textContent).toContain("Epoch Converter");
    expect(links[0].getAttribute("href")).toBe(
      `/epoch-converter/?timestamp=${seconds}`
    );
    expect(links[1].getAttribute("href")).toBe(`/converter/eth?wei=${value}`);
    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledExactlyOnceWith(
      `/epoch-converter/?timestamp=${seconds}`
    );
  }
);

it("keeps ordinary amounts on ETH unit conversion without a timestamp suggestion", () => {
  enter("1000000000000000000");
  expect(screen.queryByRole("link", { name: /Epoch Converter/ })).toBeNull();
  expect(screen.getAllByRole("link")).toHaveLength(1);
});

it.each([
  ["encoder", "Calldata Encoder", "/calldata/encoder"],
  ["CCIP", "CCIP Resolve", "/ens/ccip"],
  ["gas", "Gas Cost", "/converter/gas-cost"],
])(
  "suggests tools and related pages for %s using the All Tools catalog",
  (value, label, href) => {
    const input = enter(value);
    expect(screen.getByText("Tools & pages")).toBeTruthy();
    expect(screen.getAllByRole("link")[0].textContent).toContain(label);
    expect(
      screen.getByRole("link", { name: new RegExp(label) }).getAttribute("href")
    ).toBe(href);
    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledExactlyOnceWith(href);
  }
);

it("keeps typing focus while navigating tool suggestions and resets the selection on edits", () => {
  const input = enter("calldata");
  const links = screen.getAllByRole("link");
  expect(links.length).toBeGreaterThan(1);
  expect(links.length).toBeLessThanOrEqual(6);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(document.activeElement).toBe(input);
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenLastCalledWith(links[1].getAttribute("href"));
  fireEvent.change(input, { target: { value: "ccip" } });
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenLastCalledWith("/ens/ccip");
});

it("shows a useful empty state for unmatched text", () => {
  enter("zzzz-unmatched-tool");
  expect(screen.getByText("No tools or pages found.")).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});

it.each([
  "alice.gwei",
  "sub.alice.gwei",
  "alice.wei",
  "sub.alice.wei",
])(
  "resolves pasted %s with the shared resolver before opening the address",
  async (name) => {
    resolveName.mockResolvedValue(address);
    const input = enter("");
    fireEvent.paste(input, { clipboardData: { getData: () => name } });
    expect(screen.getByText("Resolving…")).toBeTruthy();
    expect((input as HTMLInputElement).readOnly).toBe(true);
    expect(push).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(push).toHaveBeenCalledExactlyOnceWith(`/explorer/1/${address}`)
    );
    expect(resolveName).toHaveBeenCalledExactlyOnceWith(name);
    expect(screen.getByText("Opening…")).toBeTruthy();
  }
);

it("resolves typed names only on submission and avoids duplicate requests", async () => {
  let finish!: (value: string) => void;
  resolveName.mockReturnValue(
    new Promise<string>((resolve) => {
      finish = resolve;
    })
  );
  const input = enter("VITALIK.ETH");
  expect(resolveName).not.toHaveBeenCalled();
  fireEvent.submit(input.closest("form")!);
  fireEvent.submit(input.closest("form")!);
  expect(resolveName).toHaveBeenCalledExactlyOnceWith("vitalik.eth");
  await act(async () => finish(address));
  expect(push).toHaveBeenCalledExactlyOnceWith(`/explorer/1/${address}`);
});

it.each([
  null,
  "0x0000000000000000000000000000000000000000",
  new Error("RPC unavailable"),
])(
  "retains the name and allows retry after resolution failure %s",
  async (result) => {
    if (result instanceof Error) resolveName.mockRejectedValueOnce(result);
    else resolveName.mockResolvedValueOnce(result);
    const input = enter("missing.eth");
    fireEvent.submit(input.closest("form")!);
    await screen.findByRole("alert");
    expect(push).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe("missing.eth");
    expect((input as HTMLInputElement).readOnly).toBe(false);
    resolveName.mockResolvedValueOnce(address);
    fireEvent.submit(input.closest("form")!);
    await waitFor(() =>
      expect(push).toHaveBeenCalledExactlyOnceWith(`/explorer/1/${address}`)
    );
  }
);

it("does not navigate for a resolution that finishes after leaving the homepage", async () => {
  let finish!: (value: string) => void;
  resolveName.mockReturnValue(
    new Promise<string>((resolve) => {
      finish = resolve;
    })
  );
  const input = enter("vitalik.eth");
  fireEvent.submit(input.closest("form")!);
  cleanup();
  await act(async () => finish(address));
  expect(push).not.toHaveBeenCalled();
});


it.each(["vitalik.eth", "sub.vitalik.eth"])("offers Explorer and ENS History on pasting %s without auto-resolving", async name => {
  const input = enter("");
  fireEvent.paste(input, { clipboardData: { getData: () => name } });
  expect(push).not.toHaveBeenCalled();
  expect(resolveName).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: /ENS History/ }).getAttribute("href")).toBe(`/ens/history/${name}`);
  expect((input as HTMLInputElement).readOnly).toBe(false);
  resolveName.mockResolvedValue(address);
  fireEvent.click(screen.getByRole("button", { name: /Open Explorer Resolve/ }));
  await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(`/explorer/1/${address}`));
});

it("opens ENS History by keyboard without resolving the name", () => {
  const input = enter("sub.vitalik.eth");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenCalledExactlyOnceWith("/ens/history/sub.vitalik.eth");
  expect(resolveName).not.toHaveBeenCalled();
});
