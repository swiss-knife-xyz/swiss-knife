import type { SolidityFile } from "./workspace";

// Tokenize before looking for imports so comments and string literals containing
// 'import' are never mistaken for declarations. Solc remains the syntax authority.
export type SourceImport = { path: string; line: number; column: number };
export function importDeclarations(content: string): SourceImport[] {
  const tokens =
    content.matchAll(
      /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[A-Za-z_$][\w$]*|[^\s]/g
    ) ?? [];
  const paths: SourceImport[] = [];
  let importing = false;
  let position = { line: 1, column: 1 };
  for (const match of tokens) {
    const token = match[0];
    if (token.startsWith("//") || token.startsWith("/*")) continue;
    if (token === "import") {
      importing = true;
      const prefix = content.slice(0, match.index).split("\n");
      position = { line: prefix.length, column: prefix.at(-1)!.length + 1 };
    } else if (token === ";") importing = false;
    else if (importing && (token[0] === '"' || token[0] === "'")) {
      paths.push({
        ...position,
        path: token
          .slice(1, -1)
          .replace(
            /\\(?:x([\da-fA-F]{2})|u([\da-fA-F]{4})|([\s\S]))/g,
            (_, x, u, char) =>
              x || u
                ? String.fromCharCode(parseInt(x ?? u, 16))
                : ({ n: "\n", r: "\r", t: "\t" }[char as string] ?? char)
          ),
      });
    }
  }
  return paths;
}
export function importPaths(content: string): string[] {
  return importDeclarations(content).map((item) => item.path);
}
export function resolveImport(
  from: string,
  path: string,
  remappings: string[] = []
) {
  let resolved = path;
  if (path.startsWith("./") || path.startsWith("../")) {
    const parts = from.split("/");
    parts.pop();
    for (const part of path.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    resolved = parts.join("/");
  }
  const mapping = remappings
    .map((value) => {
      const equal = value.indexOf("=");
      const left = value.slice(0, equal);
      const colon = left.indexOf(":");
      return {
        context: colon < 0 ? "" : left.slice(0, colon),
        prefix: colon < 0 ? left : left.slice(colon + 1),
        target: value.slice(equal + 1),
      };
    })
    .filter(
      (item) =>
        item.prefix &&
        (!item.context || from.startsWith(item.context)) &&
        resolved.startsWith(item.prefix)
    )
    .sort(
      (a, b) =>
        b.context.length - a.context.length || b.prefix.length - a.prefix.length
    )[0];
  return mapping
    ? mapping.target + resolved.slice(mapping.prefix.length)
    : resolved;
}
export function compilationSources(
  files: SolidityFile[],
  entry: string,
  remappings: string[] = []
) {
  const available = new Map(files.map((file) => [file.name, file.content]));
  if (!available.has(entry))
    throw new Error("Open a source file before compiling.");
  const sources: Record<string, { content: string }> = Object.create(null);
  const pending = [entry];
  while (pending.length) {
    const path = pending.pop()!;
    if (Object.hasOwn(sources, path) || !available.has(path)) continue;
    const content = available.get(path)!;
    sources[path] = { content };
    for (const imported of importPaths(content))
      pending.push(resolveImport(path, imported, remappings));
  }
  return sources;
}
export function sourceSnapshot(files: SolidityFile[]) {
  return JSON.stringify(
    files
      .map(({ name, content }) => [name, content])
      .sort(([a], [b]) => a.localeCompare(b))
  );
}
export function diagnosticPosition(content: string, offset: number) {
  // Solc offsets count UTF-8 bytes; Monaco positions count UTF-16 code units.
  const prefix = new TextDecoder().decode(
    new TextEncoder().encode(content).slice(0, offset)
  );
  const lines = prefix.split("\n");
  return { lineNumber: lines.length, column: lines.at(-1)!.length + 1 };
}

export function relocateImports(content: string, names: Map<string, string>) {
  let importing = false;
  return content.replace(
    /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[A-Za-z_$][\w$]*|[^\s]/g,
    (token) => {
      if (token.startsWith("//") || token.startsWith("/*")) return token;
      if (token === "import") importing = true;
      else if (token === ";") importing = false;
      else if (importing && (token[0] === '"' || token[0] === "'")) {
        const path = importPaths(`import ${token};`)[0];
        if (names.has(path)) return JSON.stringify(names.get(path));
      }
      return token;
    }
  );
}
