import { normalizeInput } from "@/lib/verification/normalize";
import type { ImportedSource } from "@/lib/verification/source";
import type { DeploymentBuild, DeploymentRecord } from "./deployments";
const licenses: Record<string, string> = {
  UNLICENSED: "1",
  Unlicense: "2",
  MIT: "3",
  "GPL-2.0": "4",
  "GPL-2.0-only": "4",
  "GPL-3.0": "5",
  "GPL-3.0-only": "5",
  "LGPL-2.1": "6",
  "LGPL-2.1-only": "6",
  "LGPL-3.0": "7",
  "LGPL-3.0-only": "7",
  "BSD-2-Clause": "8",
  "BSD-3-Clause": "9",
  "MPL-2.0": "10",
  "OSL-3.0": "11",
  "Apache-2.0": "12",
  "AGPL-3.0": "13",
  "AGPL-3.0-only": "13",
  "BUSL-1.1": "14",
};
export function deploymentVerificationSource(
  build: DeploymentBuild,
  record: DeploymentRecord
): ImportedSource {
  if (
    build.id !== record.buildId ||
    build.workspaceId !== record.workspaceId ||
    build.contract.name !== record.contractName ||
    build.contract.sourcePath !== record.sourcePath ||
    !record.hash ||
    !record.address ||
    record.status !== "success"
  )
    throw new Error("Wait for deployment confirmation before verifying.");
  const content = build.input.sources[record.sourcePath]?.content ?? "";
  const spdx = content
    .match(/SPDX-License-Identifier:\s*([^\r\n*]+)/)?.[1]
    .trim();
  const source = normalizeInput(
    build.input,
    `${record.sourcePath}:${record.contractName}`,
    build.settings.version.replace(/^soljson-/, "").replace(/\.js$/, ""),
    record.constructorArgs,
    spdx ? (licenses[spdx] ?? "1") : "1"
  );
  return { ...source, creationTransactionHash: record.hash };
}
export const verificationIdentity = (
  source: ImportedSource,
  bytecode: string
) =>
  JSON.stringify([
    source.contractName,
    source.compilerVersion,
    source.sourceCode,
    source.constructorArguments,
    source.licenseType,
    bytecode.toLowerCase(),
  ]);
