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
import { MockTokenTool, type MockWallet } from "./MockTokenTool";
vi.mock("./MockTokenVerification", () => ({ MockTokenVerification: () => null }));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({
    ariaLabel,
    options,
    selectedOption,
    setSelectedOption,
    isDisabled,
  }: any) => {
    const entries = options.flatMap((item: any) => item.options ?? [item]);
    return (
      <select
        aria-label={ariaLabel}
        disabled={isDisabled}
        value={selectedOption?.value ?? ""}
        onChange={(event) =>
          setSelectedOption(
            entries.find(
              (option: any) => String(option.value) === event.target.value
            )
          )
        }
      >
        <option value="">Select network</option>
        {entries.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
}));
vi.mock("@/lib/publicClient", () => ({ getPublicClient: () => ({}) }));
vi.mock("wagmi", () => ({ useAccount: () => ({}) }));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
vi.mock("@/utils/addressLabels", () => ({
  fetchAddressLabels: async () => [],
}));
vi.mock("@/lib/nameResolution", () => ({
  resolveNameToAddress: vi.fn(
    async () => "0x1111111111111111111111111111111111111111"
  ),
  resolveAddressToName: async () => undefined,
  getNameAvatar: async () => undefined,
  isResolvableName: (value: string) => value.endsWith(".eth"),
}));
const account = "0x1111111111111111111111111111111111111111" as const;
const hash = `0x${"ab".repeat(32)}` as const;
function fixture(chainId = 11155111) {
  return {
    account,
    chainId,
    switchChain: vi.fn().mockResolvedValue(undefined),
    submit: vi.fn().mockResolvedValue(hash),
    receipt: vi.fn().mockResolvedValue({
      status: "success",
      contractAddress: "0x2222222222222222222222222222222222222222",
    }),
  } satisfies MockWallet;
}
function mount(wallet = fixture()) {
  return {
    ...render(
      <ChakraProvider>
        <MockTokenTool wallet={wallet} />
      </ChakraProvider>
    ),
    wallet,
  };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function recipient() {
  fireEvent.change(screen.getByLabelText("Initial recipient"), {
    target: { value: account },
  });
}
it("deploys directly from current inputs without a gas review or consent step", async () => {
  const { wallet } = mount();
  expect(
    (screen.getByLabelText("Deployment network") as HTMLSelectElement).value
  ).toBe("11155111");
  expect(screen.getByText("Token (TKN)")).toBeTruthy();
  expect(screen.getByText("1,000,000")).toBeTruthy();
  recipient();
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByText("Transaction submitted");
  expect(wallet.submit).toHaveBeenCalledTimes(1);
  expect(wallet.submit.mock.calls[0][0].args[3]).toBe(
    1000000000000000000000000n
  );
  expect(screen.queryByText("Review deployment")).toBeNull();
  expect(screen.queryByRole("checkbox")).toBeNull();
  await screen.findByText("Deployment confirmed", {}, { timeout: 4500 });
  expect(
    screen
      .getByRole("link", { name: "Interact with the contract" })
      .getAttribute("href")
  ).toContain("11155111/0x2222");
  expect(
    screen.queryByText(`${hash.slice(0, 10)}…${hash.slice(-8)}`)
  ).toBeNull();
  expect(
    screen
      .getByRole("link", { name: "Open contract on block explorer" })
      .getAttribute("href")
  ).toBe(
    "https://sepolia.etherscan.io/address/0x2222222222222222222222222222222222222222"
  );
});
it("rejects invalid recipient details before requesting the wallet", async () => {
  const { wallet } = mount();
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByText(/Initial recipient must/);
  expect(wallet.submit).not.toHaveBeenCalled();
});
it("locks duplicate deployment requests and preserves uncertain wallet status", async () => {
  const wallet = fixture();
  let reject!: (error: Error) => void;
  wallet.submit.mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      })
  );
  mount(wallet);
  recipient();
  const deploy = screen.getByRole("button", { name: "Deploy" });
  fireEvent.click(deploy);
  fireEvent.click(deploy);
  expect(wallet.submit).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("tab", { name: "ERC721" }).hasAttribute("disabled")
  ).toBe(true);
  await act(async () => reject(new Error("Unknown wallet result")));
  await screen.findByText(/No transaction hash returned/);
  expect(screen.queryByRole("button", { name: "Deploy" })).toBeNull();
  expect(wallet.submit).toHaveBeenCalledTimes(1);
});
it.each(["ERC721", "ERC1155"])(
  "deploys %s directly with metadata",
  async (standard) => {
    const { wallet } = mount();
    fireEvent.click(screen.getByRole("tab", { name: standard }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "My Collection" },
    });
    fireEvent.change(screen.getByLabelText("Symbol"), {
      target: { value: "NFT" },
    });
    fireEvent.change(screen.getByLabelText(/metadata URI/i), {
      target: { value: "ipfs://fixture/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
    await screen.findByText("Transaction submitted");
    expect(wallet.submit.mock.calls[0][0].standard).toBe(standard);
    expect(wallet.submit.mock.calls[0][0].args).toEqual([
      "My Collection",
      "NFT",
      "ipfs://fixture/",
    ]);
  }
);
it("retains edits across tabs and uses exact ETH or Wei input for deployment", async () => {
  const { wallet } = mount();
  const supply = screen.getByLabelText("Initial supply");
  const units = screen
    .getAllByRole("combobox")
    .find((element) =>
      Array.from((element as HTMLSelectElement).options).some(
        (option) => option.value === "ETH"
      )
    ) as HTMLSelectElement;
  expect(units.value).toBe("ETH");
  fireEvent.change(supply, { target: { value: "1.000000000000000001" } });
  fireEvent.change(units, { target: { value: "Wei" } });
  await waitFor(() =>
    expect((supply as HTMLInputElement).value).toBe("1000000000000000001")
  );
  fireEvent.change(supply, { target: { value: "2000000000000000001" } });
  fireEvent.click(screen.getByRole("tab", { name: "ERC721" }));
  fireEvent.click(screen.getByRole("tab", { name: "ERC20" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Initial supply") as HTMLInputElement).value
    ).toBe("2.000000000000000001")
  );
  recipient();
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByText("Transaction submitted");
  expect(wallet.submit.mock.calls[0][0].args[3]).toBe(2000000000000000001n);
});
it("disables deployment for invalid supply", () => {
  const { wallet } = mount();
  fireEvent.change(screen.getByLabelText("Initial supply"), {
    target: { value: "invalid" },
  });
  expect(
    screen.getByRole("button", { name: "Deploy" }).hasAttribute("disabled")
  ).toBe(true);
  expect(wallet.submit).not.toHaveBeenCalled();
});
it("resolves a recipient name before direct deployment", async () => {
  const { wallet } = mount();
  fireEvent.change(screen.getByLabelText("Initial recipient"), {
    target: { value: "recipient.eth" },
  });
  await waitFor(
    () =>
      expect(
        (screen.getByLabelText("Initial recipient") as HTMLInputElement).value
      ).toBe(account),
    { timeout: 2000 }
  );
  fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
  await screen.findByText("Transaction submitted");
  expect(wallet.submit.mock.calls[0][0].args[2]).toBe(account);
});
it("switches chain before offering Deploy and does not deploy automatically", async () => {
  const wallet = fixture(1);
  const view = mount(wallet);
  fireEvent.change(screen.getByLabelText("Deployment network"), {
    target: { value: "100" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Switch Chain" }));
  await waitFor(() =>
    expect(wallet.switchChain).toHaveBeenCalledWith(100)
  );
  view.rerender(
    <ChakraProvider>
      <MockTokenTool wallet={{ ...wallet, chainId: 100 }} />
    </ChakraProvider>
  );
  expect(screen.getByRole("button", { name: "Deploy" })).toBeTruthy();
  expect(wallet.submit).not.toHaveBeenCalled();
});
it("allows retrying a rejected chain switch without deploying", async () => {
  const wallet = fixture(1);
  wallet.switchChain.mockRejectedValueOnce(new Error("Rejected"));
  mount(wallet);
  fireEvent.click(screen.getByRole("button", { name: "Switch Chain" }));
  await screen.findByText("Chain switch failed. Try again in your wallet.");
  expect(
    screen
      .getByRole("button", { name: "Switch Chain" })
      .hasAttribute("disabled")
  ).toBe(false);
  expect(wallet.submit).not.toHaveBeenCalled();
});
it("automatically retries pending receipts, shows a revert and never resends", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const wallet = fixture();
  wallet.receipt.mockRejectedValueOnce(new Error("Receipt not mined yet"));
  wallet.receipt.mockResolvedValueOnce({
    status: "reverted",
    contractAddress: null,
  } as any);
  mount(wallet);
  recipient();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }))
  );
  expect(screen.getByText("Transaction submitted")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Check receipt" })).toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByText("Waiting for confirmation…")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Open transaction explorer" })
      .getAttribute("href")
  ).toContain(hash);
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByText("Deployment reverted")).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(6000));
  expect(wallet.receipt).toHaveBeenCalledTimes(2);
  expect(wallet.submit).toHaveBeenCalledTimes(1);
});

