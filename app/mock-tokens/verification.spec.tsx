import React, { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { MockTokenVerification } from "./MockTokenVerification";
import {
  submitMockVerification,
  mockEtherscanVerification,
} from "@/lib/mockTokenVerification";
import { buildMockDeployment } from "@/lib/mockTokens";
const { status } = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock("@/lib/mockTokenVerification", () => ({
  submitMockVerification: vi.fn(),
  mockEtherscanVerification: vi.fn(),
}));
vi.mock("@/lib/verification/providers", () => ({
  ProviderClient: class {
    status = status;
  },
}));
const address = "0x2222222222222222222222222222222222222222";
const hash = `0x${"ab".repeat(32)}` as const;
const deployment = buildMockDeployment({
  standard: "ERC721",
  chainId: "11155111",
  name: "Token",
  symbol: "TKN",
  initialSupply: "0",
  recipient: "",
  uri: "",
});
function show() {
  return render(
    <ChakraProvider>
      <StrictMode>
        <MockTokenVerification
          deployment={deployment}
          address={address}
          hash={hash}
        />
      </StrictMode>
    </ChakraProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});
it("submits once under Strict Mode and polls to confirmed verification without another POST", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.mocked(submitMockVerification).mockResolvedValue({
    state: "pending",
    guid: "job",
  });
  status
    .mockResolvedValueOnce({ state: "pending", phase: "queued" })
    .mockResolvedValueOnce({ state: "verified" });
  await act(async () => {
    show();
  });
  expect(submitMockVerification).toHaveBeenCalledTimes(1);
  expect(submitMockVerification).toHaveBeenCalledWith(
    deployment,
    address,
    hash
  );
  expect(screen.getByText("Verifying source on Sourcify…")).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(6000));
  expect(screen.getByText("Source verified on Sourcify")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "View contract on Sourcify" })
      .getAttribute("href")
  ).toBe(`https://repo.sourcify.dev/11155111/${address}`);
  await act(async () => vi.advanceTimersByTimeAsync(9000));
  expect(status).toHaveBeenCalledTimes(2);
  expect(submitMockVerification).toHaveBeenCalledTimes(1);
});
it("shows a failed submission and only retries on explicit action", async () => {
  vi.mocked(submitMockVerification)
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce({ state: "verified" });
  show();
  await screen.findByText("Sourcify verification not confirmed.");
  expect(submitMockVerification).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Retry verification" }));
  await screen.findByText("Source verified on Sourcify");
  expect(submitMockVerification).toHaveBeenCalledTimes(2);
});
it("stops polling when the verification row unmounts", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.mocked(submitMockVerification).mockResolvedValue({
    state: "pending",
    guid: "job",
  });
  let view: ReturnType<typeof show>;
  await act(async () => {
    view = show();
  });
  view!.unmount();
  await act(async () => vi.advanceTimersByTimeAsync(9000));
  expect(status).not.toHaveBeenCalled();
});

it("verifies on Etherscan independently and polls only the local API without browser credentials", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.mocked(mockEtherscanVerification)
    .mockResolvedValueOnce({ state: "pending", phase: "queued" })
    .mockResolvedValueOnce({ state: "verified" });
  await act(async () => {
    render(
      <ChakraProvider>
        <StrictMode>
          <MockTokenVerification
            provider="etherscan"
            deployment={deployment}
            address={address}
            hash={hash}
          />
        </StrictMode>
      </ChakraProvider>
    );
  });
  expect(mockEtherscanVerification).toHaveBeenCalledTimes(1);
  expect(submitMockVerification).not.toHaveBeenCalled();
  expect(screen.getByText(/Queued for .* verification/)).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByText(/Source verified on/)).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: /View contract on .*scan/ })
      .getAttribute("href")
  ).toBe(`https://sepolia.etherscan.io/address/${address}#code`);
  expect(mockEtherscanVerification).toHaveBeenCalledTimes(2);
  expect(mockEtherscanVerification).toHaveBeenLastCalledWith(
    deployment,
    address,
    hash,
    "status",
    false,
    expect.any(AbortSignal)
  );
});

it("shows Etherscan indexing progress and then confirms without a user retry", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.mocked(mockEtherscanVerification)
    .mockResolvedValueOnce({ state: "pending", error: "CONTRACT_NOT_INDEXED" })
    .mockResolvedValueOnce({ state: "verified" });
  await act(async () => {
    render(
      <ChakraProvider>
        <MockTokenVerification
          provider="etherscan"
          deployment={deployment}
          address={address}
          hash={hash}
        />
      </ChakraProvider>
    );
  });
  expect(screen.getByText(/Waiting for .* to index the contract/)).toBeTruthy();
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByText(/Source verified on/)).toBeTruthy();
});

it("shows an accepted queue timeout as delayed and resumes status checks without resubmitting", async () => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.mocked(mockEtherscanVerification).mockResolvedValue({
    state: "pending",
    phase: "queued",
  });
  await act(async () => {
    render(
      <ChakraProvider>
        <MockTokenVerification
          provider="etherscan"
          deployment={deployment}
          address={address}
          hash={hash}
        />
      </ChakraProvider>
    );
  });
  expect(mockEtherscanVerification).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 15 * 60_000);
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(
    screen.getByText(/verification is taking longer than usual/)
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Retry verification" })
  ).toBeNull();
  vi.mocked(mockEtherscanVerification).mockResolvedValueOnce({
    state: "verified",
  });
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Check status" }))
  );
  expect(
    vi
      .mocked(mockEtherscanVerification)
      .mock.calls.filter((call) => call[3] === "submit")
  ).toHaveLength(1);
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByText(/Source verified on/)).toBeTruthy();
});

it("backs off a rate-limited status check while retaining the pending verification", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.mocked(mockEtherscanVerification)
    .mockResolvedValueOnce({ state: "pending", phase: "queued" })
    .mockResolvedValueOnce({
      state: "pending",
      phase: "queued",
      error: "RATE_LIMITED",
      retryAfterMs: 10000,
    })
    .mockResolvedValueOnce({ state: "verified" });
  await act(async () => {
    render(
      <ChakraProvider>
        <MockTokenVerification
          provider="etherscan"
          deployment={deployment}
          address={address}
          hash={hash}
        />
      </ChakraProvider>
    );
  });
  await act(async () => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByText(/rate limit reached. Retrying shortly/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Retry verification" })
  ).toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(9000));
  expect(mockEtherscanVerification).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByText(/Source verified on/)).toBeTruthy();
  expect(
    vi
      .mocked(mockEtherscanVerification)
      .mock.calls.filter((call) => call[3] === "submit")
  ).toHaveLength(1);
});
