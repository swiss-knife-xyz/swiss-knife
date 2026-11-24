import { validatePath } from "./paths";
import { assertPaths } from "./paths";
import { BACKUP_LIMITS, type WorkspaceBackup } from "./backup";
import {
  DEFAULT_COMPILER_SETTINGS,
  standardJsonInput,
  type CompilerSettings,
} from "./settings";

export const STANDARD_JSON_LIMIT = 20 * 1024 * 1024;
const object = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function importStandardJson(
  text: string,
  current: CompilerSettings = DEFAULT_COMPILER_SETTINGS
): WorkspaceBackup {
  if (new TextEncoder().encode(text).byteLength > STANDARD_JSON_LIMIT)
    throw new Error("Choose a JSON file smaller than 20 MB.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  if (!object(input) || input.language !== "Solidity" || !object(input.sources))
    throw new Error(
      "Choose a Solidity Standard JSON input, with language and sources fields."
    );
  for (const key of Object.keys(input))
    if (!["language", "sources", "settings"].includes(key))
      throw new Error(`Unsupported input field: ${key}.`);
  const entries = Object.entries(input.sources);
  if (!entries.length || entries.length > BACKUP_LIMITS.files)
    throw new Error("Import between 1 and 500 Solidity files.");
  let total = 0;
  const files = entries.map(([name, source]) => {
    if (
      !object(source) ||
      typeof source.content !== "string" ||
      Object.keys(source).some((key) => !["content"].includes(key))
    )
      throw new Error(
        `Include inline source content for ${name}; URL and hash-only sources aren't supported.`
      );
    const bytes = new TextEncoder().encode(source.content).byteLength;
    total += bytes;
    if (bytes > BACKUP_LIMITS.fileBytes || total > BACKUP_LIMITS.totalBytes)
      throw new Error(
        "Sources exceed the size limit (5 MB per file, 50 MB total)."
      );
    return { name, content: source.content };
  });
  assertPaths(files);
  const raw = input.settings === undefined ? {} : input.settings;
  if (!object(raw)) throw new Error("Compiler settings must be an object.");
  const allowed = [
    "optimizer",
    "evmVersion",
    "viaIR",
    "metadata",
    "libraries",
    "debug",
    "outputSelection",
    "remappings",
  ];
  for (const key of Object.keys(raw))
    if (!allowed.includes(key))
      throw new Error(`Unsupported compiler setting: ${key}.`);
  if (raw.remappings !== undefined) {
    if (!Array.isArray(raw.remappings))
      throw new Error("Import remappings must be a list.");
    for (const mapping of raw.remappings) {
      if (typeof mapping !== "string" || mapping.indexOf("=") <= 0)
        throw new Error("Invalid import remapping.");
      const [prefix, target, ...extra] = mapping.split("=");
      if (extra.length || !target.endsWith("/"))
        throw new Error("Remappings must target local workspace folders.");
      validatePath(target.slice(0, -1));
    }
  }
  if (raw.optimizer !== undefined && !object(raw.optimizer))
    throw new Error("Optimizer settings must be an object.");
  if (
    raw.optimizer &&
    Object.keys(raw.optimizer).some(
      (key) => !["enabled", "runs", "details"].includes(key)
    )
  )
    throw new Error("Unsupported optimizer settings.");
  for (const key of ["metadata", "libraries", "debug", "outputSelection"])
    if (raw[key] !== undefined && !object(raw[key]))
      throw new Error(`${key} must be an object.`);
  if (
    raw.optimizer?.enabled !== undefined &&
    typeof raw.optimizer.enabled !== "boolean"
  )
    throw new Error("Optimizer enabled must be a boolean.");
  if (
    raw.optimizer?.runs !== undefined &&
    (!Number.isInteger(raw.optimizer.runs) ||
      raw.optimizer.runs < 0 ||
      raw.optimizer.runs > 4294967295)
  )
    throw new Error("Invalid optimizer runs.");
  if (raw.evmVersion !== undefined && typeof raw.evmVersion !== "string")
    throw new Error("EVM target must be a string.");
  if (raw.viaIR !== undefined && typeof raw.viaIR !== "boolean")
    throw new Error("Via IR must be a boolean.");
  const extras = Object.fromEntries(
    ["metadata", "libraries", "debug", "outputSelection", "remappings"]
      .filter((key) => raw[key] !== undefined)
      .map((key) => [key, raw[key]])
  );
  if (raw.optimizer?.details !== undefined) {
    if (!object(raw.optimizer.details))
      throw new Error("Optimizer details must be an object.");
    extras.optimizerDetails = raw.optimizer.details;
  }
  // Standard JSON deliberately does not include the compiler version. Keep the
  // current version visible in the import preview so users can select another.
  const compilerSettings: CompilerSettings = {
    version: current.version,
    optimizer: raw.optimizer?.enabled ?? false,
    runs: raw.optimizer?.runs ?? 200,
    evmVersion: raw.evmVersion ?? "default",
    viaIR: raw.viaIR ?? false,
    ...(Object.keys(extras).length ? { extras } : {}),
  };
  // Validate scalar types before rendering the preview, leaving version-specific
  // compatibility checks until Apply (the preview can change compiler version).
  if (
    typeof compilerSettings.optimizer !== "boolean" ||
    typeof compilerSettings.viaIR !== "boolean" ||
    typeof compilerSettings.evmVersion !== "string" ||
    !Number.isInteger(compilerSettings.runs) ||
    compilerSettings.runs < 0 ||
    compilerSettings.runs > 4294967295
  )
    throw new Error("Invalid optimizer, EVM target or via IR settings.");
  standardJsonInput({}, compilerSettings);
  return {
    files,
    openFiles: [files[0].name],
    activeFile: files[0].name,
    compilerSettings,
  };
}