it.each([
  Object.assign(new Error("Rejected"), { code: 4001 }),
  new Error("Transaction failed", {
    cause: Object.assign(new Error("Rejected"), {
      name: "UserRejectedRequestError",
    }),
  }),
])(
  "unlocks the form and removes submission details after a confirmed wallet rejection",
  async (error) => {
    const { wallet } = mount();
    wallet.submit.mockRejectedValueOnce(error);
    recipient();
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
    await screen.findByText("Transaction rejected.");
    expect(screen.queryByText("Check wallet status")).toBeNull();
    expect(screen.queryByText("Constructor arguments")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(
      screen.getByRole("tab", { name: "ERC721" }).hasAttribute("disabled")
    ).toBe(false);
    expect(
      (
        screen.getByLabelText("Name", { exact: true }) as HTMLInputElement
      ).closest("fieldset")?.disabled
    ).toBe(false);
    expect(
      screen.getByRole("button", { name: "Deploy" }).hasAttribute("disabled")
    ).toBe(false);
    fireEvent.change(screen.getByLabelText("Name", { exact: true }), {
      target: { value: "Retry token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
    await screen.findByText("Transaction submitted");
    expect(wallet.submit).toHaveBeenCalledTimes(2);
    expect(wallet.submit.mock.calls[1][0].args[0]).toBe("Retry token");
  }
);
