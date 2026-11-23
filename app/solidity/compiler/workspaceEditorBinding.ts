import type { OnMount } from "@monaco-editor/react";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import { lockedPath } from "@/lib/solidity/dependencies";

type Editor = Parameters<OnMount>[0];
export type WorkspaceEditorContext = {
  workspace: SolidityWorkspace | null;
  workspaceId?: string;
  blocked: boolean;
};
export const workspaceModelPath = (id: string) =>
  `ethsh-solidity://workspace/${id}`;

/** Attribute edits to the emitting model, never a previous render's active tab. */
export function bindWorkspaceEditor(
  editor: Editor,
  context: () => WorkspaceEditorContext,
  write: (workspaceId: string, fileId: string, content: string) => void
) {
  let applying = false;
  let disposed = false;
  const currentFile = () => {
    const state = context();
    const model = editor.getModel();
    const file = state.workspace?.files.find(
      (item) => model?.uri.toString() === workspaceModelPath(item.id)
    );
    return { ...state, model, file };
  };
  const subscription = editor.onDidChangeModelContent((event) => {
    if (disposed || applying || event.isFlush) return;
    const { workspace, workspaceId, blocked, model, file } = currentFile();
    if (
      !workspace ||
      !workspaceId ||
      blocked ||
      !model ||
      !file ||
      workspace.activeFileId !== file.id ||
      lockedPath(workspace, file.name)
    )
      return;
    const content = model.getValue();
    if (content !== file.content) write(workspaceId, file.id, content);
  });
  return {
    sync() {
      if (disposed) return;
      const { model, file, workspace } = currentFile();
      if (
        !model ||
        !file ||
        workspace?.activeFileId !== file.id ||
        model.getValue() === file.content
      )
        return;
      applying = true;
      try {
        model.setValue(file.content);
      } finally {
        applying = false;
      }
    },
    dispose() {
      disposed = true;
      subscription.dispose();
    },
  };
}

export function updateEditorFile(
  workspace: SolidityWorkspace,
  fileId: string,
  content: string
): SolidityWorkspace {
  const file = workspace.files.find((item) => item.id === fileId);
  if (
    !file ||
    workspace.activeFileId !== fileId ||
    lockedPath(workspace, file.name) ||
    content === file.content
  )
    return workspace;
  return {
    ...workspace,
    files: workspace.files.map((item) =>
      item.id === fileId ? { ...item, content } : item
    ),
  };
}
