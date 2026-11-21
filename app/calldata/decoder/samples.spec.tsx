import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { BeforeFooterSlotContext } from "@/components/BeforeFooterSlot";

const mocks = vi.hoisted(() => ({
  tx: vi.fn(),
  receipt: vi.fn(),
  decode: vi.fn(),
  events: vi.fn(),
  client: vi.fn(),
  query: "",
  copy: vi.fn(),
  lookup: vi.fn(() => { throw new Error("Unexpected enrichment"); }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock("nuqs", async () => {
  const React = await import("react");
  const parser = { withDefault: (value: unknown) => ({ value }) };
  return {
    parseAsString: parser,
    parseAsInteger: parser,
    useQueryState: (key: string, { value }: { value: unknown }) => {
      const initial = new URLSearchParams(mocks.query).get(key);
      const [state, setState] = React.useState(
        initial === null ? value : key === "chainId" ? Number(initial) : initial
      );
      return [state, (next: unknown) => setState(next ?? value)];
    },
  };
});
vi.mock("@/data/common", () => {
  const eth = {
    id: 1,
    blockExplorers: { default: { url: "https://etherscan.io" } },
  };
  const base = {
    id: 8453,
    blockExplorers: { default: { url: "https://basescan.org" } },
  };
  return {
    c: { mainnet: eth, base },
    chainIdToChain: { 1: eth, 8453: base },
    erc3770ShortNameToChain: {},
    networkOptions: [
      { value: 1, label: "Ethereum" },
      { value: 8453, label: "Base" },
    ],
  };
});
vi.mock("@/lib/publicClient", () => ({ getPublicClient: mocks.client }));
vi.mock("@/lib/decoder", () => ({
  decodeRecursive: mocks.decode,
  decodeEvents: mocks.events,
}));
vi.mock("@/utils", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/utils")>(),
  fetchContractAbi: mocks.lookup,
  resolveAddressToName: mocks.lookup,
  getNameAvatar: mocks.lookup,
}));
vi.mock("@/utils/addressLabels", () => ({ fetchAddressLabels: mocks.lookup }));
vi.mock("axios", () => ({ default: { get: mocks.lookup } }));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ getLabel: () => null, isReady: true }),
}));
vi.mock("@monaco-editor/react", () => ({ Editor: () => <div>Editor</div> }));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy, labelText }: any) => labelText
    ? <button onClick={() => mocks.copy(textToCopy)}>{labelText}</button>
    : null,
}));
vi.mock("@/components/InputField", () => ({
  InputField: (props: any) => <input {...props} />,
}));
vi.mock("@/components/DarkButton", () => ({
  DarkButton: ({ isLoading, children, ...props }: any) => (
    <button disabled={isLoading} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({ selectedOption, setSelectedOption, options }: any) => (
    <select
      aria-label={options.length === 2 && options[0].label === "Ethereum" ? "Chain" : "Format"}
      value={selectedOption?.value}
      onChange={(e) =>
        setSelectedOption(
          options.find((o: any) => o.value === Number(e.target.value))
        )
      }
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock("@/components/Tabs/TabsSelector", () => ({
  default: ({ tabs, setSelectedTabIndex }: any) => (
    <div>
      {tabs.map((t: string, i: number) => (
        <button key={t} onClick={() => setSelectedTabIndex(i)}>
          {t}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("./components/CalldataTree", async (importOriginal) => {
  const { CalldataTree } = await importOriginal<typeof import("./components/CalldataTree")>();
  return {
    CalldataTree: (props: React.ComponentProps<typeof CalldataTree>) => (
      <div data-testid={props.functionName ? "decoded" : "event-params"}>
        <CalldataTree {...props} />
      </div>
    ),
  };
});
import { decoderSamples } from "./samples";
import { CalldataDecoderPage } from "./CalldataDecoderPage";

function mount() {
  return render(
    <ChakraProvider>
      <CalldataDecoderPage />
    </ChakraProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query = "";
  mocks.client.mockReturnValue({
    getTransaction: mocks.tx,
    getTransactionReceipt: mocks.receipt,
  });
  mocks.tx.mockResolvedValue({
    input: "0x2cca3237",
    to: "0xabEFBc9fD2F806065b4f3C237d4b59D9A97Bcac7",
  });
  mocks.receipt.mockResolvedValue({ logs: [] });
  mocks.decode.mockResolvedValue({
    functionName: "mint",
    args: [],
    rawArgs: [],
    signature: "mint()",
  });
  mocks.events.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Manually driven animation frames, so tests control when post-layout work runs.
function stubFrames() {
  const frames = new Map<number, FrameRequestCallback>();
  let next = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(next, cb);
    return next++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
  return {
    flush: () =>
      act(async () => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((cb) => cb(0));
      }),
  };
}

// jsdom has no scrollIntoView; record which element asked to scroll and how.
function stubScrollIntoView() {
  const calls: { element: Element; options: unknown }[] = [];
  const original = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (this: Element, options?: unknown) {
    calls.push({ element: this, options });
  };
  return {
    calls,
    restore: () => {
      Element.prototype.scrollIntoView = original;
    },
  };
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
}

describe("decoder transaction examples", () => {
  it("scrolls a revealed saved transaction result into view with its tabs at the top, once per reveal", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const frames = stubFrames();
    const scroll = stubScrollIntoView();
    try {
      vi.stubGlobal("fetch", mocks.lookup);
      stubReducedMotion(false);
      mount();
      const advance = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });

      fireEvent.click(screen.getByRole("button", { name: decoderSamples[0].label }));
      await frames.flush();
      await advance(449);
      await frames.flush();
      expect(scroll.calls).toHaveLength(0); // never during the skeleton
      await advance(1);
      expect(scroll.calls).toHaveLength(0); // waits for the post-layout frame
      await frames.flush();
      expect(scroll.calls).toHaveLength(1);

      const [{ element, options }] = scroll.calls;
      expect(options).toEqual({ behavior: "smooth", block: "start" });
      const calldataTab = screen.getByRole("tab", { name: "Calldata" });
      // The tx tab bar is the anchor's first child, so it lands at the top.
      expect(element.firstElementChild!.contains(calldataTab)).toBe(true);
      expect(element.contains(screen.getByTestId("decoded"))).toBe(true);
      expect(element.contains(screen.getByRole("button", { name: "Decode" }))).toBe(false);

      // Tab clicks, expand/collapse and later frames do not scroll again.
      fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
      fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
      fireEvent.click(screen.getByRole("tab", { name: "Events (1)" }));
      fireEvent.click(screen.getByRole("tab", { name: "Calldata" }));
      await frames.flush();
      await advance(1000);
      await frames.flush();
      expect(scroll.calls).toHaveLength(1);

      // A repeat Decode scrolls again, but only after its own reveal.
      fireEvent.click(screen.getByRole("button", { name: "Decode" }));
      await frames.flush();
      expect(scroll.calls).toHaveLength(1);
      await advance(450);
      await frames.flush();
      expect(scroll.calls).toHaveLength(2);
      expect(scroll.calls[1].element.firstElementChild!.contains(
        screen.getByRole("tab", { name: "Calldata" })
      )).toBe(true);
      expect(mocks.client).not.toHaveBeenCalled();
    } finally {
      scroll.restore();
      vi.useRealTimers();
    }
  }, 15000);

  it.each([
    ["true", "/calldata/decoder"],
    [undefined, "https://calldata.eth.sh/decoder"],
  ])("links the H1 to the clean decoder root (NEXT_PUBLIC_DEVELOPMENT=%s)", (dev, href) => {
    vi.stubEnv("NEXT_PUBLIC_DEVELOPMENT", dev);
    try {
      // Even from a deep link, the heading goes to the query-free root.
      mocks.query = `tx=${encodeURIComponent(decoderSamples[0].explorerUrl)}&chainId=1`;
      mount();
      const heading = screen.getByRole("heading", { level: 1, name: "Calldata Decoder" });
      const link = within(heading).getByRole("link", { name: "Calldata Decoder" });
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBe(href);
      link.focus();
      expect(document.activeElement).toBe(link);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps a custom page title as a plain heading", () => {
    render(
      <ChakraProvider>
        <CalldataDecoderPage headerText="Safe Calldata Decoder" />
      </ChakraProvider>
    );
    const heading = screen.getByRole("heading", { level: 1, name: "Safe Calldata Decoder" });
    expect(within(heading).queryByRole("link")).toBeNull();
  });

  it("scrolls live results with reduced motion, ignoring edits, late events, cancelled reveals and unmount", async () => {
    const frames = stubFrames();
    const scroll = stubScrollIntoView();
    try {
      stubReducedMotion(true);
      // Real decodes return a fresh object every time.
      mocks.decode.mockImplementation(async () => ({
        functionName: "mint", args: [], rawArgs: [], signature: "mint()",
      }));
      let finishEvents!: (value: unknown) => void;
      mocks.events.mockReturnValueOnce(new Promise((resolve) => { finishEvents = resolve; }));
      let view = mount();

      // Non-transaction decode: anchor starts at the decoded-result header.
      fireEvent.change(screen.getByRole("textbox", { name: "Calldata" }), {
        target: { value: "0x12345678" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Decode" }));
      await screen.findByText("Decoded calldata");
      await frames.flush();
      expect(scroll.calls).toHaveLength(1);
      // `auto` inherits the site's CSS smooth scrolling; reduced motion must override it.
      expect(scroll.calls[0].options).toEqual({ behavior: "instant", block: "start" });
      expect(scroll.calls[0].element.firstElementChild!.textContent)
        .toContain("Decoded calldata");
      expect(screen.queryByRole("tab", { name: "Calldata" })).toBeNull();

      // Editing the input keeps the result in place without scrolling.
      fireEvent.change(screen.getByRole("textbox", { name: "Calldata" }), {
        target: { value: "0x1234567890" },
      });
      await frames.flush();
      expect(scroll.calls).toHaveLength(1);

      // A live transaction decode scrolls once; its late events do not.
      fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
      fireEvent.paste(screen.getByPlaceholderText("etherscan link / tx hash"), {
        clipboardData: { getData: () => `https://etherscan.io/tx/0x${"ab".repeat(32)}` },
      });
      await waitFor(() => expect(mocks.events).toHaveBeenCalledOnce());
      await frames.flush();
      expect(scroll.calls).toHaveLength(2);
      expect(scroll.calls[1].element.firstElementChild!.contains(
        screen.getByRole("tab", { name: "Calldata" })
      )).toBe(true);
      await act(async () => {
        finishEvents([{ eventName: "Minted", signature: "Minted()", args: [] }]);
      });
      await screen.findByRole("tab", { name: "Events (1)" });
      await frames.flush();
      expect(scroll.calls).toHaveLength(2);
      view.unmount();

      // A reveal cancelled during the skeleton never scrolls.
      view = mount();
      fireEvent.click(screen.getByRole("button", { name: decoderSamples[1].label }));
      fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), {
        target: { value: "" },
      });
      await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
      await frames.flush();
      expect(screen.queryByTestId("decoded")).toBeNull();
      expect(scroll.calls).toHaveLength(2);

      // A frame still pending at unmount is cancelled.
      fireEvent.click(screen.getByRole("button", { name: decoderSamples[1].label }));
      await screen.findByTestId("decoded");
      view.unmount();
      await frames.flush();
      expect(scroll.calls).toHaveLength(2);
    } finally {
      scroll.restore();
    }
  }, 15000);

  it("offers exactly the two complementary real examples without fetching on mount", () => {
    mount();
    expect(
      screen.getByRole("button", { name: "NFT mint · Zora" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Safe multicall · USDC supply" })
    ).toBeTruthy();
    expect(mocks.tx).not.toHaveBeenCalled();
    expect(mocks.decode).not.toHaveBeenCalled();
  });

  it("presents the examples as two card buttons under a 'Try decoding these:' heading", () => {
    mount();
    expect(
      screen.getByRole("heading", { name: "Try decoding these:" })
    ).toBeTruthy();
    expect(screen.queryByText(/Try a real transaction/)).toBeNull();
    expect(screen.queryByText("Try calldata")).toBeNull();
    const nft = screen.getByRole("button", { name: "NFT mint · Zora" });
    const safe = screen.getByRole("button", {
      name: "Safe multicall · USDC supply",
    });
    for (const card of [nft, safe]) {
      expect(card.tagName).toBe("BUTTON");
      expect(card.getAttribute("type")).toBe("button");
      expect((card as HTMLButtonElement).disabled).toBe(false);
    }
    expect(nft.textContent).toContain("NFT mint");
    expect(safe.textContent).toContain("Safe multicall");
    // Each card previews the decoded call(s), not raw hex or the tx hash,
    // and exposes only that preview as its accessible description.
    const describedBy = (card: HTMLElement) =>
      card
        .getAttribute("aria-describedby")!
        .split(" ")
        .map((id) => document.getElementById(id));
    const nftDescription = describedBy(nft);
    const safeDescription = describedBy(safe);
    expect(nftDescription).toHaveLength(1);
    expect(safeDescription).toHaveLength(1);
    expect(nftDescription[0]!.textContent).toBe(
      "1mint(data, bidShares)↳data: (tokenURI, metadataURI, contentHash, metadataHash)"
    );
    expect(safeDescription[0]!.textContent).toBe(
      "1approve(spender, value)2supply(asset, amount)"
    );
    // Subject labels and footer notes are no longer shown on the cards.
    expect(nft.textContent).toBe(
      "NFT mint1mint(data, bidShares)↳data: (tokenURI, metadataURI, contentHash, metadataHash)Decode"
    );
    expect(safe.textContent).toBe(
      "Safe multicall1approve(spender, value)2supply(asset, amount)Decode"
    );
    for (const removed of [
      "Mints Zora token #20000",
      "2 calls inside Safe execTransaction",
      "USDC supply",
    ]) {
      expect(screen.queryByText(removed, { exact: false })).toBeNull();
    }
    expect(nft.textContent).not.toContain("Zora");
    for (const card of [nft, safe]) {
      expect(card.textContent).toContain("Decode");
      expect(card.textContent).not.toMatch(/0x[0-9a-f]{8}/i);
      // Real button with no nested interactive controls.
      expect(card.querySelector("button, a, input, select")).toBeNull();
    }
    // No-ABI flow keeps calldata as the only inline field.
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Network lookup settings" })
    ).toBeTruthy();
  });

  it("portals the missing-signature trigger into the layout's before-footer slot", async () => {
    const footerSlot = document.createElement("div");
    const footer = document.createElement("footer");
    document.body.append(footerSlot, footer);
    try {
      render(
        <ChakraProvider>
          <BeforeFooterSlotContext.Provider value={footerSlot}>
            <div data-testid="tool-content">
              <CalldataDecoderPage />
            </div>
          </BeforeFooterSlotContext.Provider>
        </ChakraProvider>
      );
      const trigger = screen.getByRole("button", {
        name: "Add a missing signature",
      });
      expect(footerSlot.contains(trigger)).toBe(true);
      expect(screen.getByTestId("tool-content").contains(trigger)).toBe(false);
      expect(footerSlot.nextElementSibling).toBe(footer);
      // The decoder's selector still reaches the portaled form.
      fireEvent.change(screen.getByRole("textbox", { name: "Calldata" }), {
        target: { value: "0xa9059cbb00" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Add a missing signature" })
      );
      const dialog = await screen.findByRole("dialog", {
        name: "Add a missing signature",
      });
      expect(
        (
          within(dialog).getByRole("textbox", {
            name: "4-byte selector",
          }) as HTMLInputElement
        ).value
      ).toBe("0xa9059cbb");
    } finally {
      cleanup();
      footerSlot.remove();
      footer.remove();
    }
  });

  it("falls back to the end of the tool content without a layout slot", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "NFT mint · Zora" }));
    const decoded = await screen.findByTestId("decoded");
    const trigger = screen.getByRole("button", {
      name: "Add a missing signature",
    });
    const slot = screen.getByTestId("signature-registry-slot");
    expect(slot.contains(trigger)).toBe(true);
    const wrapper = slot.parentElement!;
    expect(wrapper.parentElement!.lastElementChild).toBe(wrapper);
    expect(
      decoded.compareDocumentPosition(trigger) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Decode" })
        .compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("shows a brief accessible skeleton before revealing a saved example", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      vi.stubGlobal("fetch", mocks.lookup);
      mount();
      fireEvent.click(screen.getByRole("button", { name: decoderSamples[0].label }));
      const status = screen.getByRole("status", { name: "Preparing example preview" });
      expect(status.getAttribute("aria-busy")).toBe("true");
      expect(screen.queryByTestId("decoded")).toBeNull();
      expect(screen.queryByRole("button", { name: "Copy decoded JSON" })).toBeNull();
      expect(screen.queryByRole("tab", { name: /Events/ })).toBeNull();
      expect(screen.queryByRole("button", { name: decoderSamples[1].label })).toBeNull();
      expect((screen.getByRole("button", { name: "Decode" }) as HTMLButtonElement).disabled)
        .toBe(true);
      await act(async () => { vi.advanceTimersByTime(449); });
      expect(screen.queryByTestId("decoded")).toBeNull();
      await act(async () => { vi.advanceTimersByTime(1); });
      expect(screen.getByTestId("decoded").textContent).toContain("mint");
      expect(screen.queryByRole("status", { name: "Preparing example preview" })).toBeNull();
      expect((screen.getByRole("button", { name: "Decode" }) as HTMLButtonElement).disabled)
        .toBe(false);
      expect(mocks.client).not.toHaveBeenCalled();
      expect(mocks.decode).not.toHaveBeenCalled();
      expect(mocks.events).not.toHaveBeenCalled();
      expect(mocks.lookup).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels stale reveals and restarts preparation on reselect, repeat Decode and unmount", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      vi.stubGlobal("fetch", mocks.lookup);
      const view = mount();
      const preparing = () =>
        screen.queryByRole("status", { name: "Preparing example preview" });
      const advance = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });
      const txInput = () => screen.getByPlaceholderText("etherscan link / tx hash");

      // Leaving the example mid-delay cancels its reveal.
      fireEvent.click(screen.getByRole("button", { name: decoderSamples[0].label }));
      await advance(300);
      fireEvent.change(txInput(), { target: { value: "" } });
      expect(preparing()).toBeNull();
      await advance(1000);
      expect(screen.queryByTestId("decoded")).toBeNull();

      // Reselecting starts a fresh full delay for the newly chosen example.
      fireEvent.click(screen.getByRole("button", { name: decoderSamples[1].label }));
      await advance(449);
      expect(screen.queryByTestId("decoded")).toBeNull();
      expect(preparing()).toBeTruthy();
      await advance(1);
      expect(screen.getByTestId("decoded").textContent).toContain("execTransaction");

      // Repeat Decode on the same example hides the old result, no flash.
      fireEvent.click(screen.getByRole("tab", { name: "Events (1)" }));
      fireEvent.click(screen.getByRole("button", { name: "Decode" }));
      expect(screen.queryByTestId("decoded")).toBeNull();
      expect(screen.queryByText("ExecutionSuccess")).toBeNull();
      expect(screen.queryByRole("button", { name: "Copy decoded JSON" })).toBeNull();
      expect(preparing()).toBeTruthy();
      await advance(450);
      expect(screen.getByTestId("decoded").textContent).toContain("execTransaction");

      // Unmounting mid-delay leaves no pending reveal timer.
      fireEvent.click(screen.getByRole("button", { name: "Decode" }));
      expect(preparing()).toBeTruthy();
      view.unmount();
      expect(vi.getTimerCount()).toBe(0);

      expect(mocks.client).not.toHaveBeenCalled();
      expect(mocks.decode).not.toHaveBeenCalled();
      expect(mocks.events).not.toHaveBeenCalled();
      expect(mocks.lookup).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  }, 15000);

  it.each([
    [decoderSamples[0], "mint", "Transfer"],
    [decoderSamples[1], "execTransaction", "ExecutionSuccess"],
  ] as const)("renders %o and its events from the saved tree", async (sample, name, event) => {
    vi.stubGlobal("fetch", mocks.lookup);
    mocks.client.mockImplementation(() => { throw new Error("Unexpected RPC"); });
    mount();
    fireEvent.click(screen.getByRole("button", { name: sample.label }));
    const tree = await screen.findByTestId("decoded");
    expect(tree.textContent).toContain(name);
    if (sample.id === "nft-mint") {
      expect(within(tree).getByDisplayValue("dmxx")).toBeTruthy();
      expect(tree.querySelector('img[src="/decoder-examples/zora-20000.jpg"]')).toBeTruthy();
      fireEvent.click(within(tree).getByRole("button", { name: "Raw JSON" }));
      const raw = within(tree).getByRole("textbox", { name: "Raw JSON" }) as HTMLTextAreaElement;
      expect(JSON.parse(raw.value).name).toBe("dmxx");
    } else {
      for (const text of ["multiSend()", "approve()", "supply()", "cUSDCv3", "USDC"]) {
        expect(tree.textContent).toContain(text);
      }
      expect(within(tree).getAllByDisplayValue("2900000000000")).toHaveLength(2);
    }
    expect((screen.getByPlaceholderText("etherscan link / tx hash") as HTMLInputElement).value)
      .toBe(sample.explorerUrl);
    expect((screen.getByRole("combobox", { name: "Chain" }) as HTMLSelectElement).value)
      .toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy decoded JSON" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy params" }));
    const decoded = JSON.parse(mocks.copy.mock.calls[0][0]);
    const params = JSON.parse(mocks.copy.mock.calls[1][0]);
    expect(decoded.functionName).toBe(name);
    expect(params).toEqual({ function: decoded.signature, params: decoded.rawArgs });
    expect(params.params).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("tab", { name: "Events (1)" }));
    expect(screen.getByText(event)).toBeTruthy();
    if (sample.id === "nft-mint") expect(screen.getByDisplayValue("20000")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    expect(screen.getByRole("status", { name: "Preparing example preview" })).toBeTruthy();
    expect(await screen.findByTestId("decoded")).toBeTruthy();
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.decode).not.toHaveBeenCalled();
    expect(mocks.events).not.toHaveBeenCalled();
    expect(mocks.lookup).not.toHaveBeenCalled();
  }, 15000);

  it("pins examples to Ethereum even after choosing another draft network", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    fireEvent.paste(screen.getByPlaceholderText("etherscan link / tx hash"), {
      clipboardData: { getData: () => "0x" + "ab".repeat(32) },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Chain" }), {
      target: { value: "8453" },
    });
    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), {
      target: { value: "" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Safe multicall · USDC supply" })
    );
    expect((await screen.findByTestId("decoded")).textContent).toContain("execTransaction");
    expect(mocks.client).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("combobox", { name: "Chain" }) as HTMLSelectElement)
        .value
    ).toBe("1");
  });

  it("does not overwrite a manual calldata draft with suggestions", () => {
    mount();
    fireEvent.change(screen.getByRole("textbox", { name: "Calldata" }), {
      target: { value: "0x12345678" },
    });
    expect(
      screen.queryByRole("button", { name: "NFT mint · Zora" })
    ).toBeNull();
    expect(mocks.tx).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    expect(mocks.decode).toHaveBeenCalledWith({
      calldata: "0x12345678",
      address: undefined,
      chainId: undefined,
      abi: undefined,
    });
  });

  it("preserves typed explorer URL + Decode manual entry", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    const hash = "0x" + "ab".repeat(32);
    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), {
      target: { value: `https://basescan.org/tx/${hash}` },
    });
    expect(mocks.tx).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await waitFor(() => expect(mocks.tx).toHaveBeenCalledWith({ hash }));
    expect(mocks.client).toHaveBeenCalledWith(8453);
    expect(mocks.decode).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 8453 })
    );
  });

  it("preserves pasted hash network selection then Decode", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    const hash = "0x" + "ab".repeat(32);
    fireEvent.paste(screen.getByPlaceholderText("etherscan link / tx hash"), {
      clipboardData: { getData: () => hash },
    });
    expect(mocks.tx).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", { name: "Chain" }), {
      target: { value: "8453" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await waitFor(() => expect(mocks.tx).toHaveBeenCalledWith({ hash }));
    expect(mocks.client).toHaveBeenCalledWith(8453);
  });

  it("preserves explorer URL paste auto-decode", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    const hash = "0x" + "ab".repeat(32);
    fireEvent.paste(screen.getByPlaceholderText("etherscan link / tx hash"), {
      clipboardData: { getData: () => `https://etherscan.io/tx/${hash}` },
    });
    await waitFor(() => expect(mocks.tx).toHaveBeenCalledWith({ hash }));
    expect(mocks.client).toHaveBeenCalledWith(1);
  });

  it("preserves transaction deep links without showing examples", async () => {
    const hash = "0x" + "ab".repeat(32);
    mocks.query = `tx=${hash}&chainId=8453`;
    mount();
    await waitFor(() => expect(mocks.tx).toHaveBeenCalledWith({ hash }));
    expect(mocks.client).toHaveBeenCalledWith(8453);
    expect(
      screen.queryByRole("button", { name: "NFT mint · Zora" })
    ).toBeNull();
  });

  it("reopens the card's canonical explorer deep link", async () => {
    const sample = decoderSamples[1];
    mocks.query = `tx=${encodeURIComponent(sample.explorerUrl)}&chainId=1`;
    mount();
    // Curated deep links use the same brief preparation as card clicks.
    expect(screen.getByRole("status", { name: "Preparing example preview" })).toBeTruthy();
    expect(screen.queryByTestId("decoded")).toBeNull();
    expect((await screen.findByTestId("decoded")).textContent).toContain("execTransaction");
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("restores a curated deep link, then leaves the snapshot when its network changes", async () => {
    const sample = decoderSamples[0];
    mocks.query = `tx=${sample.hash}&chainId=1`;
    mount();
    expect(within(await screen.findByTestId("decoded")).getByDisplayValue("dmxx")).toBeTruthy();
    expect(mocks.client).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", { name: "Chain" }), {
      target: { value: "8453" },
    });
    expect(screen.queryByTestId("decoded")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await waitFor(() => expect(mocks.client).toHaveBeenCalledWith(8453));
  });

  it("clears a selected snapshot and can select the same card again", async () => {
    mount();
    const sample = decoderSamples[0];
    const clickCard = () => fireEvent.click(screen.getByRole("button", { name: sample.label }));
    clickCard();
    expect(await screen.findByTestId("decoded")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), {
      target: { value: "" },
    });
    expect(screen.queryByTestId("decoded")).toBeNull();
    clickCard();
    expect(await screen.findByTestId("decoded")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "No ABI" }));
    expect(screen.queryByTestId("decoded")).toBeNull();
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("keeps curated hashes on other chains live", async () => {
    mocks.query = `tx=${decoderSamples[0].hash}&chainId=8453`;
    mount();
    await waitFor(() => expect(mocks.client).toHaveBeenCalledWith(8453));
    expect(mocks.tx).toHaveBeenCalledWith({ hash: decoderSamples[0].hash });
  });

  it("keeps a manually entered curated explorer URL live and retryable", async () => {
    mocks.tx.mockRejectedValueOnce(new Error("RPC unavailable"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), {
      target: { value: decoderSamples[0].explorerUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await screen.findByText("Can't fetch transaction");
    expect(screen.queryByTestId("decoded")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await screen.findByTestId("decoded");
    expect(mocks.tx).toHaveBeenCalledTimes(2);
    expect(mocks.tx.mock.calls[1][0]).toEqual(mocks.tx.mock.calls[0][0]);
  });

  it("clears superseded transaction event loading after a standalone decode", async () => {
    let finishStaleEvents!: (value: unknown) => void;
    let finishActiveEvents!: (value: unknown) => void;
    mocks.events
      .mockReturnValueOnce(new Promise((resolve) => { finishStaleEvents = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { finishActiveEvents = resolve; }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), {
      target: { value: `https://etherscan.io/tx/0x${"ab".repeat(32)}` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await screen.findByRole("tab", { name: "Events (...)" });
    await waitFor(() => expect(mocks.events).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "No ABI" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Calldata" }), {
      target: { value: "0x12345678" },
    });
    mocks.decode.mockResolvedValueOnce({
      functionName: "standalone", args: [], rawArgs: [], signature: "standalone()",
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await waitFor(() => expect(screen.getByTestId("decoded").textContent).toContain("standalone"));
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    expect(screen.getByRole("tab", { name: "Events (0)" })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), {
      target: { value: `https://etherscan.io/tx/0x${"cd".repeat(32)}` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await waitFor(() => expect(mocks.events).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("tab", { name: "Events (...)" }));
    await act(async () => {
      finishStaleEvents([{ eventName: "StaleEvent", signature: "StaleEvent()", args: [] }]);
    });
    expect(screen.getByRole("tab", { name: "Events (...)" })).toBeTruthy();
    expect(screen.queryByText("StaleEvent")).toBeNull();
    await act(async () => {
      finishActiveEvents([{ eventName: "ActiveEvent", signature: "ActiveEvent()", args: [] }]);
    });
    expect(screen.getByRole("tab", { name: "Events (1)" })).toBeTruthy();
    expect(screen.getByText("ActiveEvent")).toBeTruthy();
  });

  it("ignores an older live decode and events after selecting a sample", async () => {
    let finishDecode!: (value: unknown) => void;
    let finishEvents!: (value: unknown) => void;
    mocks.decode.mockReturnValueOnce(new Promise(resolve => { finishDecode = resolve; }));
    mocks.events.mockReturnValueOnce(new Promise(resolve => { finishEvents = resolve; }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "from Tx" }));
    const input = screen.getByPlaceholderText("etherscan link / tx hash");
    fireEvent.paste(input, {
      clipboardData: { getData: () => `https://etherscan.io/tx/0x${"ab".repeat(32)}` },
    });
    await waitFor(() => expect(mocks.events).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), { target: { value: "" } });
    // The live decode keeps cards hidden until loading settles. Starting a new
    // hash draft without a selected network exits that pending decode.
    fireEvent.paste(screen.getByPlaceholderText("etherscan link / tx hash"), {
      clipboardData: { getData: () => "0x" + "cd".repeat(32) },
    });
    fireEvent.change(screen.getByPlaceholderText("etherscan link / tx hash"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Safe multicall · USDC supply" }));
    await act(async () => {
      finishDecode({ functionName: "stale", args: [], rawArgs: [], signature: "stale()" });
      finishEvents([{ eventName: "StaleEvent", signature: "StaleEvent()", args: [] }]);
    });
    expect((await screen.findByTestId("decoded")).textContent).toContain("execTransaction");
    expect(screen.getByTestId("decoded").textContent).not.toContain("stale");
    fireEvent.click(screen.getByRole("tab", { name: "Events (1)" }));
    expect(screen.getByText("ExecutionSuccess")).toBeTruthy();
    expect(screen.queryByText("StaleEvent")).toBeNull();
  });
});
