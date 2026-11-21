import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";

const mocks = vi.hoisted(() => ({
  tx: vi.fn(),
  receipt: vi.fn(),
  decode: vi.fn(),
  events: vi.fn(),
  client: vi.fn(),
  query: "",
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
      return React.useState(
        initial === null ? value : key === "chainId" ? Number(initial) : initial
      );
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
vi.mock("@/utils", () => ({
  startHexWith0x: (s: string) => (s.startsWith("0x") ? s : `0x${s}`),
  resolveERC3770Address: (address: string) => ({ address }),
}));
vi.mock("@monaco-editor/react", () => ({ Editor: () => <div>Editor</div> }));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
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
      aria-label="Chain"
      value={selectedOption.value}
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
vi.mock("./components/CalldataTree", () => ({
  CalldataTree: ({ functionName, chainId }: any) => (
    <div data-testid="decoded">
      {functionName} on {chainId}
    </div>
  ),
}));
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
afterEach(cleanup);

describe("decoder transaction examples", () => {
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
  it.each([
    [
      "NFT mint · Zora",
      "0xb0f5a58df0ced3e28f113af534b0e6327e7be66539a9d794f95034fc28cd3647",
    ],
    [
      "Safe multicall · USDC supply",
      "0x86091a6ec8e5e370cd01bf5fbf25e260ef177800b4ce57fd24d699cfc5ea9b06",
    ],
  ])(
    "loads %s with one click through the existing transaction decoder",
    async (label, hash) => {
      mount();
      fireEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(mocks.tx).toHaveBeenCalledWith({ hash }));
      expect(mocks.client).toHaveBeenCalledWith(1);
      expect(mocks.tx).toHaveBeenCalledTimes(1);
      expect(mocks.decode).toHaveBeenCalledWith({
        calldata: "0x2cca3237",
        address: "0xabEFBc9fD2F806065b4f3C237d4b59D9A97Bcac7",
        chainId: 1,
        abi: undefined,
      });
      expect(mocks.receipt).toHaveBeenCalledWith({ hash });
      expect(
        (
          screen.getByPlaceholderText(
            "etherscan link / tx hash"
          ) as HTMLInputElement
        ).value
      ).toBe(`https://etherscan.io/tx/${hash}`);
      expect(
        (screen.getByRole("combobox", { name: "Chain" }) as HTMLSelectElement)
          .value
      ).toBe("1");
      expect(screen.getByTestId("decoded").textContent).toContain("mint on 1");
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
  );

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
    await waitFor(() => expect(mocks.decode).toHaveBeenCalled());
    expect(mocks.client).toHaveBeenLastCalledWith(1);
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

  it("allows retry with the existing Decode button after a sample fetch failure", async () => {
    mocks.tx.mockRejectedValueOnce(new Error("RPC unavailable"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "NFT mint · Zora" }));
    await screen.findByText("Can't fetch transaction");
    expect(screen.queryByTestId("decoded")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Decode" }));
    await screen.findByTestId("decoded");
    expect(mocks.tx).toHaveBeenCalledTimes(2);
    expect(mocks.tx.mock.calls[1][0]).toEqual(mocks.tx.mock.calls[0][0]);
  });
});
