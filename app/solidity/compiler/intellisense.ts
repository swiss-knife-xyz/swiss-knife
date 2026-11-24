import { dependencyCompilerSettings } from "@/lib/solidity/dependencySettings";
import type { Monaco } from "@monaco-editor/react";
import type {
  LanguageQuery,
  LanguageReply,
} from "@/lib/solidity/language-service";
import type { LanguageItem } from "@/lib/solidity/language-catalog";
import type { SolidityWorkspace, SolidityFile } from "@/lib/solidity/workspace";

type Provider = Parameters<
  Monaco["languages"]["registerCompletionItemProvider"]
>[1];
type Model = Parameters<Provider["provideCompletionItems"]>[0];
type Position = Parameters<Provider["provideCompletionItems"]>[1];
export function sourcePosition(content: string, offset: number) {
  const lines = content.slice(0, offset).split("\n");
  return { lineNumber: lines.length, column: lines.at(-1)!.length + 1 };
}
export function registerSolidityIntellisense(
  monaco: Monaco,
  getWorkspace: () => SolidityWorkspace | null,
  openSource: (
    id: string,
    position: { lineNumber: number; column: number }
  ) => void
) {
  let worker: Worker | null = null;
  let sequence = 0;
  let synced = new Map<string, SolidityFile>();
  const pending = new Map<
    number,
    {
      resolve: (result: LanguageReply) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const stop = () => {
    worker?.terminate();
    worker = null;
    synced.clear();
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.resolve({ items: [] });
    }
    pending.clear();
  };
  const request = async (
    model: Model,
    position: Position,
    kind: LanguageQuery["kind"]
  ): Promise<LanguageReply> => {
    const workspace = getWorkspace();
    const file = workspace?.files.find(
      (file) =>
        model.uri.scheme === "ethsh-solidity" &&
        model.uri.path === `/${file.id}`
    );
    if (!file || !workspace || model.isDisposed()) return { items: [] };
    if (!worker) {
      try {
        worker = new Worker(new URL("./language.worker.ts", import.meta.url), {
          type: "module",
        });
        worker.onmessage = ({
          data,
        }: MessageEvent<{ id: number; result: LanguageReply }>) => {
          const item = pending.get(data.id);
          if (!item) return;
          clearTimeout(item.timer);
          pending.delete(data.id);
          item.resolve(data.result);
        };
        worker.onerror = stop;
      } catch {
        return { items: [] };
      }
    }
    const changed = workspace.files.filter(
      (file) =>
        synced.get(file.name)?.id !== file.id ||
        synced.get(file.name)?.content !== file.content
    );
    const names = new Set(workspace.files.map((file) => file.name));
    const removed = [...synced.keys()].filter((name) => !names.has(name));
    synced = new Map(workspace.files.map((file) => [file.name, file]));
    const id = ++sequence;
    const version = model.getVersionId();
    const reply = await new Promise<LanguageReply>((resolve) => {
      const timer = setTimeout(() => {
        stop();
        resolve({ items: [] });
      }, 15000);
      pending.set(id, { resolve, timer });
      worker!.postMessage({
        id,
        changed,
        removed,
        remappings: dependencyCompilerSettings(
          workspace.compilerSettings,
          workspace.dependencies
        ).extras?.remappings,
        query: {
          kind,
          path: file.name,
          content: model.getValue(),
          offset: model.getOffsetAt(position),
        },
      });
    });
    return model.isDisposed() ||
      model.getVersionId() !== version ||
      !getWorkspace()?.files.some((current) => current.id === file.id)
      ? { items: [] }
      : reply;
  };
  const selector = { language: "sol", scheme: "ethsh-solidity" };
  const docs = (item: LanguageItem) => ({
    value: `\`\`\`solidity\n${item.detail}\n\`\`\`${item.documentation ? `\n\n${item.documentation}` : ""}`,
    isTrusted: false,
  });
  const snippet = (item: LanguageItem) =>
    item.insertText ??
    (item.parameters
      ? `${item.name}(${item.parameters.map((param, index) => `\${${index + 1}:${param.match(/[A-Za-z_$][\w$]*$/)?.[0] ?? "value"}}`).join(", ")})`
      : item.name);
  const registrations = [
    monaco.languages.registerCompletionItemProvider(selector, {
      triggerCharacters: [".", '"', "'", "/"],
      async provideCompletionItems(model, position, context, cancellation) {
        const reply = await request(model, position, "completion");
        if (
          cancellation.isCancellationRequested ||
          (['"', "'"].includes(context.triggerCharacter ?? "") &&
            !reply.importRange)
        )
          return { suggestions: [] };
        const word = model.getWordUntilPosition(position);
        const range = reply.importRange
          ? (() => {
              const start = model.getPositionAt(reply.importRange[0]);
              return new monaco.Range(
                start.lineNumber,
                start.column,
                position.lineNumber,
                position.column
              );
            })()
          : new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            );
        const next = model
          .getLineContent(position.lineNumber)
          .slice(position.column - 1);
        return {
          suggestions: reply.items.map((item) => ({
            label: item.name,
            detail: item.detail,
            documentation: docs(item),
            kind: monaco.languages.CompletionItemKind[item.kind],
            insertText:
              item.parameters && /^\s*\(/.test(next)
                ? item.name
                : snippet(item),
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `${item.fileId ? "0" : item.kind === "Snippet" ? "2" : "1"}-${item.name}`,
          })),
        };
      },
    }),
    monaco.languages.registerHoverProvider(selector, {
      async provideHover(model, position, cancellation) {
        const reply = await request(model, position, "hover");
        if (cancellation.isCancellationRequested || !reply.items.length) return;
        const word = model.getWordAtPosition(position);
        return {
          range: word
            ? new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              )
            : undefined,
          contents: reply.items.slice(0, 8).map(docs),
        };
      },
    }),
    monaco.languages.registerSignatureHelpProvider(selector, {
      signatureHelpTriggerCharacters: ["(", ","],
      signatureHelpRetriggerCharacters: [")"],
      async provideSignatureHelp(model, position, cancellation) {
        const reply = await request(model, position, "signature");
        if (cancellation.isCancellationRequested || !reply.items.length) return;
        const signatures = reply.items.map((item) => ({
          label: item.detail,
          documentation: item.documentation,
          parameters: (item.parameters ?? []).map((label) => ({ label })),
        }));
        return {
          value: {
            signatures,
            activeSignature: Math.max(
              0,
              signatures.findIndex(
                (item) => item.parameters.length > (reply.activeParameter ?? 0)
              )
            ),
            activeParameter: reply.activeParameter ?? 0,
          },
          dispose() {},
        };
      },
    }),
    monaco.languages.registerDefinitionProvider(selector, {
      async provideDefinition(model, position, cancellation) {
        const reply = await request(model, position, "definition");
        if (cancellation.isCancellationRequested) return [];
        return reply.items.flatMap((item) => {
          const file = getWorkspace()?.files.find(
            (file) => file.id === item.fileId
          );
          if (!file || item.offset === undefined) return [];
          const point = sourcePosition(file.content, item.offset);
          return [
            {
              uri: monaco.Uri.parse(`ethsh-solidity://workspace/${file.id}`),
              range: new monaco.Range(
                point.lineNumber,
                point.column,
                point.lineNumber,
                point.column
              ),
            },
          ];
        });
      },
    }),
    monaco.editor.registerEditorOpener({
      openCodeEditor(_source, resource, selection) {
        if (resource.scheme !== "ethsh-solidity") return false;
        const file = getWorkspace()?.files.find(
          (file) => resource.path === `/${file.id}`
        );
        if (!file) return false;
        const point =
          selection && "startLineNumber" in selection
            ? {
                lineNumber: selection.startLineNumber,
                column: selection.startColumn,
              }
            : (selection ?? { lineNumber: 1, column: 1 });
        openSource(file.id, point);
        return true;
      },
    }),
  ];
  return {
    dispose() {
      stop();
      for (const registration of registrations) registration.dispose();
    },
  };
}
