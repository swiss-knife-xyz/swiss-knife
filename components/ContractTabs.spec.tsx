import React, { Suspense, useEffect, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
import {
  ContractAddressLink,
  CONTRACT_TABS_STORAGE_KEY,
  ContractTabs,
  useContractTab,
} from "./ContractTabs";

const { code, client, mounts } = vi.hoisted(() => ({
  code: vi.fn(),
  client: vi.fn(),
  mounts: vi.fn(),
}));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: client }));
vi.mock("@/utils", () => ({
  slicedText: (value: string) => value,
  getPath: (value: string) => `/${value}/`,
  resolveERC3770Address: (value: string) => ({ address: value }),
}));
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/dynamic", () => ({
  default: (loader: any) => React.lazy(loader),
}));
vi.mock("./ContractAddressExplorer", () => ({
  default: ({ address, chainId, onChainChange }: any) => (
    <div>
      Explorer grid {chainId} {address}
      <button onClick={() => onChainChange(137)}>Switch to Polygon</button>
    </div>
  ),
}));
const root = "0x0000000000000000000000000000000000000001";
const contract = "0x0000000000000000000000000000000000000002";
const account = "0x0000000000000000000000000000000000000003";
function Contract({ address, chainId }: { address: string; chainId: number }) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const tab = useContractTab();
  useEffect(() => {
    mounts(address);
    tab?.setName(address === root ? "Original contract" : "Linked contract");
  }, [address, tab?.setName]);
  return (
    <div>
      <input
        aria-label="Draft"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button onClick={() => setExpanded((v) => !v)}>Toggle result</button>
      {expanded && <p>Saved read result</p>}
      <ContractAddressLink
        address={contract}
        displayName="Known contract tag"
        chainId={chainId}
        href="/existing-link"
        target="_blank"
      >
        Open linked contract
      </ContractAddressLink>
      <ContractAddressLink address={account} href="#existing-account">
        Open linked account
      </ContractAddressLink>
      <button onClick={() => tab?.openAddress(contract, 137)}>
        Open on Polygon
      </button>
    </div>
  );
}
function mount() {
  const result = render(
    <ChakraProvider>
      <Suspense fallback="Loading grid">
        <ContractTabs
          initial={{ address: root, chainId: 1 }}
          renderContract={(params) => <Contract {...params} />}
        />
      </Suspense>
    </ChakraProvider>
  );
  // jsdom does not evaluate responsive media queries; expose the desktop rail.
  result.container.querySelector("aside")!.style.display = "block";
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState(
    {},
    "",
    `/explorer/1/${root}?context=test#original`
  );
  code.mockResolvedValue("0x6000");
  client.mockReturnValue({ getCode: code });
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.scrollTo = vi.fn();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps drafts and expanded results mounted while selecting and deduplicating linked contracts", async () => {
  mount();
  const draft = screen.getByRole("textbox", { name: "Draft" });
  fireEvent.change(draft, { target: { value: "unfinished input" } });
  fireEvent.click(screen.getByText("Toggle result"));
  const url = window.location.href;
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  expect(client).toHaveBeenCalledWith(1);
  expect(code).toHaveBeenCalledWith({ address: contract });
  fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), {
    target: { value: "linked input" },
  });
  fireEvent.click(screen.getByRole("tab", { name: /Original contract/ }));
  expect(screen.getByDisplayValue("unfinished input")).toBe(draft);
  expect(screen.getByText("Saved read result")).toBeTruthy();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  expect(screen.getByDisplayValue("linked input")).toBeTruthy();
  expect(mounts.mock.calls.filter(([value]) => value === root)).toHaveLength(1);
  expect(
    mounts.mock.calls.filter(([value]) => value === contract)
  ).toHaveLength(1);
  expect(window.location.pathname).toBe(`/explorer/1/${contract}`);
  expect(window.location.search).toBe("");
  expect(window.location.hash).toBe("");
});

it("classifies code-free addresses as Explorer tabs and keeps the originating chain", async () => {
  code.mockResolvedValue(undefined);
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked account")
  );
  await screen.findByText(`Explorer grid 1 ${account}`);
  expect(client).toHaveBeenCalledWith(1);
  expect(screen.queryByRole("textbox", { name: "Draft" })).toBeNull();
  expect(screen.queryByText(/balance/i)).toBeNull();
});

it("separates the same address on different chains", async () => {
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open on Polygon")
  );
  await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(3));
  expect(client).toHaveBeenCalledWith(137);
  const panel = screen.getByRole("tabpanel");
  expect(panel.id).toContain(`137:${contract}`);
});

