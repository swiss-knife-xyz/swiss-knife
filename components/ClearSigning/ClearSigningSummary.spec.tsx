import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ExampleSnapshotContext } from "@/components/decodedParams/ExampleSnapshotContext";
import { getExampleSnapshot } from "@/app/calldata/decoder/exampleSnapshots";
import { decoderSamples } from "@/app/calldata/decoder/samples";
import { clearSigningRequestKey } from "@/lib/clearSigning/requestKey";
import ClearSigningSummary, { compactAmount } from "./ClearSigningSummary";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), name: vi.fn(async () => null), ready: true }));
vi.mock("@/lib/clearSigning/resolve", () => ({
  resolveClearSigning: mocks.resolve,
}));
vi.mock("@/lib/customChains/store", () => ({
  useCustomChains: () => ({ ready: mocks.ready, revision: 0 }),
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@/utils", () => ({ getPath: () => "/explorer/" }));
vi.mock("@/lib/nameResolution", () => ({
  resolveAddressToName: mocks.name,
}));
const summary = {
  intent: "Send tokens",
  fields: [
    { label: "Amount", visible: true, values: [{ kind: "raw", text: "123" }] },
  ],
  source: "builtin",
};
const view = (calldata = "0xa9059cbb") => (
  <ChakraProvider>
    <ClearSigningSummary calldata={calldata} />
  </ChakraProvider>
);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.ready = true;
  mocks.resolve.mockResolvedValue(summary);
});
afterEach(cleanup);
it("renders the readable summary", async () => {
  render(view());
  expect(await screen.findByText("Send tokens")).toBeTruthy();
  expect(screen.getByText("123")).toBeTruthy();
});
it("hides a previous request immediately and ignores its late response", async () => {
  let finish!: (value: unknown) => void;
  mocks.resolve.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const rendered = render(view());
  rendered.rerender(view("0x095ea7b3"));
  expect(await screen.findByText("Send tokens")).toBeTruthy();
  await act(async () => {
    finish({ ...summary, intent: "Stale transfer" });
  });
  expect(screen.queryByText("Stale transfer")).toBeNull();
  expect(screen.getByText("Send tokens")).toBeTruthy();
});
it("waits for saved custom RPC settings", () => {
  mocks.ready = false;
  render(view());
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it("leaves no empty card for unmatched calldata or failed metadata", async () => {
  mocks.resolve.mockResolvedValue(null);
  render(view());
  await act(async () => {});
  expect(screen.queryByRole("region", { name: "Clear signing" })).toBeNull();
});
it("renders exact token precision, unlimited allowance and raw fallback", async () => {
  mocks.resolve.mockResolvedValue({
    ...summary,
    fields: [
      {
        label: "Amount",
        values: [
          {
            kind: "tokenAmount",
            amountRaw: "1234567890123456789",
            tokenMetadata: { symbol: "TOK", decimals: 18 },
          },
        ],
      },
      {
        label: "Allowance",
        values: [
          {
            kind: "tokenAmount",
            amountRaw: ((1n << 256n) - 1n).toString(),
            tokenMetadata: { symbol: "TOK", decimals: 18 },
          },
        ],
      },
      {
        label: "Unknown token",
        values: [{ kind: "tokenAmount", amountRaw: "9000" }],
      },
    ],
  });
  render(view());
  expect(await screen.findByText("1.23456789 TOK")).toBeTruthy();
  expect(screen.getByText("Unlimited TOK")).toBeTruthy();
  expect(screen.getByText("9,000 base units")).toBeTruthy();
});

it.each([
  ["2056953.436850679818606705", "2,056,953.43685067"],
  ["0.0000000000123", "< 0.00000001"],
  ["900719925474099312345", "900,719,925,474,099,312,345"],
  ["1.23450000", "1.2345"],
])("formats %s compactly without losing integer precision", (input, output) => {
  expect(compactAmount(input)).toBe(output);
});
it("keeps resolved content when its panel is hidden and shown", async () => {
  const panel = (hidden: boolean) => (
    <ChakraProvider>
      <div style={{ display: hidden ? "none" : "block" }}>
        <ClearSigningSummary calldata="0xa9059cbb" />
      </div>
    </ChakraProvider>
  );
  const rendered = render(panel(false));
  await screen.findByText("Send tokens");
  rendered.rerender(panel(true));
  rendered.rerender(panel(false));
  expect(screen.getByText("Send tokens")).toBeTruthy();
  expect(mocks.resolve).toHaveBeenCalledTimes(1);
});

it("replays the Safe registry summary and nested cached calls without live lookups", async () => {
  mocks.ready = false;
  const snapshot = getExampleSnapshot(decoderSamples[1]);
  render(
    <ChakraProvider>
      <ExampleSnapshotContext.Provider value={snapshot}>
        <ClearSigningSummary {...snapshot.clearSigningRequest} />
      </ExampleSnapshotContext.Provider>
    </ChakraProvider>
  );
  expect(screen.getByText("sign multisig operation")).toBeTruthy();
  expect(screen.getByText("Batched calls")).toBeTruthy();
  expect(screen.getByText("Approve token")).toBeTruthy();
  expect(screen.getByText("2,900,000 USDC")).toBeTruthy();
  expect(screen.getByText("1 / 2")).toBeTruthy();
  expect(screen.getByText("2 / 2")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Show supply calldata" })).toBeTruthy();
  expect(screen.queryByText(/^0xf2b9fdb8/)).toBeNull();
  await act(async () => {});
  expect(mocks.resolve).not.toHaveBeenCalled();
  expect(mocks.name).not.toHaveBeenCalled();
});
it("keeps Zora's genuine missing-descriptor result empty without fetching", async () => {
  const snapshot = getExampleSnapshot(decoderSamples[0]);
  expect(
    snapshot.clearSigning?.[
      clearSigningRequestKey(snapshot.clearSigningRequest)
    ]
  ).toBeNull();
  render(
    <ChakraProvider>
      <ExampleSnapshotContext.Provider value={snapshot}>
        <ClearSigningSummary {...snapshot.clearSigningRequest} />
      </ExampleSnapshotContext.Provider>
    </ChakraProvider>
  );
  await act(async () => {});
  expect(screen.queryByRole("region", { name: "Clear signing" })).toBeNull();
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it("does not reuse a cached example summary for modified calldata", async () => {
  const snapshot = getExampleSnapshot(decoderSamples[1]);
  render(
    <ChakraProvider>
      <ExampleSnapshotContext.Provider value={snapshot}>
        <ClearSigningSummary
          {...snapshot.clearSigningRequest}
          calldata="0xa9059cbb"
        />
      </ExampleSnapshotContext.Provider>
    </ChakraProvider>
  );
  await act(async () => {});
  expect(screen.queryByRole("region", { name: "Clear signing" })).toBeNull();
  expect(mocks.resolve).not.toHaveBeenCalled();
});

it("shows preview status while resolving and reports availability without retaining an older summary", async () => {
  let finish!: (value: unknown) => void;
  mocks.resolve.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const availability = vi.fn();
  render(<ChakraProvider><ClearSigningSummary calldata="0xa9059cbb" showPending onAvailabilityChange={availability} /></ChakraProvider>);
  expect(screen.getByRole("status").textContent).toContain("Updating clear-signing summary");
  expect(availability).not.toHaveBeenCalled();
  await act(async () => finish(null));
  expect(screen.getByRole("status").textContent).toBe("No clear-signing summary available for these parameters.");
  expect(availability).toHaveBeenCalledWith(false);
});

it("coalesces rapid draft updates before resolving the latest calldata", async () => {
  vi.useFakeTimers();
  try {
    const preview = (calldata: string) => <ChakraProvider><ClearSigningSummary calldata={calldata} showPending debounceMs={150} /></ChakraProvider>;
    const ui = render(preview("0xa9059cbb"));
    ui.rerender(preview("0x095ea7b3"));
    expect(mocks.resolve).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
    expect(mocks.resolve).toHaveBeenCalledWith({ calldata: "0x095ea7b3" });
    expect(screen.getByText("Send tokens")).toBeTruthy();
  } finally { vi.useRealTimers(); }
});
