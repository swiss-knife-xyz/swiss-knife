import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { AddressInput } from "./inputs/AddressInput";
import {
  GNS_NAME_NFT_ADDRESS,
  WNS_NAME_NFT_ADDRESS,
} from "@/lib/nameServiceContracts";

const state = vi.hoisted(() => ({
  reverse: "",
  changed: vi.fn(),
  disabled: vi.fn(),
}));
const rpc = vi.hoisted(() => ({
  getEnsAddress: vi.fn(),
  getEnsName: vi.fn(),
  getEnsAvatar: vi.fn(),
  readContract: vi.fn(),
}));
vi.mock("wagmi", () => ({ useAccount: () => ({}) }));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => rpc }));
vi.mock("@/components/fnParams/inputs", () => ({
  InputInfo: () => <span>Recipient</span>,
}));
vi.mock("@/components/ContractTabs", () => ({
  ContractAddressLink: ({ children, href }: any) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: async () => [],
}));
vi.mock("@/utils", async () => ({
  ...(await import("@/lib/nameResolution")),
  getPath: (s: string) => `/${s}/`,
  slicedText: (s: string) => s,
  fetchContractAbi: vi.fn(),
}));
const address = "0x0000000000000000000000000000000000000001";
function Field({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <AddressInput
      chainId={1}
      input={{ type: "address", name: "recipient" }}
      aria-label="Recipient address"
      value={value}
      onChange={(event) => {
        state.changed(event.target.value);
        setValue(event.target.value);
      }}
      setFunctionIsDisabled={state.disabled}
      hideTags
      hideQuickFillButtons
    />
  );
}
async function resolve() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  state.reverse = "";
  rpc.getEnsAddress.mockReset().mockResolvedValue(address);
  rpc.getEnsName.mockReset().mockResolvedValue(null);
  rpc.getEnsAvatar.mockReset().mockResolvedValue(null);
  rpc.readContract
    .mockReset()
    .mockImplementation(async ({ address: registry, functionName }: any) => {
      if (functionName === "addr") return address;
      if (functionName === "reverseResolve") {
        if (
          registry === GNS_NAME_NFT_ADDRESS &&
          state.reverse.endsWith(".gwei")
        )
          return state.reverse;
        if (registry === WNS_NAME_NFT_ADDRESS && state.reverse.endsWith(".wei"))
          return state.reverse;
      }
      return "";
    });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([
  "alice.eth",
  "sub.alice.eth",
  "alice.gwei",
  "sub.alice.gwei",
  "alice.wei",
  "sub.alice.wei",
])(
  "resolves entered %s to the raw address used by contract calls",
  async (name) => {
    render(
      <ChakraProvider>
        <Field initial={name} />
      </ChakraProvider>
    );
    await resolve();
    expect(
      (
        screen.getByRole("textbox", {
          name: "Recipient address",
        }) as HTMLInputElement
      ).value
    ).toBe(address);
    expect(screen.getByText(name)).toBeTruthy();
    expect(state.changed).toHaveBeenCalledWith(address);
    expect(state.disabled.mock.calls.at(-1)?.[0] ?? false).toBe(false);
  }
);

it.each(["alice.gwei", "alice.wei"])(
  "shows %s on reverse resolution without changing the address value",
  async (name) => {
    state.reverse = name;
    render(
      <ChakraProvider>
        <Field initial={address} />
      </ChakraProvider>
    );
    await resolve();
    expect(screen.getByText(name)).toBeTruthy();
    expect(
      (
        screen.getByRole("textbox", {
          name: "Recipient address",
        }) as HTMLInputElement
      ).value
    ).toBe(address);
    expect(state.changed).not.toHaveBeenCalled();
  }
);

it("ignores a name lookup after the address input is changed or cleared", async () => {
  let finish!: (value: string) => void;
  rpc.getEnsAddress.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(
    <ChakraProvider>
      <Field initial="alice.gwei" />
    </ChakraProvider>
  );
  await resolve();
  fireEvent.change(screen.getByRole("textbox", { name: "Recipient address" }), {
    target: { value: "" },
  });
  await act(async () => finish(address));
  expect(
    (
      screen.getByRole("textbox", {
        name: "Recipient address",
      }) as HTMLInputElement
    ).value
  ).toBe("");
  expect(state.changed).not.toHaveBeenCalledWith(address);
  expect(state.disabled).toHaveBeenLastCalledWith(false);
});
