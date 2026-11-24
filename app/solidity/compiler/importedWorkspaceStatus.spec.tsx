import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ImportedWorkspaceStatus } from "./ImportedWorkspaceStatus";
import { DEFAULT_COMPILER_SETTINGS } from "@/lib/solidity/settings";
vi.mock("./OriginalComparison", () => ({
  default: () => <div>Original comparison opened</div>,
}));
afterEach(cleanup);
it("shows unsaved modifications immediately and opens comparison or a uniquely named fresh original", async () => {
  const address = `0x${"12".repeat(20)}`;
  const workspace: any = {
    files: [{ id: "file", name: "Token.sol", content: "contract Token {}" }],
    openFileIds: ["file"],
    activeFileId: "file",
    compilerSettings: DEFAULT_COMPILER_SETTINGS,
    importedContract: { address, chainId: 1 },
  };
  const record: any = {
    id: "imported-w",
    buildId: "imported-w",
    workspaceId: "w",
    address,
    chainId: 1,
    imported: { provider: "etherscan" },
  };
  const original: any = {
    id: record.buildId,
    workspaceId: "w",
    entry: "Token.sol",
    settings: DEFAULT_COMPILER_SETTINGS,
    input: {
      sources: { "Token.sol": { content: workspace.files[0].content } },
    },
    contract: { name: "Token" },
  };
  const history: any = {
    ready: true,
    records: [record],
    getBuild: vi.fn().mockResolvedValue(original),
  };
  const open = vi.fn().mockResolvedValue(undefined);
  const show = (value: any) => (
    <ChakraProvider>
      <ImportedWorkspaceStatus
        workspace={value}
        workspaceId="w"
        history={history}
        workspaceNames={["Token (original)"]}
        disabled={false}
        onOpenOriginal={open}
        onNavigate={vi.fn()}
        onRevertOriginal={vi.fn()}
      />
    </ChakraProvider>
  );
  const view = render(show(workspace));
  await waitFor(() => expect(history.getBuild).toHaveBeenCalled());
  expect(await screen.findByText("Matches onchain source code")).toBeTruthy();
  expect(screen.queryByText("Modified locally")).toBeNull();
  const edited = {
    ...workspace,
    files: [{ ...workspace.files[0], content: "contract Token { uint x; }" }],
  };
  view.rerender(show(edited));
  expect(await screen.findByText("Modified locally")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Compare with original" })
  );
  expect(await screen.findByText("Original comparison opened")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Open original in new workspace" })
  );
  await waitFor(() =>
    expect(open).toHaveBeenCalledWith("Token (original) 2", record, original)
  );
  view.rerender(show(workspace));
  expect(await screen.findByText("Matches onchain source code")).toBeTruthy();
  expect(screen.queryByText("Modified locally")).toBeNull();
});
