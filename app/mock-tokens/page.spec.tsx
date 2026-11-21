import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
vi.mock("wagmi", () => ({
  useAccount: () => ({}),
  useWalletClient: () => ({ data: undefined }),
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
  getPublicClient: () => {
    throw new Error("Unexpected public RPC on mount");
  },
}));
import { MockTokensPage } from "./MockTokensPage";
afterEach(cleanup);
it("provides an actual wallet connector while leaving the deployment network unselected", () => {
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
  ).toBe("");
});
