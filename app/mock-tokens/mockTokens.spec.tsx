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
const account = "0x1111111111111111111111111111111111111111" as const;
const hash = `0x${"ab".repeat(32)}` as const;
const estimate = {
  gas: 500000n,
  maxFeePerGas: 1000000000n,
  maxPriorityFeePerGas: 100000n,
  balance: 1000000000000000000n,
  createdAt: Date.now(),
};
function fixture(chainId = 11155111) {
  return {
    account,
    chainId,
    estimate: vi.fn().mockResolvedValue({ ...estimate, createdAt: Date.now() }),
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
async function review(chainId = "11155111") {
  fireEvent.change(screen.getByLabelText("Deployment network"), {
    target: { value: chainId },
  });
  fireEvent.change(screen.getByLabelText("Initial recipient"), {
    target: { value: account },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Estimate & review deployment" })
  );
  await screen.findByRole("heading", { name: "Review mock deployment" });
}
it("requires explicit chain selection, read-only review and unchecked consent before the only wallet write", async () => {
  const { wallet } = mount();
  expect(
    (screen.getByLabelText("Deployment network") as HTMLSelectElement).value
  ).toBe("");
  expect(wallet.estimate).not.toHaveBeenCalled();
  expect(wallet.submit).not.toHaveBeenCalled();
  await review();
  expect(wallet.estimate).toHaveBeenCalledTimes(1);
  expect(wallet.submit).not.toHaveBeenCalled();
  expect(screen.getByText("MOCK Token")).toBeTruthy();
  expect(screen.getByText(/anyone can mint/i)).toBeTruthy();
  const deploy = screen.getByRole("button", { name: "Confirm in wallet" });
  expect(deploy.hasAttribute("disabled")).toBe(true);
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I understand this public/ })
  );
  fireEvent.click(deploy);
  fireEvent.click(deploy);
  await screen.findByText("Transaction submitted — not yet confirmed");
  expect(wallet.submit).toHaveBeenCalledTimes(1);
  expect(wallet.receipt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Check receipt" }));
  await screen.findByText("Deployment confirmed");
  expect(
    screen
      .getByRole("link", { name: "Open deployed mock in explorer" })
      .getAttribute("href")
  ).toContain("11155111/0x2222");
  expect(
    window.getComputedStyle(
      screen.getByRole("button", { name: /Start another deployment/ })
    ).whiteSpace
  ).toBe("normal");
  const abiLink = screen.getByRole("link", {
    name: "Download selected token ABI",
  });
  expect(decodeURIComponent(abiLink.getAttribute("href")!)).toContain(
    '"name": "mint"'
  );
  expect(
    screen.getByText(
      "Saved deployment parameters (constructor arguments for verification)"
    )
  ).toBeTruthy();
});
it("mainnet requires a separate real-gas consent; changing parameters invalidates both consent and gas review", async () => {
  const { wallet } = mount(fixture(1));
  await review("1");
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I understand this public/ })
  );
  expect(
    screen
      .getByRole("button", { name: "Confirm in wallet" })
      .hasAttribute("disabled")
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I explicitly choose MAINNET/ })
  );
  expect(
    screen
      .getByRole("button", { name: "Confirm in wallet" })
      .hasAttribute("disabled")
  ).toBe(false);
  fireEvent.change(screen.getByLabelText(/Name suffix/), {
    target: { value: "Changed" },
  });
  expect(
    screen.queryByRole("heading", { name: "Review mock deployment" })
  ).toBeNull();
  expect(wallet.submit).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Estimate & review deployment" })
  );
  await screen.findByRole("heading", { name: "Review mock deployment" });
  expect(
    (
      screen.getByRole("checkbox", {
        name: /I understand this public/,
      }) as HTMLInputElement
    ).checked
  ).toBe(false);
  expect(
    (
      screen.getByRole("checkbox", {
        name: /I explicitly choose MAINNET/,
      }) as HTMLInputElement
    ).checked
  ).toBe(false);
});
it("shows the wallet prompt in progress and consumes a rejected or uncertain request without retrying", async () => {
  const wallet = fixture();
  let reject!: (e: unknown) => void;
  wallet.submit.mockImplementation(
    () =>
      new Promise((_, r) => {
        reject = r;
      })
  );
  mount(wallet);
  await review();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I understand this public/ })
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm in wallet" }));
  await screen.findByRole("heading", { name: "Awaiting wallet confirmation" });
  expect(
    screen.queryByRole("button", { name: "Confirm in wallet" })
  ).toBeNull();
  reject(new Error("fixture rejected/transport lost"));
  await screen.findByRole("heading", {
    name: "Wallet request outcome uncertain",
  });
  expect(wallet.submit).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "Estimate & review deployment" })
  ).toBeNull();
  expect(screen.getByText(/Check your wallet and explorer/)).toBeTruthy();
});
it("expires a gas review and blocks insufficient balances without any wallet request", async () => {
  const { wallet } = mount();
  await review();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I understand this public/ })
  );
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61001);
  await screen.findByText(/Gas review expired/, {}, { timeout: 2000 });
  expect(
    screen
      .getByRole("button", { name: "Confirm in wallet" })
      .hasAttribute("disabled")
  ).toBe(true);
  expect(wallet.submit).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  cleanup();
  const poor = fixture();
  poor.estimate.mockResolvedValue({
    ...estimate,
    balance: 0n,
    createdAt: Date.now(),
  });
  mount(poor);
  await review();
  expect(screen.getByText(/Insufficient native balance/)).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Confirm in wallet" })
      .hasAttribute("disabled")
  ).toBe(true);
});
it("ignores a late estimate after account changes and clears reviewed consent on wallet network changes", async () => {
  const wallet = fixture();
  let resolve!: (e: typeof estimate) => void;
  wallet.estimate.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  const view = mount(wallet);
  fireEvent.change(screen.getByLabelText("Deployment network"), {
    target: { value: "11155111" },
  });
  fireEvent.change(screen.getByLabelText("Initial recipient"), {
    target: { value: account },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Estimate & review deployment" })
  );
  view.rerender(
    <ChakraProvider>
      <MockTokenTool
        wallet={{
          ...wallet,
          account: "0x2222222222222222222222222222222222222222",
        }}
      />
    </ChakraProvider>
  );
  await act(async () => resolve(estimate));
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Estimate & review deployment" })
        .hasAttribute("disabled")
    ).toBe(false)
  );
  expect(
    screen.queryByRole("heading", { name: "Review mock deployment" })
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Estimate & review deployment" })
  );
  await screen.findByRole("heading", { name: "Review mock deployment" });
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I understand this public/ })
  );
  view.rerender(
    <ChakraProvider>
      <MockTokenTool wallet={{ ...wallet, chainId: 1 }} />
    </ChakraProvider>
  );
  expect(
    screen.queryByRole("button", { name: "Confirm in wallet" })
  ).toBeNull();
  expect(wallet.submit).not.toHaveBeenCalled();
});
it.each(["ERC721", "ERC1155"])(
  "reviews %s metadata and zero initial NFT supply, without metadata requests",
  async (standard) => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("No HTTP allowed"));
    const { wallet } = mount();
    fireEvent.change(screen.getByLabelText("Token standard"), {
      target: { value: standard },
    });
    fireEvent.change(screen.getByLabelText("Deployment network"), {
      target: { value: "11155111" },
    });
    fireEvent.change(screen.getByLabelText(/metadata URI/i), {
      target: { value: "ipfs://fixture/{id}" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Estimate & review deployment" })
    );
    await screen.findByRole("heading", { name: "Review mock deployment" });
    expect(screen.getByText(/initial NFT supply: 0/)).toBeTruthy();
    expect(wallet.estimate.mock.calls[0][0].standard).toBe(standard);
    expect(fetcher).not.toHaveBeenCalled();
    expect(wallet.submit).not.toHaveBeenCalled();
  }
);
it("keeps a pending hash on RPC failure and reports reverted receipt without resending", async () => {
  const { wallet } = mount();
  await review();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I understand this public/ })
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm in wallet" }));
  await screen.findByText("Transaction submitted — not yet confirmed");
  wallet.receipt.mockRejectedValueOnce(new Error("RPC offline"));
  fireEvent.click(screen.getByRole("button", { name: "Check receipt" }));
  await screen.findByText(/Receipt not available yet/);
  expect(
    screen
      .getByRole("link", { name: "Open transaction explorer" })
      .getAttribute("href")
  ).toContain(hash);
  wallet.receipt.mockResolvedValueOnce({
    status: "reverted",
    contractAddress: null,
  });
  fireEvent.click(screen.getByRole("button", { name: "Check receipt" }));
  await screen.findByText("Deployment reverted — gas may have been spent");
  expect(
    screen.queryByRole("link", { name: "Open deployed mock in explorer" })
  ).toBeNull();
  expect(wallet.submit).toHaveBeenCalledTimes(1);
});
