import React, { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  ChakraProvider,
  Menu,
  MenuButton,
  MenuList,
  Button,
} from "@chakra-ui/react";
import { WorkspaceBackupActions } from "./WorkspaceBackup";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
const update = vi.fn();
const create = vi.fn(
  async (_name: string, _workspace: SolidityWorkspace) => {}
);
const initial: SolidityWorkspace = {
  files: [{ id: "old", name: "Old.sol", content: "contract Old{}" }],
  activeFileId: "old",
  openFileIds: ["old"],
};
function App() {
  const [workspace, setWorkspace] = useState(initial);
  return (
    <ChakraProvider>
      <WorkspaceBackupActions
        workspace={workspace}
        workspaceName="Original"
        workspaceNames={["Original"]}
        onCreate={create}
        update={(edit) => {
          update();
          setWorkspace(edit);
        }}
        disabled={false}
        onOpen={() => {}}
      >
        {(actions) => (
          <Menu>
            <MenuButton as={Button}>Workspace actions</MenuButton>
            <MenuList>{actions}</MenuList>
          </Menu>
        )}
      </WorkspaceBackupActions>
    </ChakraProvider>
  );
}
async function open(
  settings: Record<string, unknown> = {
    optimizer: { enabled: true, runs: 1000 },
  },
  content = "contract New{}"
) {
  render(<App />);
  const file = new File([""], "input.json", { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: async () =>
      JSON.stringify({
        language: "Solidity",
        sources: { "New.sol": { content } },
        settings,
      }),
  });
  fireEvent.change(screen.getByLabelText("Standard JSON input file"), {
    target: { files: [file] },
  });
  await screen.findByRole("radio", { name: "Create new workspace" });
}
beforeEach(() => {
  update.mockClear();
  create.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows one step at a time, preserves choices going back and only imports at confirmation", async () => {
  await open();
  expect(
    screen.queryByRole("combobox", { name: "Imported entry file" })
  ).toBeNull();
  expect(screen.queryByText(/Replaces 1 files/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    await screen.findByRole("combobox", { name: "Imported entry file" })
  ).toBeTruthy();
  expect(
    screen.queryByRole("radio", { name: "Create new workspace" })
  ).toBeNull();
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    await screen.findByRole("button", { name: /^Create workspace$/ })
  ).toBeTruthy();
  expect(screen.getAllByText("New.sol").length).toBeGreaterThan(0);
  expect(
    screen.queryByRole("combobox", { name: "Imported entry file" })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(
    await screen.findByRole("combobox", { name: "Imported entry file" })
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(
    await screen.findByRole("button", { name: /^Create workspace$/ })
  );
  await waitFor(() => expect(create).toHaveBeenCalledOnce());
  expect(create.mock.calls[0][0]).toBe("input");
  expect(create.mock.calls[0][1].files.map((file) => file.name)).toEqual([
    "New.sol",
  ]);
  expect(update).not.toHaveBeenCalled();
  expect(initial.files[0].name).toBe("Old.sol");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
it("skips setup for Add files and supports returning to the mode step", async () => {
  await open();
  fireEvent.click(
    screen.getByRole("radio", {
      name: "Add files to current workspace (Original)",
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    await screen.findByRole("button", { name: /^Add files$/ })
  ).toBeTruthy();
  expect(
    screen.queryByRole("combobox", { name: "Imported entry file" })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(
    (
      (await screen.findByRole("radio", {
        name: "Add files to current workspace (Original)",
      })) as HTMLInputElement
    ).checked
  ).toBe(true);
  expect(update).not.toHaveBeenCalled();
});
it("blocks review when the chosen compiler cannot support imported settings", async () => {
  await open({ evmVersion: "osaka" });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("combobox", { name: "Imported entry file" });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: /^Create workspace$/ })
  ).toBeNull();
  expect(update).not.toHaveBeenCalled();
});
it("validates a new workspace name and keeps the current files intact on creation failure", async () => {
  await open();
  fireEvent.change(
    screen.getByRole("textbox", { name: "Imported workspace name" }),
    { target: { value: "Original" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(create).not.toHaveBeenCalled();
  fireEvent.change(
    screen.getByRole("textbox", { name: "Imported workspace name" }),
    { target: { value: "New import" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("combobox", { name: "Imported entry file" });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  create.mockRejectedValueOnce(new Error("Storage failed"));
  fireEvent.click(
    await screen.findByRole("button", { name: /^Create workspace$/ })
  );
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(update).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeTruthy();
});

it("automatically picks an exact entry pragma without applying changes to the current workspace", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        releases: {
          "0.8.28": "soljson-v0.8.28+commit.7893614a.js",
          "0.8.30": "soljson-v0.8.30+commit.73712a01.js",
        },
      }),
    }))
  );
  await open(
    { optimizer: { enabled: true, runs: 1000 } },
    "pragma solidity 0.8.28; contract New{}"
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(
    await screen.findByRole("button", { name: "solc 0.8.28" })
  ).toBeTruthy();
  expect(create).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});
