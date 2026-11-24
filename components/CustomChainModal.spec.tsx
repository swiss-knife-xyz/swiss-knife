import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { NetworkSelect } from "./NetworkSelect";
import { CustomChainModal } from "./CustomChainModal";
import {
  getCustomChainsSnapshot,
  initializeCustomChains,
  removeCustomChain,
} from "@/lib/customChains/store";
import { getRpcUrlsForChain } from "@/data/networks";
import { CUSTOM_CHAINS_KEY } from "@/lib/customChains/model";

beforeEach(async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  Element.prototype.scrollIntoView = vi.fn();
  await initializeCustomChains();
});
afterEach(async () => {
  cleanup();
  for (const chain of getCustomChainsSnapshot().chains)
    await removeCustomChain(chain.id);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function Selectors() {
  const [first, setFirst] = useState(1);
  const [second, setSecond] = useState(8453);
  return (
    <ChakraProvider>
      <NetworkSelect
        ariaLabel="First network"
        chainId={first}
        onChange={setFirst}
      />
      <NetworkSelect
        ariaLabel="Second network"
        chainId={second}
        onChange={setSecond}
      />
      <output data-testid="first">{first}</output>
      <output data-testid="second">{second}</output>
    </ChakraProvider>
  );
}
async function fill(id = "31337") {
  fireEvent.change(await screen.findByLabelText(/Network name/), {
    target: { value: "My local fork" },
  });
  fireEvent.change(screen.getByLabelText(/RPC URL/), {
    target: { value: "http://127.0.0.1:18545" },
  });
  fireEvent.change(screen.getByLabelText(/^Chain ID/), {
    target: { value: id },
  });
}
it("adds a verified chain from the dropdown, persists it, and changes only the initiating selector", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ result: "0x7a69" }))
  );
  render(<Selectors />);
  const input = await screen.findByRole("combobox", { name: "First network" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("button", { name: "Add chain" }));
  await fill();
  expect(
    screen.queryByRole("checkbox", { name: /testnet|local fork/i })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Verify & add" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByTestId("first").textContent).toBe("31337");
  expect(screen.getByTestId("second").textContent).toBe("8453");
  expect(JSON.parse(localStorage.getItem(CUSTOM_CHAINS_KEY)!)[0].name).toBe(
    "My local fork"
  );
  const second = screen.getByRole("combobox", { name: "Second network" });
  fireEvent.keyDown(second, { key: "ArrowDown" });
  expect(
    await screen.findByRole("option", { name: /My local fork/ })
  ).toBeTruthy();
  expect(screen.getAllByRole("option")[0].textContent).toContain(
    "My local fork"
  );
  expect(screen.getByText("Custom networks")).toBeTruthy();
});
it("requires confirmation for an existing chain ID and never falls back to its public RPC", async () => {
  const fetcher = vi.fn(async () => Response.json({ result: "0x1" }));
  vi.stubGlobal("fetch", fetcher);
  const saved = vi.fn();
  render(
    <ChakraProvider>
      <CustomChainModal isOpen onClose={() => {}} onSaved={saved} />
    </ChakraProvider>
  );
  await fill("1");
  const button = screen.getByRole("button", {
    name: "Verify & add",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Replace the RPC for Ethereum/ })
  );
  fireEvent.click(button);
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(getRpcUrlsForChain(1)).toEqual(["http://127.0.0.1:18545/"]);
});
it("rejects an RPC chain ID mismatch without saving or closing", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ result: "0x1" }))
  );
  const saved = vi.fn(),
    close = vi.fn();
  render(
    <ChakraProvider>
      <CustomChainModal isOpen onClose={close} onSaved={saved} />
    </ChakraProvider>
  );
  await fill();
  fireEvent.click(screen.getByRole("button", { name: "Verify & add" }));
  expect(
    await screen.findByText(/This RPC reports chain ID 1, not 31337/)
  ).toBeTruthy();
  expect(saved).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(getCustomChainsSnapshot().chains).toHaveLength(0);
});
it("retains editable saved settings on reopening and restores the built-in network when an override is removed", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ result: "0x1" }))
  );
  const page = render(
    <ChakraProvider>
      <CustomChainModal isOpen onClose={() => {}} onSaved={() => {}} />
    </ChakraProvider>
  );
  await fill("1");
  fireEvent.click(screen.getByRole("checkbox", { name: /Replace the RPC/ }));
  fireEvent.click(screen.getByRole("button", { name: "Verify & add" }));
  await waitFor(() => expect(getCustomChainsSnapshot().chains).toHaveLength(1));
  page.unmount();
  render(
    <ChakraProvider>
      <CustomChainModal isOpen onClose={() => {}} onSaved={() => {}} />
    </ChakraProvider>
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Edit My local fork" })
  );
  expect((screen.getByLabelText(/RPC URL/) as HTMLInputElement).value).toBe(
    "http://127.0.0.1:18545/"
  );
  expect(
    (screen.getByLabelText(/^Chain ID/) as HTMLInputElement).readOnly
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Remove My local fork" }));
  await waitFor(() => expect(getCustomChainsSnapshot().chains).toHaveLength(0));
  expect(getRpcUrlsForChain(1)).not.toContain("http://127.0.0.1:18545/");
});

