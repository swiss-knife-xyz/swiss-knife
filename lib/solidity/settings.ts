import { normalizeLibraryAddresses } from "./libraries";
export type CompilerSettings = {
  version: string;
  optimizer: boolean;
  runs: number;
  evmVersion: string;
  viaIR: boolean;
  extras?: Record<string, any>;
};
export const DEFAULT_COMPILER_SETTINGS: CompilerSettings = {
  version: "soljson-v0.8.30+commit.73712a01.js",
  optimizer: false,
  runs: 200,
  evmVersion: "default",
  viaIR: false,
};
export function compilerVersion(file: string) {
  return (
    file.match(/^soljson-v(\d+\.\d+\.\d+)\+commit\.[a-f0-9]{8}\.js$/)?.[1] ?? ""
  );
}
function atLeast(file: string, minor: number, patch: number) {
  const [major, m, p] = compilerVersion(file).split(".").map(Number);
  return major > 0 || m > minor || (m === minor && p >= patch);
}
export const supportsIR = (version: string) => atLeast(version, 8, 13);
const targets: [string, number, number][] = [
  ["homestead", 5, 0],
  ["tangerineWhistle", 5, 0],
  ["spuriousDragon", 5, 0],
  ["byzantium", 5, 0],
  ["constantinople", 5, 0],
  ["petersburg", 5, 5],
  ["istanbul", 5, 14],
  ["berlin", 8, 5],
  ["london", 8, 7],
  ["paris", 8, 18],
  ["shanghai", 8, 20],
  ["cancun", 8, 24],
  ["prague", 8, 30],
  ["osaka", 8, 31],
];
export function evmTargets(version: string) {
  return targets
    .filter(([, minor, patch]) => atLeast(version, minor, patch))
    .map(([name]) => name);
}
export function normalizeCompilerSettings(
  value?: Partial<CompilerSettings>
): CompilerSettings {
  const defaults = DEFAULT_COMPILER_SETTINGS;
  const version = value?.version ?? defaults.version;
  if (!compilerVersion(version) || !atLeast(version, 5, 0))
    throw new Error("Choose a stable Solidity compiler from 0.5.0 onward.");
  const runs = value?.runs ?? defaults.runs;
  if (!Number.isInteger(runs) || runs < 0 || runs > 4294967295)
    throw new Error(
      "Optimizer runs must be an integer from 0 to 4,294,967,295."
    );
  const evmVersion = value?.evmVersion ?? defaults.evmVersion;
  if (evmVersion !== "default" && !evmTargets(version).includes(evmVersion))
    throw new Error(
      "This EVM target isn't supported by the selected compiler."
    );
  if (value?.viaIR && !supportsIR(version))
    throw new Error("Via IR requires Solidity 0.8.13 or later.");
  if (value?.optimizer !== undefined && typeof value.optimizer !== "boolean")
    throw new Error("Invalid optimizer setting.");
  if (value?.viaIR !== undefined && typeof value.viaIR !== "boolean")
    throw new Error("Invalid via IR setting.");
  if (
    value?.extras !== undefined &&
    (!value.extras ||
      typeof value.extras !== "object" ||
      Array.isArray(value.extras))
  )
    throw new Error("Invalid additional compiler settings.");
  if (value?.extras) {
    if(value.extras.libraries !== undefined) normalizeLibraryAddresses(value.extras.libraries);
    const allowed = [
      "metadata",
      "libraries",
      "debug",
      "optimizerDetails",
      "outputSelection",
    ];
    for (const [key, item] of Object.entries(value.extras)) {
      if (key === "remappings") {
        if (
          !Array.isArray(item) ||
          item.some(
            (mapping) =>
              typeof mapping !== "string" ||
              !/^[^=\x00-\x1f]+=[^=\x00-\x1f]+\/$/.test(mapping) ||
              mapping
                .split("=")[1]
                .split("/")
                .some((part) => part === ".." || part === ".")
          )
        )
          throw new Error("Invalid import remappings.");
        continue;
      }
      if (
        !allowed.includes(key) ||
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      )
        throw new Error(`Invalid additional compiler setting: ${key}.`);
    }
    if (JSON.stringify(value.extras).length > 1_000_000)
      throw new Error("Additional compiler settings exceed 1 MB.");
    standardJsonInput({}, { ...defaults, extras: value.extras });
  }
  return {
    ...(value?.extras ? { extras: value.extras } : {}),
    version,
    runs,
    evmVersion,
    optimizer: value?.optimizer ?? defaults.optimizer,
    viaIR: value?.viaIR ?? defaults.viaIR,
  };
}
export function standardJsonInput(
  sources: Record<string, { content: string }>,
  settings: CompilerSettings
) {
  const { optimizerDetails, outputSelection, ...extra } = settings.extras ?? {};
  const required = ["abi", "evm.bytecode", "evm.deployedBytecode"];
  const selection: Record<string, Record<string, string[]>> = Object.create(
    null
  );
  if (outputSelection && typeof outputSelection === "object") {
    for (const [file, contracts] of Object.entries(outputSelection)) {
      if (
        !contracts ||
        typeof contracts !== "object" ||
        Array.isArray(contracts)
      )
        throw new Error("Invalid output selection.");
      selection[file] = Object.create(null);
      for (const [contract, fields] of Object.entries(contracts)) {
        if (
          !Array.isArray(fields) ||
          fields.some((field) => typeof field !== "string")
        )
          throw new Error("Invalid output selection.");
        selection[file][contract] =
          contract === "" ? fields : [...new Set([...fields, ...required])];
      }
    }
  }
  selection["*"] = {
    ...selection["*"],
    "*": [...new Set([...(selection["*"]?.["*"] ?? []), ...required])],
  };
  return {
    language: "Solidity",
    sources,
    settings: {
      ...extra,
      optimizer: {
        enabled: settings.optimizer,
        runs: settings.runs,
        ...(optimizerDetails ? { details: optimizerDetails } : {}),
      },
      ...(settings.evmVersion !== "default"
        ? { evmVersion: settings.evmVersion }
        : {}),
      ...(settings.viaIR ? { viaIR: true } : {}),
      outputSelection: selection,
    },
  };
}
