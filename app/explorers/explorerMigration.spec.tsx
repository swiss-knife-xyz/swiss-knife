import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import ContractHome from "@/app/explorer/page";
import { ExplorerLayout } from "./ExplorerLayout";
import DirectoryHome from "./page";
import { ExplorerGridBase } from "@/components/explorer/ExplorerGridBase";
import { ExplorerType } from "@/types";
import { addressExplorers } from "@/data/addressExplorers";

const state = vi.hoisted(() => ({
  push: vi.fn(),
  path: "/explorers",
  segments: [] as string[],
  query: new URLSearchParams(),
  resolveName: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
  useSelectedLayoutSegments: () => state.segments,
  useSearchParams: () => state.query,
}));
vi.mock("@/hooks/useTopLoaderRouter", () => ({
  useTopLoaderRouter: () => ({ push: state.push }),
}));
vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: any) => <main>{children}</main>,
}));
vi.mock("@/components/AddressBook", () => ({ AddressLabelModal: () => null }));
vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({
    openSelector: vi.fn(),
    getLabel: () => null,
    isReady: true,
  }),
}));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: async () => [],
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  resolveNameToAddress: state.resolveName,
  resolveAddressToName: async () => null,
  getNameAvatar: async () => null,
}));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({ options, selectedOption, setSelectedOption }: any) => (
    <select
      aria-label="Network"
      value={selectedOption.value}
      onChange={(e) =>
        setSelectedOption(
          options.flatMap((entry: any) => entry.options ?? [entry]).find((o: any) => String(o.value) === e.target.value)
        )
      }
    >
      {options.flatMap((entry: any) => entry.options ?? [entry]).map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock("nuqs", async () => {
  const React = await import("react");
  return {
    parseAsBoolean: { withDefault: (v: boolean) => v },
    useQueryState: (_key: string, initial: boolean) => React.useState(initial),
  };
});
// URL/router, wallet shell and name resolution are boundaries; real forms,
// directory layout, data, filter algorithm, explorer cards and getPath are used.
const address = "0x0000000000000000000000000000000000000001";
const other = "0x0000000000000000000000000000000000000002";
const storage = new Map<string, string>();
beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
  state.push.mockReset();
  state.resolveName.mockReset();
  storage.clear();
  state.path = "/explorers";
  state.segments = [];
  state.query = new URLSearchParams();
  delete process.env.NEXT_PUBLIC_DEVELOPMENT;
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const wrap = (child: React.ReactNode) => (
  <ChakraProvider>{child}</ChakraProvider>
);

it("contract landing keeps the existing interactive form and opens chain/address on explorer host", async () => {
  render(wrap(<ContractHome />));
  expect(
    screen
      .getByRole("link", { name: "Explorer Directory" })
      .getAttribute("href")
  ).toBe("https://eth.sh/explorers/");
  expect(
    screen.getByRole("link", { name: /USDC/ }).getAttribute("href")
  ).toContain("https://explorer.eth.sh/1/");
  fireEvent.change(screen.getByPlaceholderText("0x... or eth:0x... or explorer URL"), {
    target: { value: address },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Network" }), {
    target: { value: "8453" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Explore Contract" }));
  expect(state.push).toHaveBeenCalledWith(
    `https://explorer.eth.sh/8453/${address}`
  );
});

it("directory home keeps its examples as directory searches", () => {
  render(
    wrap(
      <ExplorerLayout>
        <DirectoryHome />
      </ExplorerLayout>
    )
  );
  expect(screen.queryByRole("link", { name: "Contract Explorer" })).toBeNull();
  expect(
    screen
      .getByRole("link", { name: /UniV3 Position Manager/ })
      .getAttribute("href")
  ).toContain("https://eth.sh/explorers/address/");
  expect(
    screen
      .getByRole("link", { name: /Seaport MatchOrders/ })
      .getAttribute("href")
  ).toContain("https://eth.sh/explorers/tx/");
});

it("directory address bookmarks do not navigate on mount or drop filters; explicit searches retain query", async () => {
  state.path = `/explorers/address/${address}`;
  state.segments = ["address", address];
  state.query = new URLSearchParams("forContracts=true&tag=kept");
  render(
    wrap(
      <ExplorerLayout>
        <div>Directory results</div>
      </ExplorerLayout>
    )
  );
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("address / ens / transaction")
    ).toBeTruthy()
  );
  expect(state.push).not.toHaveBeenCalled();
  fireEvent.change(screen.getByPlaceholderText("address / ens / transaction"), {
    target: { value: other },
  });
  fireEvent.keyDown(
    screen.getByPlaceholderText("address / ens / transaction"),
    { key: "Enter" }
  );
  await waitFor(() =>
    expect(state.push).toHaveBeenCalledWith(
      `https://eth.sh/explorers/address/${other}?forContracts=true&tag=kept`
    )
  );
});

it("raw bookmarked ENS resolution keeps the directory filter", async () => {
  state.path = "/explorers/vitalik.eth";
  state.segments = ["vitalik.eth"];
  state.query = new URLSearchParams("forContracts=true");
  state.resolveName.mockResolvedValue(address);
  render(
    wrap(
      <ExplorerLayout>
        <div>Search</div>
      </ExplorerLayout>
    )
  );
  await waitFor(() =>
    expect(state.push).toHaveBeenCalledWith(
      `https://eth.sh/explorers/address/${address}?forContracts=true`
    )
  );
});

it("directory keeps its real explorer dataset and name / contract-only filtering", async () => {
  state.query = new URLSearchParams("forContracts=true");
  const names = Object.keys(addressExplorers);
  const included = names.find((name) => addressExplorers[name].forContracts)!;
  const excluded = names.find((name) => !addressExplorers[name].forContracts)!;
  expect(names.length).toBeGreaterThan(20);
  render(
    wrap(
      <ExplorerGridBase
        explorersData={addressExplorers}
        explorerType={ExplorerType.ADDRESS}
        addressOrTx={address}
      />
    )
  );
  await waitFor(() =>
    expect(screen.getAllByText(included).length).toBeGreaterThan(0)
  );
  expect(screen.queryByText(excluded)).toBeNull();
  fireEvent.change(screen.getByPlaceholderText("Search explorers..."), {
    target: { value: "not-a-real-explorer-zzzz" },
  });
  await waitFor(() => expect(screen.queryByText(included)).toBeNull());
  fireEvent.change(screen.getByPlaceholderText("Search explorers..."), {
    target: { value: included },
  });
  await waitFor(() =>
    expect(screen.getAllByText(included).length).toBeGreaterThan(0)
  );
});

it("pasting a chain-prefixed directory address strips its prefix, filters the chain and submits", async () => {
  state.query = new URLSearchParams("forContracts=true&tag=kept");
  render(wrap(<ExplorerLayout><div>Directory results</div></ExplorerLayout>));
  const input = screen.getByRole("textbox", { name: "Blockchain address, ENS name, or transaction hash" });
  fireEvent.paste(input, { clipboardData: { getData: () => `base:${other}` } });
  expect((input as HTMLInputElement).value).toBe(other);
  await waitFor(() => expect(state.push).toHaveBeenCalledExactlyOnceWith(
    `https://eth.sh/explorers/address/${other}?forContracts=true&tag=kept&chainId=8453`
  ));
});

it("directory chain query applies to result filters and updates for another pasted chain", async () => {
  state.query = new URLSearchParams("chainId=8453");
  const view = render(wrap(<ExplorerGridBase explorersData={addressExplorers} explorerType={ExplorerType.ADDRESS} addressOrTx={address} />));
  expect(screen.getByRole("button", { name: "Chains (1)" })).toBeTruthy();
  state.query = new URLSearchParams("chainId=1");
  view.rerender(wrap(<ExplorerGridBase explorersData={addressExplorers} explorerType={ExplorerType.ADDRESS} addressOrTx={address} />));
  fireEvent.click(screen.getByRole("button", { name: "Chains (1)" }));
  expect((await screen.findByRole("button", { name: /^Ethereum/ })).getAttribute("aria-pressed")).toBe("true");
});

it("searches chain filters by name and ID without losing selected chains", async () => {
  render(wrap(<ExplorerGridBase explorersData={addressExplorers} explorerType={ExplorerType.ADDRESS} addressOrTx={address} />));
  fireEvent.click(screen.getByRole("button", { name: "Chains" }));
  const search = await screen.findByRole("textbox", { name: "Search chains" });
  await waitFor(() => expect(document.activeElement).toBe(search));
  fireEvent.change(search, { target: { value: "bAsE" } });
  const base = screen.getByRole("button", { name: /^Base/ });
  expect(screen.queryByRole("button", { name: /^Ethereum/ })).toBeNull();
  fireEvent.click(base);
  expect(base.getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(search, { target: { value: "42161" } });
  expect(screen.getByRole("button", { name: /^Arbitrum/ })).toBeTruthy();
  fireEvent.change(search, { target: { value: "not-a-chain" } });
  expect(screen.getByText("No chains found.")).toBeTruthy();
  fireEvent.change(search, { target: { value: "" } });
  expect(screen.getByRole("button", { name: /^Base/ }).getAttribute("aria-pressed")).toBe("true");
});

it("promotes the registry's native explorer for URL and manually selected chains", async () => {
  state.query = new URLSearchParams("chainId=8453");
  render(wrap(<ExplorerGridBase explorersData={addressExplorers} explorerType={ExplorerType.ADDRESS} addressOrTx={address} />));
  const before = (first: string, second: string) => {
    expect(screen.getByText(first).compareDocumentPosition(screen.getByText(second)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  };
  before("Basescan", "ABINinja");
  fireEvent.click(screen.getByRole("button", { name: "Chains (1)" }));
  fireEvent.click(await screen.findByRole("button", { name: /^Base Base/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Ethereum Ethereum/ }));
  before("Etherscan", "ABINinja");
});

it("orders native explorer entries by selected chains and retains the remaining order", async () => {
  const { orderDirectoryExplorers } = await import("@/lib/explorerDirectory");
  const { txExplorers } = await import("@/data/txExplorers");
  for (const entries of [addressExplorers, txExplorers]) {
    const names = Object.keys(entries);
    expect(orderDirectoryExplorers(names, entries, [])).toEqual(names);
    expect(orderDirectoryExplorers(names, entries, [8453])[0]).toBe("Basescan");
    expect(orderDirectoryExplorers(names, entries, [42161, 8453]).slice(0, 2)).toEqual(["Arbitrum", "Basescan"]);
    expect(orderDirectoryExplorers(names, entries, [999999999])).toEqual(names);
    const sorted = orderDirectoryExplorers(names, entries, [8453]);
    expect(sorted.slice(1)).toEqual(names.filter(name => name !== "Basescan"));
  }
});
