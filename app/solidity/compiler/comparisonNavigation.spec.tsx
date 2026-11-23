import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import OriginalComparison from "./OriginalComparison";
vi.mock("@/components/SourceCodeExplorer", () => ({
  SourceCodeExplorer: ({ onDiffNavigate: onNavigate }: any) => (
    <button disabled={!onNavigate} onClick={() => onNavigate?.("A.sol", 45)}>
      Diff line 45
    </button>
  ),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("closes the comparison and navigates to the local file ID and selected line", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  );
  const onClose = vi.fn(),
    onNavigate = vi.fn();
  const workspace: any = {
    files: [
      { id: "live-source", name: "A.sol", content: "contract A { uint x; }" },
    ],
  };
  const original: any = {
    input: { sources: { "A.sol": { content: "contract A {}" } } },
  };
  render(
    <ChakraProvider>
      <OriginalComparison
        workspace={workspace}
        original={original}
        changes={{ files: ["A.sol"], settings: false, modified: true }}
        onClose={onClose}
        onNavigate={onNavigate}
        onRevert={vi.fn()}
        disabled={false}
      />
    </ChakraProvider>
  );
  fireEvent.click(await screen.findByRole("button", { name: "Diff line 45" }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onNavigate).toHaveBeenCalledWith("live-source", 45);
});

it("requires a second confirmation before reverting and leaves the comparison open if reverting fails", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  );
  const onRevert = vi.fn().mockRejectedValue(new Error("Save failed"));
  const onClose = vi.fn();
  render(
    <ChakraProvider>
      <OriginalComparison
        workspace={
          { files: [{ id: "a", name: "A.sol", content: "edited" }] } as any
        }
        original={
          { input: { sources: { "A.sol": { content: "original" } } } } as any
        }
        changes={{ files: ["A.sol"], settings: false, modified: true }}
        onClose={onClose}
        onNavigate={vi.fn()}
        disabled={false}
        onRevert={onRevert}
      />
    </ChakraProvider>
  );
  expect(screen.queryByText(/Click a line to open/)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Revert to original" })
  );
  expect(await screen.findByRole("alertdialog")).toBeTruthy();
  expect(
    screen.getByText(/Local edits and added files will be removed/)
  ).toBeTruthy();
  expect(onRevert).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onRevert).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Revert to original" })
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Revert workspace" })
  );
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Save failed"
  );
  expect(onRevert).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
});
