import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { FileExplorerTree } from "@/components/SourceCodeExplorer/FileExplorerTree";
import { FileExplorerPanel } from "@/components/SourceCodeExplorer/FileExplorerPanel";
import { buildFileTree } from "@/components/SourceCodeExplorer/utils";
import { WorkspaceFiles } from "./WorkspaceFiles";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";

const scrollToDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollTo"
);
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (scrollToDescriptor)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollTo",
      scrollToDescriptor
    );
  else
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)
      .scrollTo;
});
const data = buildFileTree({
  "contracts/Token.sol": "contract Token {}",
  "Root.sol": "contract Root {}",
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);
it("preserves the contract viewer's target flags, compact folders and read-only selection", () => {
  const compact = buildFileTree(
    { "lib/contracts/Token.sol": "token" },
    "Token.sol"
  );
  expect(compact[0]).toMatchObject({
    name: "lib/contracts",
    path: "lib/contracts",
  });
  expect(compact[0].children?.[0]).toMatchObject({ isTarget: true });
  const select = vi.fn();
  render(<FileExplorerPanel data={compact} onFileSelect={select} />, {
    wrapper,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "lib/contracts/Token.sol" })
  );
  expect(select).toHaveBeenCalledWith("lib/contracts/Token.sol", "token");
  expect(screen.queryByRole("button", { name: /Actions/ })).toBeNull();
});
it("keeps empty folders and stable workspace file IDs without compacting editable folders", () => {
  const nodes = buildFileTree({ "contracts/utils/Token.sol": "" }, undefined, {
    folders: ["empty/nested"],
    fileIds: { "contracts/utils/Token.sol": "stable-id" },
    compactFolders: false,
  });
  expect(nodes[0].name).toBe("contracts");
  expect(nodes[0].children?.[0].name).toBe("utils");
  expect(nodes[0].children?.[0].children?.[0].id).toBe("stable-id");
  expect(nodes[1].children?.[0]).toMatchObject({
    name: "nested",
    children: [],
  });
  expect(
    buildFileTree({}, undefined, { folders: ["empty"], compactFolders: false })
  ).toMatchObject([{ name: "empty", children: [] }]);
});
it("keeps actions outside selection targets and respects disabled file navigation", () => {
  const select = vi.fn(),
    action = vi.fn();
  const view = render(
    <FileExplorerTree
      data={data}
      onFileSelect={select}
      renderActions={(node) => (
        <button aria-label={`Actions for ${node.path}`} onClick={action}>
          Actions
        </button>
      )}
    />,
    { wrapper }
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Actions for contracts/Token.sol",
    })
  );
  expect(action).toHaveBeenCalledOnce();
  expect(select).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "contracts/Token.sol" }));
  expect(select).toHaveBeenCalledOnce();
  view.rerender(
    <FileExplorerTree data={data} onFileSelect={select} disabled />
  );
  fireEvent.click(screen.getByRole("button", { name: "contracts/Token.sol" }));
  expect(select).toHaveBeenCalledOnce();
});
it("supports shared controlled folder selection and expansion", () => {
  const select = vi.fn();
  function Tree() {
    const [collapsed, setCollapsed] = useState(new Set<string>());
    return (
      <FileExplorerTree
        data={data}
        onFileSelect={() => {}}
        collapsedPaths={collapsed}
        onFolderSelect={select}
        onFolderToggle={(path) =>
          setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
          })
        }
      />
    );
  }
  render(<Tree />, { wrapper });
  const folder = screen.getByRole("button", { name: "contracts" });
  expect(folder.getAttribute("aria-expanded")).toBe("true");
  fireEvent.click(folder);
  expect(folder.getAttribute("aria-expanded")).toBe("false");
  expect(select).toHaveBeenCalledWith("contracts");
  fireEvent.click(folder);
  expect(folder.getAttribute("aria-expanded")).toBe("true");
});
it("retains compiler folder creation, nested file creation, rename/move and file downloads", async () => {
  let current: SolidityWorkspace = {
    files: [{ id: "root", name: "Root.sol", content: "contract Root {}" }],
    folders: [],
    activeFileId: "root",
    openFileIds: ["root"],
  };
  function CompilerFiles() {
    const [workspace, setWorkspace] = useState(current);
    return (
      <WorkspaceFiles
        workspace={workspace}
        update={(edit) =>
          setWorkspace((before) => {
            current = edit(before);
            return current;
          })
        }
        disabled={false}
        isOpen={true}
        onClose={() => {}}
      />
    );
  }
  render(<CompilerFiles />, { wrapper });
  fireEvent.click(await screen.findByRole("button", { name: "New folder" }));
  fireEvent.change(
    await screen.findByRole("textbox", { name: "Folder path" }),
    {
      target: { value: "contracts/empty" },
    }
  );
  fireEvent.click(await screen.findByRole("button", { name: "Create folder" }));
  expect(current.folders).toContain("contracts/empty");
  // Opening the folder's action menu does not alter the current file.
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Actions for contracts/empty",
    })
  );
  expect(current.activeFileId).toBe("root");
  fireEvent.click(await screen.findByRole("menuitem", { name: "New file" }));
  fireEvent.change(
    await screen.findByRole("textbox", { name: "Solidity filename" }),
    {
      target: { value: "contracts/empty/Token.sol" },
    }
  );
  fireEvent.click(await screen.findByRole("button", { name: "Create file" }));
  expect(
    current.files.find((file) => file.id === current.activeFileId)?.name
  ).toBe("contracts/empty/Token.sol");
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Actions for contracts/empty/Token.sol",
    })
  );
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Rename / move" })
  );
  const tokenId = current.activeFileId;
  fireEvent.change(
    await screen.findByRole("textbox", { name: "Solidity filename" }),
    {
      target: { value: "contracts/Renamed.sol" },
    }
  );
  fireEvent.click(await screen.findByRole("button", { name: "Save" }));
  expect(current.files.find((file) => file.id === tokenId)?.name).toBe(
    "contracts/Renamed.sol"
  );
  expect(
    screen.queryByRole("button", { name: "Workspace backup actions" })
  ).toBeNull();
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Actions for contracts/Renamed.sol",
    })
  );
  expect(
    await screen.findByRole("menuitem", { name: "Download" })
  ).toBeTruthy();
});

