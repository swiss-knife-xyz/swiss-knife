import { getAddress, isAddress, zeroAddress } from "viem";
import type { SolidityWorkspace } from "./workspace";
import type { CompilerSettings } from "./settings";
import type { CompiledContract } from "@/app/solidity/compiler/types";
import type { CompilerBuild } from "@/app/solidity/compiler/useSolidityCompiler";
import type { DeploymentBuild, DeploymentRecord } from "./deployments";

export type LibraryReference = { sourcePath: string; name: string };
export type LibraryAddresses = Record<string, Record<string, string>>;
export type LibraryLinks = Record<string, LibraryAddresses>;
export const libraryKey = (ref: LibraryReference) =>
  JSON.stringify([ref.sourcePath, ref.name]);
export function libraryAddress(value: unknown): string | null {
  return typeof value === "string" &&
    isAddress(value, { strict: false }) &&
    value.toLowerCase() !== zeroAddress
    ? getAddress(value)
    : null;
}
export function normalizeLibraryAddresses(
  value: unknown,
  drafts = false
): LibraryAddresses {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid library addresses.");
  const result: LibraryAddresses = Object.create(null);
  let count = 0;
  for (const [path, entries] of Object.entries(value)) {
    if (
      !path ||
      path.length > 1024 ||
      /[\x00-\x1f]/.test(path) ||
      !entries ||
      typeof entries !== "object" ||
      Array.isArray(entries)
    )
      throw new Error("Invalid library source path.");
    result[path] = Object.create(null);
    for (const [name, address] of Object.entries(entries)) {
      if (
        ++count > 500 ||
        !/^[A-Za-z_$][\w$]*$/.test(name) ||
        typeof address !== "string" ||
        address.length > 512 ||
        (!drafts && !isAddress(address, { strict: false }))
      )
        throw new Error("Invalid library address.");
      result[path][name] = drafts ? address : getAddress(address);
    }
  }
  return result;
}
export function normalizeLibraryLinks(value: unknown): LibraryLinks {
  if (value === undefined) return {};
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length > 200
  )
    throw new Error("Invalid network library mappings.");
  const result: LibraryLinks = Object.create(null);
  for (const [chainId, addresses] of Object.entries(value)) {
    if (!/^[1-9]\d*$/.test(chainId) || !Number.isSafeInteger(Number(chainId)))
      throw new Error("Invalid library network.");
    result[chainId] = normalizeLibraryAddresses(addresses, true);
  }
  if (JSON.stringify(result).length > 1_000_000)
    throw new Error("Library mappings exceed 1 MB.");
  return result;
}
export function deploymentChain(value: unknown): number {
  if (value === undefined) return 11155111;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new Error("Invalid deployment network.");
  return value;
}
export function libraryDrafts(
  workspace: SolidityWorkspace | null,
  chainId: number
): LibraryAddresses {
  const links = workspace?.libraryLinks;
  if (links && Object.hasOwn(links, String(chainId)))
    return links[String(chainId)];
  // A verified import identifies the original chain. Unscoped Standard JSON
  // addresses require an explicit "Use imported addresses" action in the UI.
  return workspace?.importedContract?.chainId === chainId
    ? (workspace.compilerSettings?.extras?.libraries ?? {})
    : {};
}
export function linkedCompilerSettings(
  settings: CompilerSettings,
  workspace: SolidityWorkspace | null,
  chainId: number
): CompilerSettings {
  const libraries: LibraryAddresses = Object.create(null);
  const drafts = libraryDrafts(workspace, chainId);
  for (const path of Object.keys(drafts).sort())
    for (const name of Object.keys(drafts[path]).sort()) {
      const address = libraryAddress(drafts[path][name]);
      if (address) {
        libraries[path] ??= Object.create(null);
        libraries[path][name] = address;
      }
    }
  const { libraries: _unscoped, ...extras } = settings.extras ?? {};
  return {
    ...settings,
    ...(Object.keys(extras).length || Object.keys(libraries).length
      ? {
          extras: {
            ...extras,
            ...(Object.keys(libraries).length ? { libraries } : {}),
          },
        }
      : { extras: undefined }),
  };
}
export function updateLibraryAddress(
  workspace: SolidityWorkspace,
  chainId: number,
  ref: LibraryReference,
  value: string
): SolidityWorkspace {
  const drafts = libraryDrafts(workspace, chainId);
  return {
    ...workspace,
    libraryLinks: {
      ...workspace.libraryLinks,
      [chainId]: {
        ...drafts,
        [ref.sourcePath]: { ...drafts[ref.sourcePath], [ref.name]: value },
      },
    },
  };
}
export function referencesFromSolc(
  ...links: (Record<string, Record<string, unknown>> | undefined)[]
): LibraryReference[] {
  const refs = new Map<string, LibraryReference>();
  for (const group of links)
    for (const [sourcePath, names] of Object.entries(group ?? {}))
      for (const name of Object.keys(names)) {
        const ref = { sourcePath, name };
        refs.set(libraryKey(ref), ref);
      }
  return [...refs.values()].sort((a, b) =>
    libraryKey(a).localeCompare(libraryKey(b))
  );
}
export function unresolvedLibraries(contract: CompiledContract): boolean {
  return (
    !!contract.bytecode && !/^(?:[a-fA-F0-9]{2})+$/.test(contract.bytecode)
  );
}
function settingsIdentity(settings: CompilerSettings) {
  const { libraries, ...extras } = settings.extras ?? {};
  return JSON.stringify({
    ...settings,
    extras: Object.keys(extras).length ? extras : undefined,
  });
}
export function reusableLibrary(
  record: DeploymentRecord,
  saved: DeploymentBuild,
  current: CompilerBuild,
  ref: LibraryReference,
  chainId: number
) {
  return (
    !record.deletedAt &&
    record.status === "success" &&
    !!libraryAddress(record.address) &&
    record.chainId === chainId &&
    record.sourcePath === ref.sourcePath &&
    record.contractName === ref.name &&
    saved.contract.sourcePath === ref.sourcePath &&
    saved.contract.name === ref.name &&
    !!saved.input.sources[ref.sourcePath] &&
    settingsIdentity(saved.settings) ===
      settingsIdentity(current.input.settings) &&
    Object.entries(saved.input.sources).every(
      ([path, source]) =>
        current.input.sources[path]?.content === source.content
    ) &&
    Object.entries(saved.settings.extras?.libraries ?? {}).every(
      ([path, names]) =>
        Object.entries(names as Record<string, string>).every(
          ([name, address]) =>
            current.input.settings.extras?.libraries?.[path]?.[
              name
            ]?.toLowerCase() === address.toLowerCase()
        )
    )
  );
}

/** Preserve constructor inputs across address-only relinking and network switches. */
export function deploymentFormKey(build: CompilerBuild | null, name: string) {
  return build
    ? JSON.stringify([
        build.input.workspaceId,
        build.input.entryId,
        name,
        settingsIdentity(build.input.settings),
        build.input.sources,
      ])
    : name;
}
