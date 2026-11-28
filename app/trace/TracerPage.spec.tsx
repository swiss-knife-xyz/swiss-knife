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
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/lib/tracer/fetch", () => ({ fetchTransactionTrace: mocks.fetch }));
vi.mock("@/lib/customChains/store", () => ({
  useCustomChains: () => ({ ready: true, error: null, revision: 0 }),
  waitForCustomChains: mocks.wait,
}));
vi.mock("@/components/CustomChainModal", () => ({
  CustomChainModal: ({
    isOpen,
    initialChainId,
    onSaved,
  }: {
    isOpen: boolean;
    initialChainId: number;
    onSaved: (chain: { id: number }) => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Custom RPC">
        <span>Chain {initialChainId}</span>
        <button onClick={() => onSaved({ id: initialChainId })}>
          Save RPC
        </button>
      </div>
    ) : null,
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
import { traceExamples } from "./examples";
const hash = `0x${"ab".repeat(32)}`;
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, "", "/trace");
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
it.each(traceExamples)("loads the $title example locally and restores cards on reset", async (example) => {
  window.history.replaceState(null, "", "/trace?chainId=8453");
  mount();
  expect(screen.queryByRole("button", { name: "Load demo" })).toBeNull();
  expect(screen.getByRole("region", { name: "Try tracing these:" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: `Trace ${example.title}` }));
  expect(screen.getByRole("button", { name: "Tracing…" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("status", { name: "Tracing transaction" })).toBeTruthy();
  expect(screen.queryByText("Loaded call tree")).toBeNull();
  await screen.findByText("Loaded call tree");
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.wait).not.toHaveBeenCalled();
  expect(screen.queryByRole("region", { name: "Try tracing these:" })).toBeNull();
  expect(new URLSearchParams(window.location.search).get("tx")).toBe(example.hash);
  expect(new URLSearchParams(window.location.search).get("chainId")).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "Transaction Tracer" }));
  expect(screen.getByRole("button", { name: `Trace ${example.title}` })).toBeTruthy();
});
it("does not restore a delayed example after resetting the page", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: `Trace ${traceExamples[0].title}` }));
  fireEvent.click(screen.getByRole("button", { name: "Transaction Tracer" }));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 500)); });
  expect(screen.queryByText("Loaded call tree")).toBeNull();
  expect(screen.getByRole("region", { name: "Try tracing these:" })).toBeTruthy();
  expect(window.location.search).toBe("");
});
it("loads example deep links locally without waiting for RPC settings", async () => {
  const example = traceExamples[0];
  mocks.wait.mockRejectedValue(new Error("Storage unavailable"));
  window.history.replaceState(null, "", `/trace?tx=${example.hash}&chainId=1`);
  mount();
  await screen.findByText("Loaded call tree");
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.wait).not.toHaveBeenCalled();
});
it("resets inputs, results, network, tab and URL when the heading is clicked", async () => {
  window.history.replaceState(null, "", `/trace?tx=${hash}&chainId=8453`);
  mount();
  await screen.findByText("Loaded call tree");
  fireEvent.click(screen.getByRole("tab", { name: "Import JSON" }));
  fireEvent.change(screen.getByRole("textbox", { name: "callTracer JSON" }), { target: { value: "test input" } });
  fireEvent.click(screen.getByRole("button", { name: "Transaction Tracer" }));
  expect(screen.queryByText("Loaded call tree")).toBeNull();
  expect((screen.getByRole("textbox", { name: "Transaction hash or explorer URL" }) as HTMLInputElement).value).toBe("");
  expect((screen.getByRole("combobox", { name: "Trace network" }) as HTMLSelectElement).value).toBe("1");
  expect(screen.getByRole("tab", { name: "Transaction" }).getAttribute("aria-selected")).toBe("true");
  expect(window.location.search).toBe("");
  fireEvent.click(screen.getByRole("tab", { name: "Import JSON" }));
  expect((screen.getByRole("textbox", { name: "callTracer JSON" }) as HTMLTextAreaElement).value).toBe("");
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
it("ignores an in-flight trace result after resetting from the heading", async () => {
  let resolve!: (value: typeof demoTrace) => void;
  mocks.fetch.mockImplementation(() => new Promise((done) => { resolve = done; }));
  window.history.replaceState(null, "", `/trace?tx=${hash}&chainId=8453`);
  mount();
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Transaction Tracer" }));
  await act(async () => { resolve(demoTrace); });
  expect(screen.queryByText("Loaded call tree")).toBeNull();
  expect(window.location.search).toBe("");
});
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
  expect(new URLSearchParams(window.location.search).get("tx")).toBe(hash);
  expect(new URLSearchParams(window.location.search).get("chainId")).toBe(
    "8453"
  );
  expect(
    (
      screen.getByRole("textbox", {
        name: "Transaction hash or explorer URL",
      }) as HTMLInputElement
    ).value
  ).toBe(hash);
});
it("opens a linked trace on its chain after saved settings load", async () => {
  window.history.replaceState(
    null,
    "",
    `/trace?tx=${hash}&chainId=8453&keep=yes`
  );
  let resolve!: () => void;
  mocks.wait.mockReturnValue(
    new Promise<void>((r) => {
      resolve = r;
    })
  );
  render(
    <React.StrictMode>
      <ChakraProvider>
        <TracerPage />
      </ChakraProvider>
    </React.StrictMode>
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
  await act(async () => resolve());
  await screen.findByText("Loaded call tree");
  expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(8453, hash);
  expect(new URLSearchParams(window.location.search).get("keep")).toBe("yes");
});
it.each(["0", "-1", "8453oops", "1.5", "9007199254740992"])(
  "rejects invalid URL chain IDs (%s)",
  async (chain) => {
    window.history.replaceState(null, "", `/trace?tx=${hash}&chainId=${chain}`);
    mount();
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Enter a valid chain ID in the URL."
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  }
);
it("updates draft hash and network URL state without automatically submitting", async () => {
  window.history.replaceState(null, "", "/trace?keep=yes");
  mount();
  fireEvent.change(
    screen.getByRole("textbox", { name: "Transaction hash or explorer URL" }),
    { target: { value: hash } }
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Trace network" }), {
    target: { value: "8453" },
  });
  expect(new URLSearchParams(window.location.search).get("tx")).toBe(hash);
  expect(new URLSearchParams(window.location.search).get("chainId")).toBe(
    "8453"
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Trace" }));
  await screen.findByText("Loaded call tree");
  expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(8453, hash);
  fireEvent.click(screen.getByRole("button", { name: "Transaction Tracer" }));
  expect(window.location.search).toBe("?keep=yes");
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
it("links failed RPC traces to the same transaction and chain, then clears stale links on edit", async () => {
  mocks.fetch.mockRejectedValue(
    new Error("Base public RPC doesn't support debug traces")
  );
  mount();
  fireEvent.paste(
    screen.getByRole("textbox", { name: "Transaction hash or explorer URL" }),
    {
      clipboardData: { getData: () => `https://basescan.org/tx/${hash}` },
    }
  );
  const tenderly = await screen.findByRole("link", {
    name: "Open in Tenderly",
  });
  const phalcon = screen.getByRole("link", { name: "Open in Phalcon" });
  expect(tenderly.getAttribute("href")).toBe(
    `https://dashboard.tenderly.co/tx/base/${hash}`
  );
  expect(phalcon.getAttribute("href")).toBe(
    `https://app.blocksec.com/phalcon/explorer/tx/base/${hash}`
  );
  expect(tenderly.getAttribute("target")).toBe("_blank");
  expect(tenderly.getAttribute("rel")).toContain("noopener");
  fireEvent.change(
    screen.getByRole("textbox", { name: "Transaction hash or explorer URL" }),
    { target: { value: "new draft" } }
  );
  expect(screen.queryByRole("link", { name: "Open in Tenderly" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Open in Phalcon" })).toBeNull();
});
it("opens the custom RPC flow on the failed chain and retries the transaction after saving", async () => {
  mocks.fetch.mockRejectedValueOnce(
    new Error("Base public RPC doesn't support debug traces")
  );
  mount();
  fireEvent.paste(
    screen.getByRole("textbox", { name: "Transaction hash or explorer URL" }),
    {
      clipboardData: { getData: () => `https://basescan.org/tx/${hash}` },
    }
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Use your custom RPC" })
  );
  expect(screen.getByRole("dialog").textContent).toContain("Chain 8453");
  fireEvent.click(screen.getByRole("button", { name: "Save RPC" }));
  await screen.findByText("Loaded call tree");
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  expect(mocks.fetch).toHaveBeenLastCalledWith(8453, hash);
});
it("shows the result skeleton while tracing and removes it when cancelled", async () => {
  let resolve!: (value: unknown) => void;
  mocks.fetch.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  mount();
  fireEvent.paste(
    screen.getByRole("textbox", { name: "Transaction hash or explorer URL" }),
    {
      clipboardData: { getData: () => `https://basescan.org/tx/${hash}` },
    }
  );
  expect(
    await screen.findByRole("status", { name: "Tracing transaction" })
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Tracing…" }).hasAttribute("disabled")
  ).toBe(true);
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    screen.queryByRole("status", { name: "Tracing transaction" })
  ).toBeNull();
  await act(async () =>
    resolve({ ...demoTrace, chainId: 8453, transactionHash: hash })
  );
  expect(screen.queryByText("Loaded call tree")).toBeNull();
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
