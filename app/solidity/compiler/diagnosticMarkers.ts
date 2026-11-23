import type { Monaco } from "@monaco-editor/react";
import { inlineDiagnostics } from "@/lib/solidity/diagnostics";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import type { CompilerBuild } from "./useSolidityCompiler";
const OWNER = "ethsh-solc";
export function syncDiagnosticMarkers(
  monaco: Monaco,
  workspace: SolidityWorkspace | null,
  build: CompilerBuild | null
) {
  const files = new Map(workspace?.files.map((file) => [file.id, file]));
  const diagnostics = [
    ...(build?.result.diagnostics ?? []),
    ...(build?.result.warnings ?? []),
  ];
  for (const model of monaco.editor.getModels()) {
    if (model.uri.scheme !== "ethsh-solidity") continue;
    const file = files.get(model.uri.path.slice(1));
    const compiled = file && build?.input.sources[file.name]?.content;
    const markers =
      file && compiled === file.content && model.getValue() === compiled
        ? inlineDiagnostics(compiled, file.name, diagnostics).map((item) => {
            const range = model.validateRange(item);
            return {
              ...item,
              ...range,
              severity:
                item.severity === "error"
                  ? monaco.MarkerSeverity.Error
                  : monaco.MarkerSeverity.Warning,
            };
          })
        : [];
    monaco.editor.setModelMarkers(model, OWNER, markers);
  }
}
