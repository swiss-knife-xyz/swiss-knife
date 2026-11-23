import { normalizeCompilerSettings, type CompilerSettings } from "./settings";
import type { DependencyLock } from "./dependencies";
import { githubRemappings } from "./githubSources";
export function dependencyCompilerSettings(
  settings?: CompilerSettings,
  dependencies?: DependencyLock[]
): CompilerSettings {
  const normalized = normalizeCompilerSettings(settings);
  const remappings = [
    ...new Set([
      ...(normalized.extras?.remappings ?? []),
      ...githubRemappings(dependencies),
    ]),
  ];
  return remappings.length
    ? { ...normalized, extras: { ...normalized.extras, remappings } }
    : normalized;
}