it("collapses workspace folders outside the entry path and never scrolls the page to the selection", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollIntoView"
  );
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scroll,
  });
  try {
    const workspace: SolidityWorkspace = {
      files: [
        {
          id: "entry",
          name: "contracts/mocks/Main.sol",
          content: "contract Main{}",
        },
        {
          id: "lib",
          name: "@openzeppelin/contracts/Lib.sol",
          content: "library Lib{}",
        },
        {
          id: "other",
          name: "examples/Other.sol",
          content: "contract Other{}",
        },
      ],
      folders: ["empty"],
      activeFileId: "entry",
      openFileIds: ["entry"],
    };
    const props = {
      workspace,
      update: vi.fn(),
      disabled: false,
      isOpen: true,
      onClose: vi.fn(),
    };
    const view = render(<WorkspaceFiles {...props} />, { wrapper });
    expect(
      screen
        .getByRole("button", { name: "contracts" })
        .getAttribute("aria-expanded")
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "contracts/mocks" })
        .getAttribute("aria-expanded")
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "@openzeppelin" })
        .getAttribute("aria-expanded")
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "examples" })
        .getAttribute("aria-expanded")
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "empty" })
        .getAttribute("aria-expanded")
    ).toBe("false");
    expect(
      screen.getByRole("button", { name: "contracts/mocks/Main.sol" })
    ).toBeTruthy();
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "examples" }));
    expect(
      screen
        .getByRole("button", { name: "examples" })
        .getAttribute("aria-expanded")
    ).toBe("true");
    view.rerender(
      <WorkspaceFiles
        {...props}
        workspace={{
          ...workspace,
          activeFileId: "lib",
          openFileIds: ["entry", "lib"],
        }}
      />
    );
    expect(
      await screen.findByRole("button", {
        name: "@openzeppelin/contracts/Lib.sol",
      })
    ).toBeTruthy();
    expect(scroll).not.toHaveBeenCalled();
    view.unmount();
    render(
      <FileExplorerTree
        data={data}
        selectedPath="Root.sol"
        onFileSelect={() => {}}
      />,
      { wrapper }
    );
    expect(scroll).not.toHaveBeenCalled();
  } finally {
    if (descriptor)
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollIntoView",
        descriptor
      );
    else
      delete (HTMLElement.prototype as unknown as Record<string, unknown>)
        .scrollIntoView;
  }
});
