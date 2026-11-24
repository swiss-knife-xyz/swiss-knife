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
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import ContractDiff from "./page";
import { loadGithubComparison } from "@/lib/contractDiffGithub";
vi.mock("@/lib/contractDiffGithub", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contractDiffGithub")>()),
  loadGithubComparison: vi.fn(),
}));
const { source } = vi.hoisted(() => ({ source: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/utils", () => ({ getSourceCodeWithMetadata: source }));
vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: any) => children,
}));
vi.mock("@/components/SourceCodeExplorer", () => ({
  SourceCodeExplorer: () => <div>Compared sources</div>,
}));
vi.mock("@/components/NetworkSelect", () => ({ NetworkSelect: () => null }));
vi.mock("@/components/InputField", () => ({
  InputField: ({ isDisabled, ...props }: any) => (
    <input disabled={isDisabled} {...props} />
  ),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  source.mockReset();
});
it("titles the comparison with verified names and clears stale titles when inputs change", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  source.mockResolvedValueOnce({
    contractName: "WrappedEther",
    sourceCode: { "WETH.sol": "contract WrappedEther {}" },
  });
  source.mockResolvedValueOnce({
    contractName: "WETH9",
    sourceCode: { "WETH.sol": "contract WETH9 {}" },
  });
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory>
        <ContractDiff />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  expect(document.title).toBe("Contract Diff | ETH.sh");
  fireEvent.click(screen.getByRole("button", { name: "Compare Contracts" }));
  await screen.findByText("Compared sources");
  await waitFor(() =>
    expect(document.title).toBe(
      "WrappedEther vs WETH9 - Contract Diff | ETH.sh"
    )
  );
  expect(source).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getAllByPlaceholderText("Contract address")[0], {
    target: { value: "0x0000000000000000000000000000000000000001" },
  });
  await waitFor(() => expect(document.title).toBe("Contract Diff | ETH.sh"));
});