it("does not submit an enclosing tool form when saving a custom chain through the portal", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ result: "0x7a69" }))
  );
  const submitTool = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <ChakraProvider>
      <form onSubmit={submitTool}>
        <NetworkSelect
          ariaLabel="Tool network"
          chainId={1}
          onChange={() => {}}
        />
      </form>
    </ChakraProvider>
  );
  const input = await screen.findByRole("combobox", { name: "Tool network" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("button", { name: "Add chain" }));
  await fill();
  fireEvent.click(screen.getByRole("button", { name: "Verify & add" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(submitTool).not.toHaveBeenCalled();
});

it("shows both loaders on RPC paste, fills the chain ID, and ignores a stale response", async () => {
  let resolveFirst!: (response: Response) => void;
  let resolveSecond!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveSecond = resolve;
        })
    );
  vi.stubGlobal("fetch", fetcher);
  render(
    <ChakraProvider>
      <CustomChainModal isOpen onClose={() => {}} onSaved={() => {}} />
    </ChakraProvider>
  );
  const rpc = (await screen.findByLabelText(/RPC URL/)) as HTMLInputElement;
  const id = screen.getByLabelText(/^Chain ID/) as HTMLInputElement;
  fireEvent.paste(rpc, {
    clipboardData: { getData: () => "http://localhost:8545" },
  });
  expect(screen.getByText("Fetching RPC chain ID")).toBeTruthy();
  expect(screen.getByText("Fetching chain ID")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Verify & add" }) as HTMLButtonElement)
      .disabled
  ).toBe(true);
  rpc.setSelectionRange(0, rpc.value.length);
  fireEvent.paste(rpc, {
    clipboardData: { getData: () => "http://localhost:9545" },
  });
  await act(async () => resolveFirst(Response.json({ result: "0x1" })));
  expect(id.value).toBe("");
  expect(screen.getByText("Fetching chain ID")).toBeTruthy();
  await act(async () => resolveSecond(Response.json({ result: "0x7a69" })));
  expect(id.value).toBe("31337");
  expect(rpc.value).toBe("http://localhost:9545");
  expect(screen.queryByText("Fetching chain ID")).toBeNull();
  expect(screen.queryByText("Fetching RPC chain ID")).toBeNull();
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
});
it("reports RPC autodetection failure and removes both loaders without saving", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: { message: "Invalid method" } }))
  );
  const saved = vi.fn();
  render(
    <ChakraProvider>
      <CustomChainModal isOpen onClose={() => {}} onSaved={saved} />
    </ChakraProvider>
  );
  fireEvent.paste(await screen.findByLabelText(/RPC URL/), {
    clipboardData: { getData: () => "http://localhost:8545" },
  });
  expect(
    await screen.findByText("The RPC did not return a valid chain ID.")
  ).toBeTruthy();
  expect(screen.queryByText("Fetching chain ID")).toBeNull();
  expect(screen.queryByText("Fetching RPC chain ID")).toBeNull();
  expect(saved).not.toHaveBeenCalled();
});

it("manages saved RPCs in the right drawer without selecting a tool network", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ result: "0x7a69" }))
  );
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <ChakraProvider>
      <CustomChainModal
        presentation="drawer"
        isOpen
        onClose={onClose}
        onSaved={onSaved}
      />
    </ChakraProvider>
  );
  expect(
    await screen.findByRole("dialog", { name: /Custom networks/ })
  ).toBeTruthy();
  expect(screen.queryByLabelText(/Network name/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add custom network" }));
  await fill();
  fireEvent.click(screen.getByRole("button", { name: "Verify & add" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(getRpcUrlsForChain(31337)).toEqual(["http://127.0.0.1:18545/"]);
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.queryByLabelText(/Network name/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "Edit My local fork" })
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit My local fork" }));
  expect(
    (await screen.findByLabelText(/Network name/)).getAttribute("value")
  ).toBe("My local fork");
  fireEvent.click(
    screen.getByRole("button", { name: "Back to custom networks" })
  );
  expect(screen.queryByLabelText(/Network name/)).toBeNull();
});
