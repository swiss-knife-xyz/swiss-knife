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
import { LibraryLinks } from "./LibraryLinks";
import { checkLibraryAddresses } from "@/lib/solidity/libraryCode";
const rpc = vi.hoisted(() => ({ getCode: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/publicClient", () => ({
  getPublicClient: (...args: any[]) => {
    rpc.client(...args);
    return { getCode: rpc.getCode };
  },
}));
vi.mock("@/components/fnParams/inputs/AddressInput", () => ({
  AddressInput: ({
    input,
    value,
    onChange,
    labelAction,
    isDisabled,
    ...props
  }: any) => (
    <div>
      {labelAction}
      <input
        aria-label={props["aria-label"] ?? input.name}
        value={value}
        onChange={onChange}
        disabled={isDisabled}
      />
    </div>
  ),
}));
vi.mock("@/utils", () => ({
  slicedText: (value: string) => value.slice(0, 8),
}));
const scrollDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"scrollTo");
beforeEach(()=>Object.defineProperty(HTMLElement.prototype,"scrollTo",{configurable:true,value:vi.fn()}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  if(scrollDescriptor)Object.defineProperty(HTMLElement.prototype,"scrollTo",scrollDescriptor);
  else delete (HTMLElement.prototype as any).scrollTo;
});
const ref = { sourcePath: "Math.sol", name: "Math" };
const refs = [ref];
const a = `0x${"11".repeat(20)}`;
const b = `0x${"22".repeat(20)}`;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);
function props() {
  return {
    refs,
    addresses: { "Math.sol": { Math: a } },
    chainId: 1,
    history: { records: [], getBuild: vi.fn() } as any,
    disabled: false,
    rpcRevision: 0,
    rpcReady: true,
    onChange: vi.fn(),
    onImport: vi.fn(),
    onReady: vi.fn(),
  };
}
it("uses the shared address field, checks code on the selected network and reports readiness", async () => {
  rpc.getCode.mockResolvedValue("0x6000");
  const input = props();
  render(<LibraryLinks {...input} />, { wrapper });
  await screen.findByText("Code found");
  expect(rpc.client).toHaveBeenCalledWith(1, { timeout: 10000 });
  await waitFor(() => expect(input.onReady).toHaveBeenLastCalledWith(true));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Math library address" }),
    { target: { value: b } }
  );
  expect(input.onChange).toHaveBeenCalledWith(ref, b);
});
it("rejects code-less addresses and supports retry", async () => {
  rpc.getCode.mockResolvedValueOnce("0x").mockResolvedValue("0x6000");
  const input = props();
  render(<LibraryLinks {...input} />, { wrapper });
  await screen.findByText(/No contract code/);
  expect(input.onReady).toHaveBeenLastCalledWith(false);
  fireEvent.click(
    screen.getByRole("button", { name: "Retry Math code check" })
  );
  await screen.findByText("Code found");
  await waitFor(() => expect(input.onReady).toHaveBeenLastCalledWith(true));
});
it("ignores stale RPC results after changing network", async () => {
  let oldResolve!: (code: string) => void, newResolve!: (code: string) => void;
  rpc.getCode
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          oldResolve = resolve;
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          newResolve = resolve;
        })
    );
  const input = props();
  const view = render(<LibraryLinks {...input} />, { wrapper });
  await waitFor(() => expect(rpc.getCode).toHaveBeenCalledTimes(1));
  view.rerender(<LibraryLinks {...input} chainId={11155111} />);
  await waitFor(() => expect(rpc.getCode).toHaveBeenCalledTimes(2));
  oldResolve("0x6000");
  await Promise.resolve();
  expect(input.onReady).toHaveBeenLastCalledWith(false);
  newResolve("0x6000");
  await screen.findByText("Code found");
  await waitFor(() => expect(input.onReady).toHaveBeenLastCalledWith(true));
});
it("waits for saved RPC settings and refreshes validation after an override changes", async () => {
  rpc.getCode.mockResolvedValue("0x6000");
  const input = props();
  const view = render(<LibraryLinks {...input} rpcReady={false} />, {
    wrapper,
  });
  expect(rpc.getCode).not.toHaveBeenCalled();
  view.rerender(<LibraryLinks {...input} />);
  await screen.findByText("Code found");
  view.rerender(<LibraryLinks {...input} rpcRevision={1} />);
  await waitFor(() => expect(rpc.getCode).toHaveBeenCalledTimes(2));
});
it("does not check unresolved names or zero addresses and bounds parallel deployment checks", async () => {
  const input = props();
  render(
    <LibraryLinks
      {...input}
      addresses={{ "Math.sol": { Math: "alice.eth" } }}
    />,
    { wrapper }
  );
  expect(rpc.getCode).not.toHaveBeenCalled();
  expect(input.onReady).toHaveBeenLastCalledWith(false);
  await expect(
    checkLibraryAddresses(1, refs, {
      "Math.sol": { Math: `0x${"00".repeat(20)}` },
    })
  ).rejects.toThrow("valid address");
  let active = 0,
    max = 0;
  rpc.getCode.mockImplementation(async () => {
    active++;
    max = Math.max(max, active);
    await Promise.resolve();
    active--;
    return "0x6000";
  });
  const many = Array.from({ length: 12 }, (_, i) => ({
    sourcePath: "Math.sol",
    name: `L${i}`,
  }));
  await checkLibraryAddresses(1, many, {
    "Math.sol": Object.fromEntries(many.map((ref) => [ref.name, a])),
  });
  expect(max).toBe(4);
});

it("reuses a matching previous deployment address without changing it automatically", async () => {
  rpc.getCode.mockResolvedValue("0x6000");
  const input = props();
  const settings = {
    version: "soljson-v0.8.30+commit.73712a01.js",
    optimizer: false,
    runs: 200,
    evmVersion: "default",
    viaIR: false,
  };
  const sources = { "Math.sol": { content: "library Math {}" } };
  const build = { input: { fingerprint: "same", settings, sources } } as any;
  const record = {
    id: "r",
    buildId: "b",
    sourcePath: "Math.sol",
    contractName: "Math",
    chainId: 1,
    status: "success",
    address: b,
    createdAt: 1000,
  };
  const history = {
    records: [record],
    getBuild: vi
      .fn()
      .mockResolvedValue({
        contract: { name: "Math", sourcePath: "Math.sol" },
        input: { sources },
        settings,
      }),
  } as any;
  render(
    <LibraryLinks {...input} build={build} history={history} addresses={{}} />,
    { wrapper }
  );
  expect(input.onChange).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "Use previous" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: /0x222222/ }));
  expect(input.onChange).toHaveBeenCalledWith(ref, b);
});
