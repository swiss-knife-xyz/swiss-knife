import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({ ariaLabel, selectedOption }: any) => (
    <input
      aria-label={ariaLabel}
      value={selectedOption?.value ?? ""}
      readOnly
    />
  ),
}));
vi.mock("@/components/AddressBook", () => ({ AddressBookButton: () => null }));
const accountState = vi.hoisted(() => ({ current: {} as { address?: string; chainId?: number } }));
vi.mock("wagmi", () => ({
  useAccount: () => accountState.current,
  useWalletClient: () => ({ data: undefined }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}));
vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/components/ConnectButton", () => ({
  ConnectButton: () => <button>Connect wallet fixture</button>,
}));
vi.mock("@/lib/publicClient", () => ({
  getPublicClient: () => ({
    request: () => {
      throw new Error("Unexpected public RPC on mount");
    },
  }),
}));
import { MockTokensPage } from "./MockTokensPage";
afterEach(() => { cleanup(); accountState.current = {}; });
it("provides an actual wallet connector and defaults the deployment network to Sepolia", () => {
  render(
    <ChakraProvider>
      <MockTokensPage />
    </ChakraProvider>
  );
  expect(
    screen.getByRole("button", { name: "Connect wallet fixture" })
  ).toBeTruthy();
  expect(
    (screen.getByLabelText("Deployment network") as HTMLSelectElement).value
  ).toBe("11155111");
});


it("hydrates without a mismatch when the browser restores a connected wallet", async () => {
  const { renderToString } = await import("react-dom/server");
  const { hydrateRoot } = await import("react-dom/client");
  const view = <ChakraProvider><MockTokensPage /></ChakraProvider>;
  const container = document.createElement("div");
  container.innerHTML = renderToString(view);
  document.body.appendChild(container);
  accountState.current = { address: "0x1111111111111111111111111111111111111111", chainId: 11155111 };
  const recoverableError = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, view, { onRecoverableError: recoverableError }); });
    expect(recoverableError).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Use my wallet" }) as HTMLButtonElement).disabled).toBe(false);
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});
