import satisfies from "semver/functions/satisfies";
import validRange from "semver/ranges/valid";
import rcompare from "semver/functions/rcompare";
import { compilationSources } from "./compilation";
import {
  compilerVersion,
  normalizeCompilerSettings,
  type CompilerSettings,
} from "./settings";
export type CompilerRelease = { label: string; value: string };
let releases: Promise<CompilerRelease[]> | undefined;
export function loadCompilerReleases() {
  return (releases ??= fetch(
    "https://binaries.soliditylang.org/bin/list.json",
    { signal: AbortSignal.timeout(15000) }
  )
    .then(async (response) => {
      if (!response.ok) throw new Error("Couldn't load compiler versions.");
      const list = await response.json();
      return Object.values(list.releases as Record<string, string>)
        .filter((file) => {
          const version = compilerVersion(file);
          const [major, minor] = version.split(".").map(Number);
          return version && (major > 0 || minor >= 5);
        })
        .map((value) => ({ label: compilerVersion(value), value }))
        .sort((a, b) => rcompare(a.label, b.label));
    })
    .catch((error) => {
      releases = undefined;
      throw error;
    }));
}
export function solidityPragmas(source: string) {
  const code = source.replace(
    /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g,
    " "
  );
  return [...code.matchAll(/\bpragma\s+solidity\s+([^;]+);/g)].map((match) =>
    match[1].trim()
  );
}
export function selectCompilerRelease(
  files: { name: string; content: string }[],
  entry: string,
  available: CompilerRelease[],
  settings: CompilerSettings
): string | null {
  const source = files.find((file) => file.name === entry);
  if (!source || !solidityPragmas(source.content).length) return null;
  const graph = compilationSources(
    files.map((file) => ({ ...file, id: file.name })),
    entry,
    settings.extras?.remappings
  );
  const ranges = Object.values(graph).flatMap((file) =>
    solidityPragmas(file.content)
  );
  if (ranges.some((range) => !validRange(range)))
    throw new Error(
      "Couldn't read the Solidity pragma. Choose a compiler manually."
    );
  const matching = available
    .filter((release) =>
      ranges.every((range) => satisfies(compilerVersion(release.value), range))
    )
    .sort((a, b) =>
      rcompare(compilerVersion(a.value), compilerVersion(b.value))
    );
  if (!matching.length)
    throw new Error("No compiler matches the entry file and its imports.");
  // Keep imported optimization/metadata/EVM settings intact instead of silently
  // resetting them when automatically choosing a compatible release.
  const compatible = matching.find((release) => {
    try {
      normalizeCompilerSettings({ ...settings, version: release.value });
      return true;
    } catch {
      return false;
    }
  });
  if (!compatible)
    throw new Error(
      "No matching compiler supports these settings. Choose a compiler manually."
    );
  return compatible.value;
}