it("returns to a neighboring mounted tab when the selected tab is closed", async () => {
  mount();
  fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), {
    target: { value: "keep me" },
  });
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  fireEvent.click(
    screen.getByRole("button", { name: `Close ${contract} on Ethereum` })
  );
  expect(screen.getByDisplayValue("keep me")).toBeTruthy();
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: `Close ${root} on Ethereum` })
  ).toBeNull();
});

it("shows a retry on RPC failure instead of guessing that the address is an account", async () => {
  code.mockRejectedValueOnce(new Error("RPC down"));
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByText("Unable to load this address on Ethereum.");
  expect(screen.queryByText(/Explorer grid/)).toBeNull();
  code.mockResolvedValue("0x6000");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("tab", { name: /Linked contract/ });
});

it("does not reopen a tab when an outstanding code lookup finishes after it was closed", async () => {
  let finish!: (value: string) => void;
  code.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("status");
  fireEvent.click(
    screen.getByRole("button", { name: `Close ${contract} on Ethereum` })
  );
  await act(async () => finish("0x6000"));
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  expect(screen.getByRole("textbox", { name: "Draft" })).toBeTruthy();
});

it("supports arrow-key tab selection and keeps address tab controls free of external URLs", async () => {
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  fireEvent.keyDown(screen.getByRole("tablist"), { key: "Home" });
  const link = within(screen.getByRole("tabpanel")).getByText(
    "Open linked account"
  );
  expect(link.tagName).toBe("BUTTON");
  expect(link.hasAttribute("href")).toBe(false);
  expect(link.hasAttribute("target")).toBe(false);
  expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
  expect(
    screen
      .getByRole("tab", { name: /Linked contract/ })
      .getAttribute("aria-selected")
  ).toBe("true");
});

it("restores the saved document scroll position when returning to a mounted tab", async () => {
  mount();
  Object.defineProperty(window, "scrollY", { value: 450, configurable: true });
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  Object.defineProperty(window, "scrollY", { value: 900, configurable: true });
  fireEvent.click(screen.getByRole("tab", { name: /Original contract/ }));
  await waitFor(() =>
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 450,
      behavior: "instant",
    })
  );
});

it("keeps address links outside the contract workspace as ordinary links", () => {
  render(
    <ChakraProvider>
      <ContractAddressLink address={contract} href="#ordinary-address">
        Existing explorer link
      </ContractAddressLink>
    </ChakraProvider>
  );
  const link = screen.getByRole("link", { name: "Existing explorer link" });
  expect(link.getAttribute("href")).toBe("#ordinary-address");
  expect(fireEvent.click(link)).toBe(true);
  expect(code).not.toHaveBeenCalled();
});

it("opens the home screen in a new tab, preserves its draft, and reuses an already open address", async () => {
  mount();
  fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), {
    target: { value: "saved contract input" },
  });
  fireEvent.click(screen.getByRole("button", { name: "New address tab" }));
  const input = await screen.findByPlaceholderText("0x... or eth:0x...");
  expect(screen.getByText("Try These Examples")).toBeTruthy();
  fireEvent.change(input, { target: { value: root } });
  fireEvent.click(screen.getByRole("tab", { name: /Original contract/ }));
  expect(screen.getByDisplayValue("saved contract input")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: /New tab/ }));
  expect(screen.getByDisplayValue(root)).toBe(input);
  fireEvent.click(screen.getByRole("button", { name: "Explore Contract" }));
  await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(1));
  expect(screen.getByDisplayValue("saved contract input")).toBeTruthy();
});

it("loads an example in the new tab without navigating or retaining an empty slot", async () => {
  mount();
  const url = window.location.href;
  fireEvent.click(screen.getByRole("button", { name: "New address tab" }));
  fireEvent.click(
    await screen.findByRole("link", { name: /Uniswap V3 Router/ })
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  expect(screen.queryByRole("tab", { name: /New tab/ })).toBeNull();
  expect(code).toHaveBeenCalledWith({
    address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  });
  expect(window.location.pathname).toBe(
    "/explorer/1/0xE592427A0AEce92De3Edee1F18E0157C05861564"
  );
});

it("rechecks code when changing an address tab's network and replaces it with the contract", async () => {
  code.mockResolvedValueOnce("0x").mockResolvedValueOnce("0x6000");
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked account")
  );
  await screen.findByText(`Explorer grid 1 ${account}`);
  fireEvent.click(screen.getByText("Switch to Polygon"));
  await screen.findByRole("tab", { name: /Linked contract/ });
  expect(client).toHaveBeenLastCalledWith(137);
  expect(code).toHaveBeenLastCalledWith({ address: account });
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  expect(screen.queryByText(`Explorer grid 1 ${account}`)).toBeNull();
  expect(screen.getByRole("textbox", { name: "Draft" })).toBeTruthy();
});

