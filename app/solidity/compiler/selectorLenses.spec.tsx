// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { registerSelectorLenses } from "@/components/SourceCodeExplorer/selectorLenses";
import { importDeclarations } from "@/lib/solidity/compilation";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import { functionSelectors } from "@/lib/solidity/functionSelectors";
class SelectorWorker {
  static instances: SelectorWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  messages: { id: number; content: string }[] = [];
  terminate = vi.fn();
  constructor() {
    SelectorWorker.instances.push(this);
  }
  postMessage(data: SelectorWorker["messages"][number]) {
    this.messages.push(data);
  }
  finish(index = 0) {
    const request = this.messages[index];
    this.onmessage?.({
      data: {
        id: request.id,
        selectors: functionSelectors(request.content),
        imports: importDeclarations(request.content),
      },
    } as MessageEvent);
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  SelectorWorker.instances = [];
  vi.stubGlobal("Worker", SelectorWorker);
  vi.stubGlobal("navigator", {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function setup(dependencies?: Parameters<typeof registerSelectorLenses>[2]) {
  let text =
    "contract A {\n function mint(address to,uint amount) external {}\n}";
  let version = 1;
  const model = {
    uri: { scheme: "ethsh-solidity", path: "/entry" },
    getValue: () => text,
    getVersionId: () => version,
    getLanguageId: () => "sol",
    isDisposed: () => false,
  };
  let active = model;
  const events: Record<string, () => void> = {};
  const listener = (name: string) => (fn: () => void) => {
    events[name] = fn;
    return { dispose: vi.fn() };
  };
  const editor = {
    getId: () => "test-editor",
    getModel: () => active,
    onDidChangeModel: listener("model"),
    onDidChangeModelContent: listener("content"),
    onDidChangeModelLanguage: listener("language"),
    onDidDispose: listener("dispose"),
  };
  let provider: any, command: any;
  const commands = new Map<string, (...args: any[]) => unknown>();
  const providerDispose = vi.fn(),
    commandDispose = vi.fn();
  const monaco = {
    Emitter: class {
      event = vi.fn();
      fire = vi.fn();
      dispose = vi.fn();
    },
    Range: class {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number
      ) {}
    },
    languages: {
      registerCodeLensProvider: vi.fn((_, value) => {
        provider = value;
        return { dispose: providerDispose };
      }),
    },
    editor: {
      registerCommand: vi.fn((id, value) => {
        commands.set(id, value);
        command = value;
        return { dispose: commandDispose };
      }),
    },
  };
  const registration = registerSelectorLenses(
    editor as never,
    monaco as never,
    dependencies
  );
  return {
    registration,
    events,
    model,
    providerDispose,
    commandDispose,
    lenses: () => provider.provideCodeLenses(active).lenses,
    foreignLenses: () => provider.provideCodeLenses({ ...model }).lenses,
    copy: (value: string) => command(null, value),
    openImport: (id: string) =>
      commands.get("ethsh.openImportedFile.test-editor")?.(null, id),
    install: (value: string) =>
      commands.get("ethsh.installDependency.test-editor")?.(null, value),
    edit: (value: string) => {
      text = value;
      version++;
      events.content();
    },
    switchModel: () => {
      active = {
        ...model,
        getValue: () =>
          "interface I { function totalSupply() external returns(uint); }",
      };
      events.model();
    },
  };
}
it("adds copy lenses at real declaration lines and isolates them to this editor's model", async () => {
  const view = setup();
  expect(SelectorWorker.instances).toHaveLength(0);
  vi.advanceTimersByTime(300);
  SelectorWorker.instances[0].finish();
  expect(view.lenses()).toHaveLength(1);
  expect(view.lenses()[0].range.startLineNumber).toBe(2);
  expect(view.lenses()[0].command.title).toContain("0x40c10f19");
  expect(view.foreignLenses()).toEqual([]);
  await view.copy("0x40c10f19");
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith("0x40c10f19");
  expect(view.lenses()[0].command.title).toContain("Copied selector");
  vi.advanceTimersByTime(1500);
  expect(view.lenses()[0].command.title).toContain("0x40c10f19");
  view.registration.dispose();
  expect(view.providerDispose).toHaveBeenCalledOnce();
  expect(view.commandDispose).toHaveBeenCalledOnce();
  expect(SelectorWorker.instances[0].terminate).toHaveBeenCalledOnce();
});
it("debounces edits and ignores stale replies across edits and file switches", () => {
  const view = setup();
  vi.advanceTimersByTime(300);
  const worker = SelectorWorker.instances[0];
  view.edit(
    "\ncontract B { function transfer(address to,uint amount) external {} }"
  );
  worker.finish();
  expect(view.lenses()).toEqual([]);
  vi.advanceTimersByTime(300);
  worker.finish(1);
  expect(view.lenses()[0].range.startLineNumber).toBe(2);
  expect(view.lenses()[0].command.title).toContain("0xa9059cbb");
  view.switchModel();
  expect(view.lenses()).toEqual([]);
  worker.finish(1);
  expect(view.lenses()).toEqual([]);
  vi.advanceTimersByTime(300);
  worker.finish(2);
  expect(view.lenses()[0].command.title).toContain("0x18160ddd");
  view.events.dispose();
  worker.finish(2);
  expect(view.providerDispose).toHaveBeenCalledOnce();
});

it("offers installation only for missing npm imports and removes it when workspace sources arrive", () => {
  let workspace: SolidityWorkspace = {
    files: [{ id: "entry", name: "A.sol", content: "" }],
    activeFileId: "entry",
    openFileIds: ["entry"],
  };
  const onInstall = vi.fn();
  const view = setup({ getWorkspace: () => workspace, onInstall });
  view.edit(
    'import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";\nimport "./Local.sol";\ncontract A {}'
  );
  vi.advanceTimersByTime(300);
  SelectorWorker.instances[0].finish();
  expect(view.lenses()).toHaveLength(1);
  expect(view.lenses()[0].range.startLineNumber).toBe(1);
  expect(view.lenses()[0].command.title).toContain(
    "Install dependency: @openzeppelin/contracts"
  );
  view.install("other-package");
  expect(onInstall).not.toHaveBeenCalled();
  view.install("@openzeppelin/contracts");
  expect(onInstall).toHaveBeenCalledWith("@openzeppelin/contracts", "npm");
  workspace = {
    ...workspace,
    files: [
      ...workspace.files,
      {
        id: "dep",
        name: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
        content: "",
      },
    ],
  };
  view.registration.refreshContext();
  expect(view.lenses()).toEqual([]);
  view.install("@openzeppelin/contracts");
  expect(onInstall).toHaveBeenCalledTimes(1);
  view.registration.dispose();
});

it("passes GitHub source metadata from inline imports to the installer", () => {
  const workspace: SolidityWorkspace = {
    files: [{ id: "entry", name: "A.sol", content: "" }],
    activeFileId: "entry",
    openFileIds: ["entry"],
  };
  const onInstall = vi.fn();
  const view = setup({ getWorkspace: () => workspace, onInstall });
  const target = "github.com/Vectorized/solady/src/tokens/ERC20.sol";
  view.edit(`import "${target}"; contract A {}`);
  vi.advanceTimersByTime(300);
  SelectorWorker.instances[0].finish();
  expect(view.lenses()[0].command.arguments).toEqual([target]);
  view.install(target);
  expect(onInstall).toHaveBeenCalledWith(target, "github");
  view.registration.dispose();
});

it("opens relative, npm and remapped GitHub imports by file ID and rejects stale targets", () => {
  let workspace: SolidityWorkspace = {
    files: [
      { id: "entry", name: "A.sol", content: "" },
      { id: "local", name: "Local.sol", content: "" },
      { id: "npm", name: "@test/pkg/B.sol", content: "" },
      {
        id: "git",
        name: "github.com/vectorized/solady/src/X.sol",
        content: "",
      },
    ],
    activeFileId: "entry",
    openFileIds: ["entry"],
    dependencies: [
      {
        name: "github.com/vectorized/solady",
        source: "github",
        repository: "Vectorized/solady",
        version: "a".repeat(40),
        prefixes: ["https://github.com/Vectorized/solady/blob/main/"],
        files: [],
      },
    ],
  };
  const onOpenImport = vi.fn();
  const view = setup({
    getWorkspace: () => workspace,
    onOpenImport,
    onInstall: vi.fn(),
  });
  view.edit(
    'import "./Local.sol";\nimport "@test/pkg/B.sol";\nimport "https://github.com/Vectorized/solady/blob/main/src/X.sol";'
  );
  vi.advanceTimersByTime(300);
  SelectorWorker.instances[0].finish();
  expect(view.lenses().map((lens: any) => lens.command.arguments[0])).toEqual([
    "local",
    "npm",
    "git",
  ]);
  expect(
    view
      .lenses()
      .every((lens: any) => lens.command.title.includes("Open file"))
  ).toBe(true);
  view.openImport("not-imported");
  expect(onOpenImport).not.toHaveBeenCalled();
  view.openImport("git");
  expect(onOpenImport).toHaveBeenCalledWith("git");
  workspace = {
    ...workspace,
    files: workspace.files.filter((file) => file.id !== "git"),
  };
  view.registration.refreshContext();
  view.openImport("git");
  expect(onOpenImport).toHaveBeenCalledTimes(1);
  view.registration.dispose();
});
it("supports import navigation in read-only source viewers without a compiler workspace", () => {
  const onOpenImport = vi.fn();
  const view = setup({
    resolveSourceImport: (path) =>
      path === "./B.sol"
        ? { id: "contracts/B.sol", name: "contracts/B.sol" }
        : null,
    onOpenImport,
  });
  view.edit('import "./B.sol"; import "./Missing.sol";');
  vi.advanceTimersByTime(300);
  SelectorWorker.instances[0].finish();
  expect(view.lenses()).toHaveLength(1);
  view.openImport("contracts/B.sol");
  expect(onOpenImport).toHaveBeenCalledWith("contracts/B.sol");
  view.registration.dispose();
});
