import type { OnMount } from "@monaco-editor/react";
type Editor = Parameters<OnMount>[0];
const active = new WeakMap<Editor, () => void>();

/** Hold a whole-line navigation cue for half a second, then fade over 400 ms. */
export function flashSourceLine(editor: Editor, line: number) {
  active.get(editor)?.();
  const model = editor.getModel();
  if (!model) return;
  const lineNumber = Math.max(1, Math.min(line, model.getLineCount()));
  if (!document.getElementById("ethsh-source-navigation-style")) {
    const style = document.createElement("style");
    style.id = "ethsh-source-navigation-style";
    style.textContent = `
      @keyframes ethsh-source-line-flash {
        0%, 55.56% { background-color: rgba(96, 165, 250, .22); }
        100% { background-color: transparent; }
      }
      .monaco-editor .ethsh-source-line-flash {
        background-color: rgba(96, 165, 250, .22);
        animation: ethsh-source-line-flash 0.9s ease-out forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .monaco-editor .ethsh-source-line-flash { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }
  const decoration = editor.createDecorationsCollection([
    {
      range: {
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: 1,
      },
      options: { isWholeLine: true, className: "ethsh-source-line-flash" },
    },
  ]);
  const clear = () => {
    clearTimeout(timer);
    decoration.clear();
    modelChange.dispose();
    disposal.dispose();
    active.delete(editor);
  };
  const timer = setTimeout(clear, 900);
  const modelChange = editor.onDidChangeModel(clear);
  const disposal = editor.onDidDispose(clear);
  active.set(editor, clear);
}
