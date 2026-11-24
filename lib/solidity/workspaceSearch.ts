import { searchExpression } from "@/components/SourceCodeExplorer/search";
import type { SearchOptions } from "@/components/SourceCodeExplorer/types";
import { lockedPath } from "./dependencies";
import type { SolidityWorkspace } from "./workspace";

export type ReplacementPlan = {
  files: {
    id: string;
    path: string;
    before: string;
    after: string;
    count: number;
    preview: { line: number; before: string; after: string }[];
  }[];
  count: number;
};

/** Build an exact preview from current sources; rendering limits never limit replacement. */
export function planReplacements(
  workspace: SolidityWorkspace,
  query: string,
  replacement: string,
  options: SearchOptions,
  path?: string
): ReplacementPlan {
  const plan: ReplacementPlan = { files: [], count: 0 };
  if (!query) return plan;
  const expression = searchExpression(query, options);
  for (const file of workspace.files) {
    if ((path && file.name !== path) || lockedPath(workspace, file.name))
      continue;
    let count = 0;
    const preview: ReplacementPlan["files"][number]["preview"] = [];
    const after = file.content
      .split("\n")
      .map((line, index) => {
        expression.lastIndex = 0;
        const matches = Array.from(line.matchAll(expression));
        count += matches.length;
        expression.lastIndex = 0;
        // Literal mode preserves dollar signs; regex mode supports capture substitutions.
        const next = options.regex
          ? line.replace(expression, replacement)
          : line.replace(expression, () => replacement);
        if (next !== line && preview.length < 100)
          preview.push({ line: index + 1, before: line, after: next });
        return next;
      })
      .join("\n");
    if (after === file.content) continue;
    if (after.length > 5 * 1024 * 1024)
      throw new Error("Replacement would exceed the 5 MB file limit.");
    plan.files.push({
      id: file.id,
      path: file.name,
      before: file.content,
      after,
      count,
      preview,
    });
    plan.count += count;
  }
  return plan;
}

export function canApplyReplacements(
  workspace: SolidityWorkspace,
  plan: ReplacementPlan,
  undo = false
) {
  return plan.files.every((edit) =>
    workspace.files.some(
      (file) =>
        file.id === edit.id &&
        file.name === edit.path &&
        file.content === (undo ? edit.after : edit.before) &&
        !lockedPath(workspace, file.name)
    )
  );
}

/** All-or-nothing; never overwrite edits made after the preview (or after Replace on Undo). */
export function applyReplacements(
  workspace: SolidityWorkspace,
  plan: ReplacementPlan,
  undo = false
): SolidityWorkspace {
  if (!canApplyReplacements(workspace, plan, undo)) return workspace;
  const edits = new Map(
    plan.files.map((edit) => [edit.id, undo ? edit.before : edit.after])
  );
  return {
    ...workspace,
    files: workspace.files.map((file) =>
      edits.has(file.id) ? { ...file, content: edits.get(file.id)! } : file
    ),
  };
}
