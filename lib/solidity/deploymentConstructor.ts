import { AbiCoder, ParamType, type JsonFragmentType } from "ethers";
import type { AbiParameter, Hex } from "viem";
import type { DeploymentBuild, DeploymentRecord } from "./deployments";
import { readConstructorAbi } from "@/lib/verification/constructorAbi";
import { readJson } from "@/lib/verification/transport";
import { decodeConstructorArguments } from "./constructorArguments";
import type { VerifiedContract } from "./verifiedContract";
export function deploymentMatchesContract(
  record: DeploymentRecord,
  contract: { name: string; sourcePath: string }
) {
  return (
    !record.deletedAt &&
    record.status !== "rejected" &&
    record.contractName === contract.name &&
    record.sourcePath === contract.sourcePath
  );
}

export async function loadDeploymentConstructor(
  record: DeploymentRecord,
  getBuild: (id: string) => Promise<DeploymentBuild>,
  signal: AbortSignal
) {
  let inputs = record.constructorInputs;
  if (!inputs) {
    const build = await getBuild(record.buildId);
    inputs = readConstructorAbi(build.contract.abi)?.inputs;
  }
  signal.throwIfAborted();
  if (!inputs && record.imported && record.address) {
    const response = await fetch(
      `/api/solidity/import-contract?chainId=${record.chainId}&address=${record.address}`,
      { signal, credentials: "omit", cache: "no-store" }
    );
    if (!response.ok) throw new Error("Verified ABI unavailable.");
    const contract = (await readJson(
      response.body,
      4_000_000,
      signal
    )) as VerifiedContract;
    if (
      contract.chainId !== record.chainId ||
      contract.address.toLowerCase() !== record.address.toLowerCase()
    )
      throw new Error("Wrong contract.");
    inputs = contract.source.constructorAbi?.inputs;
  }
  if (!inputs) throw new Error("Constructor ABI unavailable.");
  const values = decodeConstructorArguments(inputs, record.constructorArgs);
  if (!values) throw new Error("Constructor arguments could not be decoded.");
  signal.throwIfAborted();
  return { inputs, values };
}
export function constructorTypes(
  inputs: readonly (AbiParameter | JsonFragmentType)[]
) {
  return inputs
    .map((input) => ParamType.from(input as JsonFragmentType).format("sighash"))
    .join(",");
}
export function constructorsMatch(
  current: readonly JsonFragmentType[],
  saved: readonly AbiParameter[]
) {
  const names = (
    parameters: readonly (AbiParameter | JsonFragmentType)[]
  ): unknown =>
    parameters.map((parameter) => [
      parameter.name ?? "",
      "components" in parameter && parameter.components
        ? names(parameter.components)
        : [],
    ]);
  try {
    return (
      constructorTypes(current) === constructorTypes(saved) &&
      JSON.stringify(names(current)) === JSON.stringify(names(saved))
    );
  } catch {
    return false;
  }
}
function toInput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toInput);
  return typeof value === "bigint" || typeof value === "boolean"
    ? String(value)
    : value;
}
export function reuseConstructorValues(
  current: readonly JsonFragmentType[],
  saved: readonly AbiParameter[],
  encoded: Hex
): Record<number, any> {
  if (!constructorsMatch(current, saved))
    throw new Error("Constructor parameters have changed.");
  // Positional decoding keeps duplicate and unnamed tuple fields exact.
  const values = AbiCoder.defaultAbiCoder().decode(
    current.map((input) => ParamType.from(input)),
    encoded
  );
  return Object.fromEntries(
    Array.from(values).map((value, index) => [index, toInput(value)])
  );
}
