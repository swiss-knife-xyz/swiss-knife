import { dependencyCompilerSettings } from "@/lib/solidity/dependencySettings";
import { githubImport } from "@/lib/solidity/githubSources";
import { resolveImport } from "@/lib/solidity/compilation";
import { npmPackageForImport } from "@/lib/solidity/dependencies";
import type { SourceImport } from "@/lib/solidity/compilation";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import type { OnMount } from "@monaco-editor/react";
import type { FunctionSelector } from "@/lib/solidity/functionSelectors";

type Editor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

/** Scoped to this editor's current model, including file switches and read-only views. */
export function registerSelectorLenses(
  editor: Editor,
  monaco: Monaco,
  dependencies?: {
    getWorkspace?(): SolidityWorkspace | null;
    onInstall?(name: string, source: "npm" | "github"): void;
    resolveSourceImport?(path: string): { id: string; name: string } | null;
    onOpenImport?(id: string): void;
  }
) {
  type Provider = Parameters<
    Monaco["languages"]["registerCodeLensProvider"]
  >[1];
  const changed = new monaco.Emitter<Provider>();
  const commandId = `ethsh.copyFunctionSelector.${editor.getId()}`;
  let worker: Worker | null = null;
  let sequence = 0;
  let selectors: FunctionSelector[] = [];
  let imports: SourceImport[] = [];
  const installCommandId = `ethsh.installDependency.${editor.getId()}`;
  const missingImports = () => {
    const workspace = dependencies?.getWorkspace?.();
    const model = editor.getModel();
    if (
      !workspace ||
      !model ||
      model.uri.scheme !== "ethsh-solidity" ||
      !workspace.files.some((file) => model.uri.path === `/${file.id}`)
    )
      return [];
    const paths = new Set(workspace.files.map((file) => file.name));
    return imports.flatMap((item) => {
      const git = githubImport(item.path);
      const name = git?.root ?? npmPackageForImport(item.path);
      const resolved = resolveImport(
        "",
        item.path,
        dependencyCompilerSettings(
          workspace.compilerSettings,
          workspace.dependencies
        ).extras?.remappings
      );
      if (!name || paths.has(resolved)) return [];
      // A known editable project directory is not an npm package.
      if (
        !git &&
        !name.startsWith("@") &&
        !workspace.dependencies?.some((dep) => dep.name === name) &&
        (workspace.folders?.includes(name) ||
          workspace.files.some((file) => file.name.startsWith(name + "/")))
      )
        return [];
      return [
        {
          ...item,
          name,
          target: git ? item.path : name,
          source: git ? ("github" as const) : ("npm" as const),
        },
      ];
    });
  };
  const openCommandId = `ethsh.openImportedFile.${editor.getId()}`;
  const resolvedImports = () => {
    if (!dependencies?.onOpenImport) return [];
    const workspace = dependencies.getWorkspace?.();
    const model = editor.getModel();
    const from = workspace?.files.find(
      (file) =>
        model?.uri.scheme === "ethsh-solidity" &&
        model.uri.path === `/${file.id}`
    );
    const remappings = workspace
      ? dependencyCompilerSettings(
          workspace.compilerSettings,
          workspace.dependencies
        ).extras?.remappings
      : [];
    return imports.flatMap((item) => {
      const path = from ? resolveImport(from.name, item.path, remappings) : "";
      const file = dependencies.resolveSourceImport
        ? dependencies.resolveSourceImport(item.path)
        : workspace?.files.find((file) => file.name === path);
      return file ? [{ ...item, file }] : [];
    });
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  let copied = "";
  let disposed = false;
  const stopWorker = () => {
    if (watchdog) clearTimeout(watchdog);
    worker?.terminate();
    worker = null;
  };
  const refresh = () => {
    const id = ++sequence;
    clearTimeout(timer);
    clearTimeout(feedbackTimer);
    if (watchdog) clearTimeout(watchdog);
    copied = "";
    selectors = [];
    imports = [];
    changed.fire(definition);
    const model = editor.getModel();
    if (!model || model.getLanguageId() !== "sol") return;
    const version = model.getVersionId();
    timer = setTimeout(() => {
      try {
        worker ??= new Worker(
          new URL("./selectors.worker.ts", import.meta.url)
        );
        worker.onmessage = ({
          data,
        }: MessageEvent<{
          id: number;
          selectors: FunctionSelector[];
          imports?: SourceImport[];
        }>) => {
          if (
            disposed ||
            data.id !== sequence ||
            editor.getModel() !== model ||
            model.isDisposed() ||
            model.getVersionId() !== version
          )
            return;
          selectors = data.selectors;
          imports = data.imports ?? [];
          if (watchdog) clearTimeout(watchdog);
          changed.fire(definition);
        };
        worker.onerror = stopWorker;
        watchdog = setTimeout(stopWorker, 10000);
        worker.postMessage({ id, content: model.getValue() });
      } catch {
        stopWorker();
      }
    }, 300);
  };
  const command = monaco.editor.registerCommand(
    commandId,
    async (_, selector: string) => {
      if (!selectors.some((item) => item.selector === selector)) return;
      try {
        await navigator.clipboard.writeText(selector);
        if (disposed) return;
        copied = selector;
        changed.fire(definition);
        clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(() => {
          copied = "";
          changed.fire(definition);
        }, 1500);
      } catch {
        /* Clipboard may be unavailable outside secure contexts. */
      }
    }
  );
  const installCommand = dependencies?.onInstall
    ? monaco.editor.registerCommand(installCommandId, (_, target: string) => {
        const item = missingImports().find((item) => item.target === target);
        if (item) dependencies.onInstall?.(target, item.source);
      })
    : null;
  const openCommand = dependencies?.onOpenImport
    ? monaco.editor.registerCommand(openCommandId, (_, id: string) => {
        if (resolvedImports().some((item) => item.file.id === id))
          dependencies.onOpenImport?.(id);
      })
    : null;
  const definition: Provider = {
    onDidChange: changed.event,
    provideCodeLenses(model) {
      return {
        lenses:
          model === editor.getModel()
            ? [
                ...selectors.map((item) => ({
                  range: new monaco.Range(
                    item.line,
                    item.column,
                    item.line,
                    item.column
                  ),
                  command: {
                    id: commandId,
                    title:
                      item.selector === copied
                        ? "$(check)\u00a0 Copied selector"
                        : `$(copy)\u00a0 selector ${item.selector}`,
                    tooltip: `${item.signature} — Copy selector`,
                    arguments: [item.selector],
                  },
                })),
                ...resolvedImports().map((item) => ({
                  range: new monaco.Range(
                    item.line,
                    item.column,
                    item.line,
                    item.column
                  ),
                  command: {
                    id: openCommandId,
                    title: "$(go-to-file)\u00a0 Open file",
                    tooltip: item.file.name,
                    arguments: [item.file.id],
                  },
                })),
                ...missingImports().map((item) => ({
                  range: new monaco.Range(
                    item.line,
                    item.column,
                    item.line,
                    item.column
                  ),
                  command: {
                    id: installCommandId,
                    title: `$(package)\u00a0 Install dependency: ${item.name}`,
                    tooltip: "Choose a pinned version to install",
                    arguments: [item.target],
                  },
                })),
              ]
            : [],
        dispose() {},
      };
    },
  };
  const provider = monaco.languages.registerCodeLensProvider("sol", definition);
  const listeners = [
    editor.onDidChangeModel(refresh),
    editor.onDidChangeModelContent(refresh),
    editor.onDidChangeModelLanguage(refresh),
  ];
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ++sequence;
    clearTimeout(timer);
    clearTimeout(feedbackTimer);
    stopWorker();
    listeners.forEach((listener) => listener.dispose());
    provider.dispose();
    command.dispose();
    installCommand?.dispose();
    openCommand?.dispose();
    changed.dispose();
    disposal.dispose();
  };
  const disposal = editor.onDidDispose(dispose);
  refresh();
  return {
    dispose,
    refreshContext: () => {
      if (!disposed) changed.fire(definition);
    },
  };
}
