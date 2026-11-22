import { VerificationError, type ImportedSource } from "./source";
export function record(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function unsupported(): never {
  throw new VerificationError("UNSUPPORTED_SOURCE");
}
const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const pathOk = (p: string) =>
  p.length > 0 && p.length <= 512 && !/[\x00-\x1f:]/.test(p);
export function normalizeInput(
  input: unknown,
  contractName: unknown,
  compiler: unknown,
  args: unknown,
  license: unknown,
  partial = false
): ImportedSource {
  if (
    !record(input) ||
    input.language !== "Solidity" ||
    !record(input.sources) ||
    !record(input.settings) ||
    typeof contractName !== "string" ||
    typeof compiler !== "string" ||
    !/^v?0\.\d{1,2}\.\d{1,3}\+commit\.[a-f0-9]{8}$/.test(compiler)
  )
    unsupported();
  const files = Object.keys(input.sources);
  if (
    !files.length ||
    files.length > 200 ||
    files.some(
      (p) =>
        !pathOk(p) ||
        !record(input.sources[p]) ||
        typeof input.sources[p].content !== "string" ||
        !input.sources[p].content
    )
  )
    unsupported();
  const split = contractName.lastIndexOf(":");
  if (
    split < 1 ||
    !identifier.test(contractName.slice(split + 1)) ||
    !Object.hasOwn(input.sources, contractName.slice(0, split))
  )
    unsupported();
  const settings = structuredClone(input.settings);
  if (settings.compilationTarget != null) {
    if (
      !record(settings.compilationTarget) ||
      Object.keys(settings.compilationTarget).length !== 1 ||
      settings.compilationTarget[contractName.slice(0, split)] !==
        contractName.slice(split + 1)
    )
      unsupported();
    delete settings.compilationTarget;
  }
  if (
    settings.optimizer != null &&
    (!record(settings.optimizer) ||
      typeof settings.optimizer.enabled !== "boolean")
  )
    unsupported();
  // Source URLs/import callbacks are never resolved. Preserve all inline source
  // contents, compiler settings and top-level compiler inputs without flattening.
  const sourceCode = JSON.stringify({ ...input, settings });
  if (new TextEncoder().encode(sourceCode).byteLength > 1_000_000)
    unsupported();
  if (
    typeof args !== "string" ||
    !/^(?:0x)?(?:[a-fA-F0-9]{2})*$/.test(args) ||
    args.length > 131074
  )
    unsupported();
  if (!/^([1-9]|1[0-4])$/.test(String(license))) unsupported();
  return {
    sourceCode,
    contractName,
    compilerVersion: compiler.startsWith("v") ? compiler : `v${compiler}`,
    constructorArguments: args.replace(/^0x/, ""),
    licenseType: String(license),
    files,
    partial,
  };
}
/** Etherscan also returns standard JSON inside a second pair of braces. */
export function importEtherscanSource(raw: unknown): ImportedSource {
  if (
    !record(raw) ||
    !Array.isArray(raw.result) ||
    raw.status !== "1" ||
    !record(raw.result[0])
  )
    unsupported();
  const row = raw.result[0];
  if (
    typeof row.SourceCode !== "string" ||
    !row.SourceCode.trim() ||
    typeof row.ContractName !== "string"
  )
    unsupported();
  let code = row.SourceCode.trim();
  if (code.startsWith("{{") && code.endsWith("}}")) code = code.slice(1, -1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(code);
  } catch {
    /* A single source file. */
  }
  let input: Record<string, any>;
  let path: string | undefined;
  const name = row.ContractName.includes(":")
    ? row.ContractName.slice(row.ContractName.lastIndexOf(":") + 1)
    : row.ContractName;
  if (!identifier.test(name)) unsupported();
  if (record(parsed) && record(parsed.sources)) {
    input = parsed;
    if (!record(input.settings)) unsupported();
  } else {
    const settings: Record<string, any> = {};
    if (
      !["0", "1"].includes(String(row.OptimizationUsed)) ||
      !/^\d+$/.test(String(row.Runs))
    )
      unsupported();
    settings.optimizer = {
      enabled: String(row.OptimizationUsed) === "1",
      runs: Number(row.Runs),
    };
    if (
      row.EVMVersion &&
      row.EVMVersion !== "Default" &&
      row.EVMVersion !== "default"
    )
      settings.evmVersion = row.EVMVersion;
    if (row.Library) {
      // A flat library name is insufficient to reconstruct path-qualified links.
      unsupported();
    }
    if (record(parsed))
      input = { language: "Solidity", sources: parsed, settings };
    else {
      path = row.ContractFileName || `${name}.sol`;
      input = {
        language: "Solidity",
        sources: { [path!]: { content: row.SourceCode } },
        settings,
      };
    }
  }
  const target = input.settings?.compilationTarget;
  if (record(target) && Object.keys(target).length === 1)
    path = Object.keys(target)[0];
  if (!path && row.ContractName.includes(":"))
    path = row.ContractName.slice(0, row.ContractName.lastIndexOf(":"));
  if (!path && typeof row.ContractFileName === "string" && row.ContractFileName)
    path = row.ContractFileName;
  if (!path) {
    const matches = Object.entries(input.sources).filter(
      ([, v]) =>
        record(v) &&
        typeof v.content === "string" &&
        new RegExp(`\\b(?:contract|library|interface)\\s+${name}\\b`).test(
          v.content
        )
    );
    if (matches.length !== 1) unsupported();
    path = matches[0][0];
  }
  const licenseNames = [
    "None",
    "Unlicense",
    "MIT",
    "GNU GPLv2",
    "GNU GPLv3",
    "GNU LGPLv2.1",
    "GNU LGPLv3",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "MPL-2.0",
    "OSL-3.0",
    "Apache-2.0",
    "GNU AGPLv3",
    "BSL 1.1",
  ];
  const license =
    row.LicenseType == null || row.LicenseType === ""
      ? "1"
      : /^\d+$/.test(String(row.LicenseType))
        ? String(row.LicenseType)
        : String(
            licenseNames.findIndex(
              (l) => l.toLowerCase() === String(row.LicenseType).toLowerCase()
            ) + 1
          );
  const imported = normalizeInput(
    input,
    `${path}:${name}`,
    row.CompilerVersion,
    row.ConstructorArguments ?? "",
    license
  );
  return {
    ...imported,
    ...(typeof row.Implementation === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(row.Implementation)
      ? { implementationAddress: row.Implementation }
      : {}),
  };
}
export function importSourcifySource(raw: unknown): ImportedSource {
  if (
    !record(raw) ||
    !["match", "exact_match"].includes(raw.match) ||
    !record(raw.compilation) ||
    !record(raw.sources)
  )
    unsupported();
  const c = raw.compilation;
  if (c.compiler && c.compiler !== "solc") unsupported();
  const settings = structuredClone(c.compilerSettings);
  // Sourcify's standard input has compiler-output placeholders for libraries.
  // Rehydrate deployment-specific addresses from verified transformations.
  const links =
    raw.runtimeBytecode?.transformationValues?.libraries ??
    raw.creationBytecode?.transformationValues?.libraries;
  if (record(links)) {
    if (!record(settings)) unsupported();
    settings.libraries ??= {};
    for (const [qualified, address] of Object.entries(links)) {
      const i = qualified.lastIndexOf(":");
      if (
        i < 1 ||
        typeof address !== "string" ||
        !/^0x[a-fA-F0-9]{40}$/.test(address)
      )
        unsupported();
      const path = qualified.slice(0, i);
      if (!Object.hasOwn(settings.libraries, path))
        Object.defineProperty(settings.libraries, path, {
          value: Object.create(null),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      if (!record(settings.libraries[path])) unsupported();
      Object.defineProperty(settings.libraries[path], qualified.slice(i + 1), {
        value: address,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  const spdx =
    raw.metadata?.output?.devdoc?.license ??
    raw.metadata?.sources?.[c.fullyQualifiedName?.split(":")[0]]?.license;
  const licenses = [
    "",
    "Unlicense",
    "MIT",
    "GPL-2.0",
    "GPL-3.0",
    "LGPL-2.1",
    "LGPL-3.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "MPL-2.0",
    "OSL-3.0",
    "Apache-2.0",
    "AGPL-3.0",
    "BUSL-1.1",
  ];
  const license =
    typeof spdx === "string"
      ? licenses.indexOf(spdx.replace(/-(only|or-later)$/, ""))
      : 0;
  const imported = normalizeInput(
    { language: c.language, sources: raw.sources, settings },
    c.fullyQualifiedName,
    c.compilerVersion,
    raw.creationBytecode?.transformationValues?.constructorArguments ?? "",
    String(Math.max(0, license) + 1),
    raw.match !== "exact_match"
  );
  const implementations = raw.proxyResolution?.implementations;
  return {
    ...imported,
    ...(Array.isArray(implementations) &&
    implementations.length === 1 &&
    typeof implementations[0]?.address === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(implementations[0].address)
      ? { implementationAddress: implementations[0].address }
      : {}),
  };
}