it("shows explorers for the selected network when the address still has no code", async () => {
  code.mockResolvedValue("0x");
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked account")
  );
  await screen.findByText(`Explorer grid 1 ${account}`);
  fireEvent.click(screen.getByText("Switch to Polygon"));
  await screen.findByText(`Explorer grid 137 ${account}`);
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  expect(screen.queryByText(`Explorer grid 1 ${account}`)).toBeNull();
});

it("updates the URL per tab and restores query, fragment and drafts with browser history", async () => {
  mount();
  const originalUrl = window.location.href;
  const originalState = window.history.state;
  fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), {
    target: { value: "preserved original" },
  });
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  const linkedUrl = window.location.href;
  const linkedState = window.history.state;
  fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), {
    target: { value: "preserved linked" },
  });
  fireEvent.click(screen.getByRole("tab", { name: /Original contract/ }));
  expect(window.location.href).toBe(originalUrl);
  expect(screen.getByDisplayValue("preserved original")).toBeTruthy();
  // Simulate the browser moving to the earlier linked entry.
  act(() => {
    window.history.replaceState(linkedState, "", linkedUrl);
    window.dispatchEvent(new PopStateEvent("popstate", { state: linkedState }));
  });
  expect(screen.getByDisplayValue("preserved linked")).toBeTruthy();
  expect(window.location.href).toBe(linkedUrl);
  act(() => {
    window.history.replaceState(originalState, "", originalUrl);
    window.dispatchEvent(
      new PopStateEvent("popstate", { state: originalState })
    );
  });
  expect(screen.getByDisplayValue("preserved original")).toBeTruthy();
  expect(window.location.href).toBe(originalUrl);
});

it("uses the home URL for blank tabs and updates it after an address is loaded", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "New address tab" }));
  const input = await screen.findByPlaceholderText("0x... or eth:0x...");
  expect(window.location.pathname).toBe("/explorer/");
  expect(window.location.hash).toBe("");
  fireEvent.change(input, { target: { value: account } });
  fireEvent.click(screen.getByRole("button", { name: "Explore Contract" }));
  await screen.findByRole("tab", { name: /Linked contract/ });
  expect(window.location.pathname).toBe(`/explorer/1/${account}`);
});

it("persists multiple tabs, restores them on refresh and clears storage after closing all", async () => {
  const first = mount();
  expect(localStorage.getItem(CONTRACT_TABS_STORAGE_KEY)).toBeNull();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  let saved = JSON.parse(localStorage.getItem(CONTRACT_TABS_STORAGE_KEY)!);
  expect(saved.tabs).toHaveLength(2);
  expect(saved.active).toBe(`1:${contract}`);
  first.unmount();
  mount();
  await screen.findByRole("tab", { name: /Linked contract/ });
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  expect(
    screen
      .getByRole("tab", { name: /Original contract/ })
      .getAttribute("aria-selected")
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Close all tabs" }));
  await screen.findByPlaceholderText("0x... or eth:0x...");
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  expect(localStorage.getItem(CONTRACT_TABS_STORAGE_KEY)).toBeNull();
  expect(screen.queryByRole("button", { name: "Close all tabs" })).toBeNull();
  expect(window.location.pathname).toBe("/explorer/");
});

it("ignores invalid saved tabs and remains usable when storage writes fail", async () => {
  localStorage.setItem(
    CONTRACT_TABS_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      tabs: [null, { chainId: 1, address: "invalid" }],
    })
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  mount();
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  await screen.findByRole("tab", { name: /Linked contract/ });
  expect(screen.getAllByRole("tab")).toHaveLength(2);
});

it("uses the known address tag while loading, then replaces it with the fetched contract name", async () => {
  let finish!: (code: string) => void;
  code.mockReturnValue(
    new Promise<string>((resolve) => {
      finish = resolve;
    })
  );
  mount();
  fireEvent.click(
    within(screen.getByRole("tabpanel")).getByText("Open linked contract")
  );
  expect(
    screen
      .getByRole("tab", { name: /Known contract tag/ })
      .getAttribute("aria-selected")
  ).toBe("true");
  expect(screen.getByRole("status")).toBeTruthy();
  await act(async () => {
    finish("0x6000");
  });
  await screen.findByRole("tab", { name: /Linked contract/ });
  expect(screen.queryByRole("tab", { name: /Known contract tag/ })).toBeNull();
});
