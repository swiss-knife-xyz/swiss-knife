import type { CompilerBuild, CompilerTarget } from "./useSolidityCompiler";

const MAX_BUILDS = 10;
const MAX_CHARS = 16 * 1024 * 1024;

/** Session-only LRU; source/output size is bounded as well as the build count. */
export class CompilationCache {
  private entries = new Map<string, { build: CompilerBuild; size: number }>();
  private size = 0;

  remember(build: CompilerBuild) {
    const key = build.input.fingerprint;
    const previous = this.entries.get(key);
    if (previous) this.size -= previous.size;
    this.entries.delete(key);
    const size =
      key.length +
      JSON.stringify(build.output ?? build.result).length +
      build.input.files.reduce((total, file) => total + file.content.length, 0);
    if (size > MAX_CHARS) return;
    this.entries.set(key, { build, size });
    this.size += size;
    while (this.entries.size > MAX_BUILDS || this.size > MAX_CHARS) {
      const oldest = this.entries.keys().next().value!;
      this.size -= this.entries.get(oldest)!.size;
      this.entries.delete(oldest);
    }
  }

  forget(fingerprint: string) {
    const entry = this.entries.get(fingerprint);
    if (entry) this.size -= entry.size;
    this.entries.delete(fingerprint);
  }

  touch(build: CompilerBuild) {
    const key = build.input.fingerprint;
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.entries.set(key, entry);
  }

  get(fingerprint: string) {
    return this.entries.get(fingerprint)?.build;
  }

  find(target: CompilerTarget): CompilerBuild | null {
    // No import parsing or full-source serialization on the typing/render path.
    // A changed filename set invalidates missing-import diagnostics as well.
    let files: Map<string, (typeof target.files)[number]> | undefined;
    const settings = JSON.stringify(target.settings);
    for (const { build } of [...this.entries.values()].reverse()) {
      const old = build.input;
      if (
        old.workspaceId !== target.workspaceId ||
        old.entryId !== target.entryId ||
        old.entry !== target.entry ||
        JSON.stringify(old.settings) !== settings
      )
        continue;
      if (old.files !== target.files)
        files ??= new Map(target.files.map((file) => [file.name, file]));
      if (
        old.files !== target.files &&
        (old.files.length !== target.files.length ||
          old.files.some((file) => !files!.has(file.name)) ||
          Object.entries(old.sources).some(
            ([path, source]) => files!.get(path)?.content !== source.content
          ))
      )
        continue;
      return { ...build, input: { ...old, ...target } };
    }
    return null;
  }
}
