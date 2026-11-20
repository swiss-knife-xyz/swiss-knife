import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { GasCostEstimator } from "./GasCostEstimator";
import {
  loadGasCostEstimate,
  type GasCostChain,
  type GasCostReaders,
} from "@/lib/gasCostEstimateRead";

const chains: GasCostChain[] = [
  {
    id: 1,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  {
    id: 137,
    name: "Polygon",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  },
];
const hash = `0x${"ab".repeat(32)}`;
const readers: GasCostReaders = {
  getClient: (id) => ({
    getChainId: async () => id,
    getTransactionReceipt: async () => ({
      transactionHash: hash as `0x${string}`,
      blockNumber: 123n,
      gasUsed: 21000n,
      status: "success",
    }),
    getGasPrice: async () => 30000000000n,
  }),
  getUsdPrice: async () => 0.5,
  now: () => 1800000000000,
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("accessible form shows a read-only estimate, not simulation, with native units and L2 caveats", async () => {
  const load = vi.fn((input) => loadGasCostEstimate(input, readers));
  render(
    <ChakraProvider>
      <GasCostEstimator chains={chains} loadEstimate={load} />
    </ChakraProvider>
  );
  expect(load).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  fireEvent.change(screen.getByLabelText("Destination chain"), {
    target: { value: "137" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Estimate gas cost" }).closest("form")!
  );
  expect(await screen.findByText("0.00063 POL")).toBeTruthy();
  expect(screen.getByText("$0.000315")).toBeTruthy();
  expect(screen.getByText(/not an execution simulation/i)).toBeTruthy();
  expect(screen.getByText(/L1 data.*blob.*sequencer/i)).toBeTruthy();
  expect(screen.getByText(/21000 gas/)).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

test("editing any input removes the previous result and error", async () => {
  render(
    <ChakraProvider>
      <GasCostEstimator
        chains={chains}
        loadEstimate={(input) => loadGasCostEstimate(input, readers)}
      />
    </ChakraProvider>
  );
  const submit = () =>
    fireEvent.submit(
      screen.getByRole("button", { name: "Estimate gas cost" }).closest("form")!
    );
  submit();
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  expect(screen.queryByRole("alert")).toBeNull();
  for (const [label, value] of [
    ["Source chain", "137"],
    ["Destination chain", "1"],
    ["Transaction hash", `0x${"cd".repeat(32)}`],
  ]) {
    submit();
    expect(await screen.findByText(/0.00063 /)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.queryByText(/0.00063 /)).toBeNull();
  }
});

test("an older pending request cannot overwrite edited inputs, a newer result or error", async () => {
  let resolveFirst!: (
    result: Awaited<ReturnType<typeof loadGasCostEstimate>>
  ) => void;
  const first = new Promise<Awaited<ReturnType<typeof loadGasCostEstimate>>>(
    (resolve) => {
      resolveFirst = resolve;
    }
  );
  const load = vi
    .fn()
    .mockReturnValueOnce(first)
    .mockImplementation((input) => loadGasCostEstimate(input, readers));
  render(
    <ChakraProvider>
      <GasCostEstimator chains={chains} loadEstimate={load} />
    </ChakraProvider>
  );
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Estimate gas cost" }).closest("form")!
  );
  fireEvent.change(screen.getByLabelText("Destination chain"), {
    target: { value: "1" },
  });
  fireEvent.submit(screen.getByRole("button").closest("form")!);
  expect(await screen.findByText("0.00063 ETH")).toBeTruthy();
  await act(async () =>
    resolveFirst(
      await loadGasCostEstimate(
        { hash, source: chains[0], target: chains[1] },
        readers
      )
    )
  );
  expect(screen.queryByText("0.00063 POL")).toBeNull();
  expect(screen.getByText("0.00063 ETH")).toBeTruthy();
});

test("USD failure, target RPC failure and retry are explicit, with no input persistence", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const storageSpy = vi.spyOn(Storage.prototype, "setItem");
  const historySpy = vi.spyOn(window.history, "replaceState");
  const load = vi
    .fn()
    .mockRejectedValueOnce(
      Error("Target current gas price unavailable. Try again later.")
    )
    .mockImplementation((input) =>
      loadGasCostEstimate(input, {
        ...readers,
        getUsdPrice: async () => undefined,
      })
    );
  render(
    <ChakraProvider>
      <GasCostEstimator chains={chains} loadEstimate={load} />
    </ChakraProvider>
  );
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  fireEvent.click(screen.getByRole("button", { name: "Estimate gas cost" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(
    /Target current gas price unavailable/
  );
  fireEvent.click(screen.getByRole("button", { name: "Estimate gas cost" }));
  expect(await screen.findByText("USD unavailable")).toBeTruthy();
  expect(screen.getByText("0.00063 POL")).toBeTruthy();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(storageSpy).not.toHaveBeenCalled();
  expect(historySpy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

test("actual page uses the canonical RPC factory and price adapter, only on submission", async () => {
  const rpc = vi.fn((id: number) => readers.getClient(id));
  const usd = vi.fn(async (_chain: GasCostChain) => undefined);
  vi.doMock("@/lib/publicClient", () => ({ getPublicClient: rpc }));
  vi.doMock("@/lib/gasCostPrice", () => ({ readNativeUsdPrice: usd }));
  const Page = (await import("./page")).default;
  render(
    <ChakraProvider>
      <Page />
    </ChakraProvider>
  );
  expect(rpc).not.toHaveBeenCalled();
  expect(usd).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  fireEvent.change(screen.getByLabelText("Destination chain"), {
    target: { value: "137" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Estimate gas cost" }));
  expect(await screen.findByText("0.00063 POL")).toBeTruthy();
  expect(rpc).toHaveBeenCalledWith(1, { timeout: 8000 });
  expect(rpc).toHaveBeenCalledWith(137, { timeout: 8000 });
  expect(usd).toHaveBeenCalledTimes(1);
  expect(usd.mock.calls[0][0]).toMatchObject({ id: 137 });
});

test("late rejection after an edit or unmount is ignored", async () => {
  let reject!: (reason: Error) => void;
  const pending = new Promise<never>((_, rejectPromise) => {
    reject = rejectPromise;
  });
  const rendered = render(
    <ChakraProvider>
      <GasCostEstimator chains={chains} loadEstimate={() => pending} />
    </ChakraProvider>
  );
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  fireEvent.click(screen.getByRole("button", { name: "Estimate gas cost" }));
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: "edited" },
  });
  await act(async () => reject(Error("obsolete error")));
  expect(screen.queryByRole("alert")).toBeNull();
  rendered.unmount();
  const afterUnmount = render(
    <ChakraProvider>
      <GasCostEstimator
        chains={chains}
        loadEstimate={() =>
          new Promise((_, rejectPromise) => {
            reject = rejectPromise;
          })
        }
      />
    </ChakraProvider>
  );
  fireEvent.change(screen.getByLabelText("Transaction hash"), {
    target: { value: hash },
  });
  fireEvent.click(screen.getByRole("button", { name: "Estimate gas cost" }));
  afterUnmount.unmount();
  await act(async () => reject(Error("unmounted error")));
  expect(screen.queryByRole("alert")).toBeNull();
});
