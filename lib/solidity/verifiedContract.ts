import type {
  ImportedSource,
  VerificationProvider,
} from "@/lib/verification/source";
import { importStandardJson } from "./standardJson";
import { normalizeCompilerSettings } from "./settings";
import { applyWorkspaceImport } from "./backup";

export type VerifiedContract = {
  source: ImportedSource;
  provider: VerificationProvider;
  chainId: number;
  address: string;
};

/** Reuse the bounded Standard JSON importer; never infer a version from pragma. */
export function verifiedContractBackup(source: ImportedSource) {
  const match = /^v?(\d+\.\d+\.\d+\+commit\.[a-f0-9]{8})$/.exec(
    source.compilerVersion
  );
  if (!match) throw new Error("The verified compiler version isn't supported.");
  const version = `soljson-v${match[1]}.js`;
  const imported = importStandardJson(source.sourceCode, {
    version,
    optimizer: false,
    runs: 200,
    evmVersion: "default",
    viaIR: false,
  });
  const split = source.contractName.lastIndexOf(":");
  const entry = source.contractName.slice(0, split);
  if (split < 1 || !imported.files.some((file) => file.name === entry))
    throw new Error("The verified entry file is missing.");
  return {
    ...imported,
    compilerSettings: normalizeCompilerSettings(imported.compilerSettings),
    activeFile: entry,
    openFiles: [entry],
  };
}
export function verifiedContractWorkspace(source: ImportedSource) {
  return applyWorkspaceImport(
    { files: [], folders: [], openFileIds: [], activeFileId: null },
    verifiedContractBackup(source),
    "restore"
  );
}
