import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), wait: vi.fn() }));
vi.mock("@/lib/tracer/fetch", () => ({ fetchTransactionTrace: mocks.fetch }));
vi.mock("@/lib/customChains/store", () => ({
  useCustomChains: () => ({ ready: true, error: null, revision: 0 }),
  waitForCustomChains: mocks.wait,
}));
vi.mock("@/components/NetworkSelect", () => ({
  NetworkSelect: ({
    chainId,
    onChange,
    ariaLabel,
  }: {
    chainId: number;
    onChange: (id: number) => void;
    ariaLabel: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={chainId}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value={1}>Ethereum</option>
      <option value={8453}>Base</option>
    </select>
  ),
}));
vi.mock("@/components/tracer/useTraceDecoding", () => ({
  useTraceDecoding: () => ({
    entries: {},
    completed: 0,
    requested: 0,
    enqueue: vi.fn(),
    setAbi: vi.fn(),
  }),
}));
vi.mock("next/dynamic", () => ({
  default:
    () =>
    ({ root }: { root?: unknown }) =>
      root ? <div>Loaded call tree</div> : null,
}));
import TracerPage from "./TracerPage";
import { demoTrace } from "@/lib/tracer/demo";
const hash = `0x${"ab".repeat(32)}`;
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.wait.mockResolvedValue(undefined);
  mocks.fetch.mockResolvedValue({
    ...demoTrace,
    chainId: 8453,
    transactionHash: hash,
  });
});
const mount = () =>
  render(
    <ChakraProvider>
      <TracerPage />
    </ChakraProvider>
  );
it("pastes an explorer URL, selects its network and traces exactly once without a submit click", async () => {
  mount();
  fireEvent.paste(
    screen.getByRole("textbox", { name: "Transaction hash or explorer URL" }),
    {
      clipboardData: {
        getData: () => `https://basescan.org/tx/${hash}?foo=bar#logs`,
      },
    }
  );
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith(8453, hash));
  await screen.findByText("Loaded call tree");
  expect(
    (
      screen.getByRole("combobox", {
        name: "Trace network",
      }) as HTMLSelectElement
    ).value
  ).toBe("8453");
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(
    (
      screen.getByRole("textbox", {
        name: "Transaction hash or explorer URL",
      }) as HTMLInputElement
    ).value
  ).toBe(hash);
});
it("does not auto trace a pasted bare hash or unrecognized URL", () => {
  mount();
  const input = screen.getByRole("textbox", {
    name: "Transaction hash or explorer URL",
  });
  for (const value of [hash, `https://unknown.test/tx/${hash}`])
    fireEvent.paste(input, { clipboardData: { getData: () => value } });
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("does not start an obsolete pasted trace after saved settings finish loading", async () => {
  let resolve!: () => void;
  mocks.wait.mockReturnValue(
    new Promise<void>((r) => {
      resolve = r;
    })
  );
  mount();
  const input = screen.getByRole("textbox", {
    name: "Transaction hash or explorer URL",
  });
  fireEvent.paste(input, {
    clipboardData: { getData: () => `https://basescan.org/tx/${hash}` },
  });
  fireEvent.change(input, { target: { value: "new draft" } });
  await act(async () => resolve());
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("ignores the pasted URL's delayed result after the user edits the input", async () => {
  let resolve!: (value: unknown) => void;
  mocks.fetch.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  mount();
  const input = screen.getByRole("textbox", {
    name: "Transaction hash or explorer URL",
  });
  fireEvent.paste(input, {
    clipboardData: { getData: () => `https://basescan.org/tx/${hash}` },
  });
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { value: "another transaction" } });
  await act(async () => {
    resolve({ ...demoTrace, chainId: 8453, transactionHash: hash });
  });
  expect(screen.queryByText("Loaded call tree")).toBeNull();
});
