import React, { useState } from "react";
import { DependencyFolderActions } from "./DependencyFolderActions";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import {
  githubCommit,
  installGithubDependency,
} from "@/lib/solidity/githubDependencies";
import { WorkspaceDependencies } from "./WorkspaceDependencies";
import {
  latestNpmVersion,
  installNpmDependency,
} from "@/lib/solidity/dependencies";
vi.mock("@/lib/solidity/githubDependencies", () => ({
  githubCommit: vi.fn(),
  installGithubDependency: vi.fn(),
}));
vi.mock("@/lib/solidity/dependencies", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/solidity/dependencies")>()),
  latestNpmVersion: vi.fn(),
  installNpmDependency: vi.fn(),
}));
const scrollToDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollTo"
);
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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
async function open() {
  render(
    <ChakraProvider>
      <WorkspaceDependencies
        workspace={{ files: [], activeFileId: null, openFileIds: [] }}
        update={vi.fn()}
        disabled={false}
      />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Manage dependencies" }));
  await screen.findByRole("dialog", { name: "Dependencies" });
}
it("links the selected npm package and fills its latest version without installing", async () => {
  vi.mocked(latestNpmVersion).mockResolvedValue("5.6.1");
  await open();
  expect(screen.getByRole("link", { name: /npmjs/ }).getAttribute("href")).toBe(
    "https://www.npmjs.com/package/@openzeppelin/contracts"
  );
  fireEvent.click(screen.getByRole("button", { name: "Fetch latest" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Exact version") as HTMLInputElement).value
    ).toBe("5.6.1")
  );
  expect(installNpmDependency).not.toHaveBeenCalled();
});
it("ignores a late registry result after the user changes the package or version", async () => {
  let finish!: (version: string) => void;
  vi.mocked(latestNpmVersion).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  await open();
  fireEvent.change(screen.getByLabelText("Exact version"), {
    target: { value: "5.4.0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Fetch latest" }));
  fireEvent.change(screen.getByLabelText("Exact version"), {
    target: { value: "5.5.0" },
  });
  await act(async () => finish("9.9.9"));
  expect(
    (screen.getByLabelText("Exact version") as HTMLInputElement).value
  ).toBe("5.5.0");
  fireEvent.click(screen.getByRole("button", { name: "Fetch latest" }));
  fireEvent.change(screen.getByLabelText("npm package"), {
    target: { value: "solmate" },
  });
  await act(async () => finish("9.9.9"));
  expect(
    (screen.getByLabelText("Exact version") as HTMLInputElement).value
  ).toBe("5.5.0");
  expect(screen.getByRole("link", { name: /npmjs/ }).getAttribute("href")).toBe(
    "https://www.npmjs.com/package/solmate"
  );
});

it("routes a library folder's delete action through dependency confirmation before modifying sources", async () => {
  const dep = {
    name: "@test/pkg",
    version: "1.0.0",
    files: [{ path: "@test/pkg/A.sol", integrity: "sha256-pinned" }],
  };
  const workspace = {
    files: [
      { id: "a", name: "A.sol", content: "contract A{}" },
      { id: "dep", name: "@test/pkg/A.sol", content: "contract Lib{}" },
    ],
    dependencies: [dep],
    openFileIds: ["a"],
    activeFileId: "a",
  };
  const update = vi.fn();
  function App() {
    const [request, setRequest] = useState<{
      name: string;
      nonce: number;
      remove: boolean;
    }>();
    return (
      <ChakraProvider>
        <div role="group">
          <DependencyFolderActions
            path="@test"
            packages={[dep]}
            disabled={false}
            onDelete={(name) => setRequest({ name, nonce: 1, remove: true })}
          />
        </div>
        <WorkspaceDependencies
          workspace={workspace}
          update={update}
          disabled={false}
          showTrigger={false}
          request={request}
        />
      </ChakraProvider>
    );
  }
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Actions for dependency folder @test" })
  );
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Delete dependency" })
  );
  await screen.findByRole("dialog", { name: "Dependencies" });
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(
    await screen.findByRole("button", { name: "Remove package" })
  );
  expect(update).toHaveBeenCalledOnce();
  expect(update.mock.calls[0][0](workspace).files).toEqual([
    workspace.files[0],
  ]);
});

it("fetches and installs a pinned GitHub dependency from the same modal", async () => {
  const sha = "a".repeat(40);
  vi.mocked(githubCommit).mockResolvedValue(sha);
  vi.mocked(installGithubDependency).mockResolvedValue({
    lock: {
      name: "github.com/vectorized/solady",
      source: "github",
      repository: "Vectorized/solady",
      version: sha,
      files: [],
    },
    sources: [],
  });
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "GitHub" }));
  expect((screen.getByLabelText("Repository") as HTMLInputElement).value).toBe(
    "Vectorized/solady"
  );
  fireEvent.click(screen.getByRole("button", { name: "Fetch latest" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Git reference") as HTMLInputElement).value
    ).toBe(sha)
  );
  expect(installGithubDependency).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Install" }));
  await waitFor(() =>
    expect(installGithubDependency).toHaveBeenCalledWith(
      expect.anything(),
      "Vectorized/solady",
      sha,
      expect.any(AbortSignal),
      expect.any(Function)
    )
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Dependencies" })).toBeNull()
  );
});

it("switches an npm draft to GitHub when opened from an inline GitHub request", async () => {
  const props = {
    workspace: { files: [], activeFileId: null, openFileIds: [] },
    update: vi.fn(),
    disabled: false,
  };
  const view = render(
    <ChakraProvider>
      <WorkspaceDependencies {...props} />
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Manage dependencies" }));
  expect(
    screen.getByRole("tab", { name: "npm" }).getAttribute("aria-selected")
  ).toBe("true");
  view.rerender(
    <ChakraProvider>
      <WorkspaceDependencies
        {...props}
        request={{
          name: "github.com/Vectorized/solady/src/tokens/ERC20.sol",
          source: "github",
          nonce: 1,
        }}
      />
    </ChakraProvider>
  );
  await waitFor(() =>
    expect(
      screen.getByRole("tab", { name: "GitHub" }).getAttribute("aria-selected")
    ).toBe("true")
  );
  expect((screen.getByLabelText("Repository") as HTMLInputElement).value).toBe(
    "Vectorized/solady"
  );
});
