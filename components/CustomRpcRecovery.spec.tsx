import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { CustomRpcRecovery } from "./CustomRpcRecovery";
import {
  initializeCustomChains,
  saveCustomChain,
  removeCustomChain,
  getSavedCustomChain,
} from "@/lib/customChains/store";
import {
  beginCustomRpcRequest,
  clearCustomRpcFailure,
  settleCustomRpcRequest,
} from "@/lib/customChains/failures";
import { getRpcUrlsForChain } from "@/data/networks";
const rpcUrl = "http://127.0.0.1:8545/PRIVATE_KEY?token=SECRET";
beforeEach(async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  await initializeCustomChains();
  await saveCustomChain({
    id: 8453,
    name: "Base fork",
    rpcUrl,
    symbol: "ETH",
    decimals: 18,
    testnet: true,
  });
  settleCustomRpcRequest(8453, rpcUrl, beginCustomRpcRequest(), {
    name: "TimeoutError",
  });
});
afterEach(async () => {
  cleanup();
  await removeCustomChain(8453);
  clearCustomRpcFailure(8453);
  vi.unstubAllGlobals();
});
it("offers an explicit public RPC restore without exposing endpoint credentials", async () => {
  render(
    <ChakraProvider>
      <CustomRpcRecovery />
    </ChakraProvider>
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "Custom RPC unreachable: Base fork"
  );
  expect(screen.getByRole("alert").textContent).toContain("127.0.0.1:8545");
  expect(screen.getByRole("alert").textContent).not.toMatch(
    /PRIVATE_KEY|SECRET/
  );
  expect(getRpcUrlsForChain(8453)).toEqual([rpcUrl]);
  fireEvent.click(screen.getByRole("button", { name: "Use public RPC" }));
  await waitFor(() => expect(getSavedCustomChain(8453)).toBeUndefined());
  expect(getRpcUrlsForChain(8453)).not.toContain(rpcUrl);
  expect(screen.queryByRole("alert")).toBeNull();
});
it("opens the existing editor with the failed saved RPC selected", async () => {
  render(
    <ChakraProvider>
      <CustomRpcRecovery />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit RPC" }));
  expect(await screen.findByDisplayValue(rpcUrl)).toBeTruthy();
  expect(screen.getByDisplayValue("Base fork")).toBeTruthy();
});
