import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { revealExplorerRow } from "@/components/SourceCodeExplorer/revealExplorerRow";
import { FileExplorerPanel } from "@/components/SourceCodeExplorer/FileExplorerPanel";
import { buildFileTree } from "@/components/SourceCodeExplorer/utils";
import { WorkspaceFiles } from "./WorkspaceFiles";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});
it("scrolls only the nearest Files container enough to reveal the target", () => {
  const panel = document.createElement("div"),
    row = document.createElement("div");
  panel.dataset.sourceFilesScroll = "";
  panel.appendChild(row);
  document.body.appendChild(panel);
  Object.defineProperties(panel, {
    clientHeight: { value: 100 },
    scrollHeight: { value: 500 },
  });
  vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({
    top: 100,
    bottom: 200,
  } as DOMRect);
  vi.spyOn(row, "getClientRects").mockReturnValue([
    { top: 300, bottom: 330 },
  ] as unknown as DOMRectList);
  const rect = vi
    .spyOn(row, "getBoundingClientRect")
    .mockReturnValue({ top: 300, bottom: 330 } as DOMRect);
  const page = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  expect(revealExplorerRow(row)).toBe(true);
  expect(panel.scrollTop).toBe(130);
  expect(page).not.toHaveBeenCalled();
  rect.mockReturnValue({ top: 120, bottom: 150 } as DOMRect);
  revealExplorerRow(row);
  expect(panel.scrollTop).toBe(130);
  rect.mockReturnValue({ top: 80, bottom: 100 } as DOMRect);
  revealExplorerRow(row);
  expect(panel.scrollTop).toBe(110);
});
it("opens a collapsed Files section for an explicit import reveal", () => {
  const data = buildFileTree({ "A.sol": "contract A{}" });
  const props = {
    data,
    onFileSelect: vi.fn(),
    selectedPath: "A.sol",
    scrollToSelection: false,
    outline: { path: "", content: "", onSelect: vi.fn() },
  };
  const view = render(
    <ChakraProvider>
      <FileExplorerPanel {...props} />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Collapse Files" }));
  expect(screen.queryByRole("button", { name: "A.sol" })).toBeNull();
  view.rerender(
    <ChakraProvider>
      <FileExplorerPanel {...props} revealSelection={1} />
    </ChakraProvider>
  );
  expect(screen.getByRole("button", { name: "A.sol" })).toBeTruthy();
});
it("expands import ancestors without enabling automatic page scrolling on initial workspace load", async () => {
  const files = [
    { id: "root", name: "Root.sol", content: "contract Root{}" },
    {
      id: "target",
      name: "lib/nested/Target.sol",
      content: "contract Target{}",
    },
  ];
  const workspace = { files, openFileIds: ["root"], activeFileId: "root" };
  const props = {
    workspace,
    update: vi.fn(),
    disabled: false,
    isOpen: true,
    onClose: vi.fn(),
  };
  const view = render(
    <ChakraProvider>
      <WorkspaceFiles {...props} />
    </ChakraProvider>
  );
  expect(
    screen
      .getByRole("button", { name: "lib" })
      .getAttribute("aria-expanded")
  ).toBe("false");
  view.rerender(
    <ChakraProvider>
      <WorkspaceFiles
        {...props}
        workspace={{
          ...workspace,
          activeFileId: "target",
          openFileIds: ["root", "target"],
        }}
        revealFile={{ id: "target", nonce: 1 }}
      />
    </ChakraProvider>
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "lib/nested/Target.sol" })
    ).toBeTruthy()
  );
  expect(
    screen
      .getByRole("button", { name: "lib" })
      .getAttribute("aria-expanded")
  ).toBe("true");
});