it("compares an onchain contract with GitHub and preserves contract drafts across modes", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  source.mockResolvedValue({
    contractName: "Token",
    sourceCode: { "Token.sol": "old", "Dep.sol": "dep" },
  });
  vi.mocked(loadGithubComparison).mockResolvedValue({
    repository: "owner/repo",
    folder: "src",
    commit: "a".repeat(40),
    sources: { "Token.sol": "new" },
    matches: { "Token.sol": "src/Token.sol" },
    missing: ["Dep.sol"],
  });
  const onUrlUpdate = vi.fn();
  render(
    <ChakraProvider>
      <NuqsTestingAdapter
        hasMemory
        resetUrlUpdateQueueOnMount={false}
        onUrlUpdate={onUrlUpdate}
      >
        <ContractDiff />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  const draft = screen
    .getByLabelText("Old contract address")
    .getAttribute("value");
  fireEvent.click(screen.getByRole("tab", { name: "GitHub" }));
  fireEvent.change(screen.getByLabelText("Repository"), {
    target: { value: "owner/repo" },
  });
  fireEvent.change(screen.getByLabelText("Commit, tag or branch"), {
    target: { value: "main" },
  });
  expect(screen.queryByLabelText(/Repository folder/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Repository settings" }));
  fireEvent.change(await screen.findByLabelText(/Repository folder/), {
    target: { value: "src" },
  });
  fireEvent.keyDown(screen.getByLabelText(/Repository folder/), {
    key: "Escape",
    code: "Escape",
  });
  fireEvent.change(screen.getByLabelText("New contract address"), {
    target: { value: "0x4200000000000000000000000000000000000006" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Compare Sources" }));
  await screen.findByText("Compared sources");
  expect(source).toHaveBeenCalledTimes(1);
  expect(source).toHaveBeenCalledWith(
    8453,
    "0x4200000000000000000000000000000000000006"
  );
  expect(loadGithubComparison).toHaveBeenCalledWith(
    expect.any(Object),
    "owner/repo",
    "main",
    "src",
    expect.any(AbortSignal)
  );
  expect(screen.queryByText(/matched files/)).toBeNull();
  expect(screen.queryByText(/Source comparison only/)).toBeNull();
  expect(screen.queryByText("File matching details")).toBeNull();
  await waitFor(() =>
    expect(
      screen.getByLabelText("Commit, tag or branch").getAttribute("value")
    ).toBe("a".repeat(40))
  );
  expect(screen.queryByText(/Inputs changed/)).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Contract" }));
  expect(
    screen.getByLabelText("Old contract address").getAttribute("value")
  ).toBe(draft);
  await screen.findByText(/Inputs changed/);
});
it("shows actionable GitHub errors without publishing a successful diff", async () => {
  source.mockResolvedValue({ sourceCode: { "Token.sol": "old" } });
  vi.mocked(loadGithubComparison).mockRejectedValue(
    new Error(
      "Multiple repository files match Token.sol. Narrow the repository folder to select one."
    )
  );
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory>
        <ContractDiff />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("tab", { name: "GitHub" }));
  fireEvent.change(screen.getByLabelText("Repository"), {
    target: { value: "owner/repo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Compare Sources" }));
  await waitFor(() =>
    expect(
      screen.getAllByText(/Narrow the repository folder/).length
    ).toBeGreaterThan(0)
  );
  expect(screen.queryByText("Compared sources")).toBeNull();
});

it("preserves the supplied tree URL while extracting revision and folder", async () => {
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory>
        <ContractDiff />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("tab", { name: "GitHub" }));
  fireEvent.change(screen.getByLabelText("Repository"), {
    target: { value: "https://github.com/Uniswap/v4-periphery/tree/main/src" },
  });
  fireEvent.blur(screen.getByLabelText("Repository"));
  expect(screen.getByLabelText("Repository").getAttribute("value")).toBe(
    "https://github.com/Uniswap/v4-periphery/tree/main/src"
  );
  expect(
    screen.getByLabelText("Commit, tag or branch").getAttribute("value")
  ).toBe("main");
  fireEvent.click(screen.getByRole("button", { name: "Repository settings" }));
  expect(
    (await screen.findByLabelText(/Repository folder/)).getAttribute("value")
  ).toBe("src");
});

it("clears inputs, results and query parameters from the page title", async () => {
  source.mockResolvedValue({
    contractName: "Token",
    sourceCode: { "Token.sol": "contract Token {}" },
  });
  const onUrlUpdate = vi.fn();
  render(
    <ChakraProvider>
      <NuqsTestingAdapter
        hasMemory
        resetUrlUpdateQueueOnMount={false}
        onUrlUpdate={onUrlUpdate}
        searchParams="?contractOld=0x1&contractNew=0x2&chainIdOld=1&chainIdNew=8453"
      >
        <ContractDiff />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Compare Contracts" }));
  await screen.findByText("Compared sources");
  fireEvent.click(screen.getByRole("button", { name: "Contract Diff" }));
  await waitFor(() =>
    expect(onUrlUpdate.mock.lastCall?.[0].searchParams.toString()).toBe("")
  );
  expect(
    screen.getByLabelText("Old contract address").getAttribute("value")
  ).toBe("");
  expect(
    screen.getByLabelText("New contract address").getAttribute("value")
  ).toBe("");
  expect(screen.queryByText("Compared sources")).toBeNull();
  expect(document.title).toBe("Contract Diff | ETH.sh");
});

it.each(["WETH", "Uniswap V4 PositionManager"])(
  "runs the %s example and hides example cards once results are shown",
  async (example) => {
    source.mockResolvedValue({
      contractName: "Token",
      sourceCode: { "Token.sol": "old" },
    });
    vi.mocked(loadGithubComparison).mockResolvedValue({
      repository: "Uniswap/v4-periphery",
      commit: "a".repeat(40),
      folder: "src",
      sources: { "Token.sol": "new" },
      matches: { "Token.sol": "src/Token.sol" },
      missing: [],
    });
    render(
      <ChakraProvider>
        <NuqsTestingAdapter hasMemory resetUrlUpdateQueueOnMount={false}>
          <ContractDiff />
        </NuqsTestingAdapter>
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: new RegExp(example) }));
    await screen.findByText("Compared sources");
    expect(screen.queryByText("Examples")).toBeNull();
    expect(screen.queryByText(/Inputs changed/)).toBeNull();
    if (example === "WETH") {
      expect(source).toHaveBeenCalledWith(
        1,
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
      );
      expect(source).toHaveBeenCalledWith(
        8453,
        "0x4200000000000000000000000000000000000006"
      );
    } else {
      expect(source).toHaveBeenCalledWith(
        1,
        "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e"
      );
      expect(loadGithubComparison).toHaveBeenCalledWith(
        expect.any(Object),
        "https://github.com/Uniswap/v4-periphery/tree/main/src",
        "main",
        "src",
        expect.any(AbortSignal)
      );
      expect(screen.getByLabelText("Repository").getAttribute("value")).toBe(
        "https://github.com/Uniswap/v4-periphery/tree/main/src"
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Contract Diff" }));
    await screen.findByText("Examples");
  }
);

it("replaces examples with an editor skeleton while comparing, then shows the diff", async () => {
  let finish!: (value: any) => void;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  source.mockReturnValue(pending);
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory resetUrlUpdateQueueOnMount={false}>
        <ContractDiff />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  expect(screen.getByText("Examples")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /WETH/ }));
  expect(screen.queryByText("Examples")).toBeNull();
  expect(
    screen.getByRole("status", { name: "Loading comparison" })
  ).toBeTruthy();
  expect(screen.queryByText("Compared sources")).toBeNull();
  await act(async () => {
    finish({
      contractName: "WETH",
      sourceCode: { "WETH.sol": "contract WETH {}" },
    });
  });
  await screen.findByText("Compared sources");
  expect(
    screen.queryByRole("status", { name: "Loading comparison" })
  ).toBeNull();
});
it("restores examples after a failed comparison", async () => {
  source.mockRejectedValue(new Error("Unavailable"));
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory resetUrlUpdateQueueOnMount={false}>
        <ContractDiff />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: /WETH/ }));
  await screen.findByText("Examples");
  expect(
    screen.queryByRole("status", { name: "Loading comparison" })
  ).toBeNull();
});
