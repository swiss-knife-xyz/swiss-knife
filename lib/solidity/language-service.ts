import { parse } from "@solidity-parser/parser";
import type {
  ASTNode,
  TypeName,
  VariableDeclaration,
} from "@solidity-parser/parser/dist/src/ast-types";
import { GLOBALS, MEMBERS, type LanguageItem } from "./language-catalog";
import { resolveImport } from "./compilation";
import type { SolidityFile } from "./workspace";

export type LanguageQuery = {
  path: string;
  content: string;
  offset: number;
  kind: "completion" | "hover" | "signature" | "definition";
};
export type LanguageReply = {
  items: LanguageItem[];
  activeParameter?: number;
  importRange?: [number, number];
};
type Symbol = LanguageItem & {
  key: string;
  owner?: string;
  scope: [number, number];
  visibility?: string;
  typeName?: string;
  storage?: string | null;
  bases?: string[];
};
type Import = {
  path: string;
  alias: string | null;
  aliases: Array<[string, string | null]> | null;
};
type Index = { file: SolidityFile; symbols: Symbol[]; imports: Import[] };

// Preserve offsets while excluding comments/string contents from context scans.
export function maskNonCode(source: string) {
  return source.replace(
    /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)/g,
    (value) => value.replace(/[^\r\n]/g, " ")
  );
}
function insideNonCode(source: string, offset: number) {
  // Scan complete tokens; a closing quote/comment delimiter is outside at its end.
  const re =
    /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)/g;
  for (const token of source.matchAll(re)) {
    const start = token.index!,
      end = start + token[0].length;
    if (offset > start && offset < end) return true;
    if (
      offset === end &&
      (token[0].startsWith("//") ||
        (token[0].startsWith("/*") && !token[0].endsWith("*/")) ||
        ((token[0][0] === '"' || token[0][0] === "'") &&
          token[0].at(-1) !== token[0][0]))
    )
      return true;
  }
  return false;
}
function typeName(node: TypeName | null): string {
  if (!node) return "";
  switch (node.type) {
    case "ElementaryTypeName":
      return node.name + (node.stateMutability === "payable" ? " payable" : "");
    case "UserDefinedTypeName":
      return node.namePath;
    case "ArrayTypeName":
      return typeName(node.baseTypeName) + (node.length ? "[fixed]" : "[]");
    case "Mapping":
      return `mapping(${typeName(node.keyType)} => ${typeName(node.valueType)})`;
    case "FunctionTypeName":
      return "function";
  }
}
const parameter = (node: VariableDeclaration) =>
  [typeName(node.typeName), node.storageLocation, node.name]
    .filter(Boolean)
    .join(" ");
function indexFile(
  file: SolidityFile,
  offset: number,
  remappings: string[] = []
): Index | undefined {
  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(file.content, { tolerant: true, range: true });
  } catch {
    // Incomplete expressions (e.g. `msg.`) can prevent even a tolerant parse.
    // Mask only the current statement, keeping source coordinates unchanged.
    const code = maskNonCode(file.content);
    const start =
      Math.max(
        code.lastIndexOf(";", offset - 1),
        code.lastIndexOf("{", offset - 1),
        code.lastIndexOf("}", offset - 1)
      ) + 1;
    let end = offset;
    while (end < code.length && !";}".includes(code[end])) end++;
    if (code[end] === ";") end++;
    const repaired =
      file.content.slice(0, start) +
      file.content.slice(start, end).replace(/[^\r\n]/g, " ") +
      file.content.slice(end);
    try {
      ast = parse(repaired, { tolerant: true, range: true });
    } catch {
      return;
    }
  }
  const index: Index = { file, symbols: [], imports: [] };
  const all: [number, number] = [0, file.content.length];
  const add = (
    node: ASTNode,
    item: LanguageItem,
    scope = all,
    owner?: string,
    extra: Partial<Symbol> = {}
  ) => {
    const offset = node.range?.[0] ?? 0;
    const symbol: Symbol = {
      ...item,
      key: `${file.id}:${offset}:${item.name}`,
      fileId: file.id,
      path: file.name,
      offset,
      scope,
      owner,
      ...extra,
    };
    const preceding = file.content
      .slice(0, offset)
      .match(/(?:\/\/\/[^\n]*\n\s*)+$|\/\*\*[\s\S]*?\*\/\s*$/)?.[0];
    if (preceding)
      symbol.documentation = preceding
        .replace(/^\s*\/\/\/\s?/gm, "")
        .replace(/^\/\*\*|\*\/\s*$/g, "")
        .trim();
    index.symbols.push(symbol);
    return symbol;
  };
  const variable = (
    node: VariableDeclaration,
    scope: [number, number],
    owner?: string,
    param = false
  ) => {
    if (!node.name) return;
    const type = typeName(node.typeName);
    add(
      node,
      {
        name: node.name,
        kind: node.isStateVar ? "Field" : "Variable",
        detail: parameter(node),
      },
      [
        param || node.isStateVar || owner
          ? scope[0]
          : (node.range?.[1] ?? scope[0]),
        scope[1],
      ],
      owner,
      {
        typeName: type,
        storage: node.storageLocation,
        visibility: node.visibility,
      }
    );
  };
  const walk = (node: ASTNode, scope = all, owner?: string) => {
    const range: [number, number] = node.range
      ? [node.range[0], node.range[1] + 1]
      : scope;
    if (node.type === "ImportDirective") {
      index.imports.push({
        path: resolveImport(file.name, node.path, remappings),
        alias: node.unitAlias,
        aliases: node.symbolAliases,
      });
      return;
    }
    if (node.type === "ContractDefinition") {
      const symbol = add(
        node,
        { name: node.name, kind: "Class", detail: `${node.kind} ${node.name}` },
        all,
        undefined,
        { bases: node.baseContracts.map((base) => base.baseName.namePath) }
      );
      symbol.scope = range;
      for (const child of node.subNodes)
        walk(child as ASTNode, range, symbol.key);
      return;
    }
    if (node.type === "StructDefinition") {
      const symbol = add(
        node,
        { name: node.name, kind: "Struct", detail: `struct ${node.name}` },
        scope,
        owner
      );
      for (const member of node.members) variable(member, range, symbol.key);
      return;
    }
    if (node.type === "EnumDefinition") {
      const symbol = add(
        node,
        { name: node.name, kind: "Enum", detail: `enum ${node.name}` },
        scope,
        owner
      );
      for (const member of node.members)
        add(
          member,
          {
            name: member.name,
            kind: "EnumMember",
            detail: `${node.name}.${member.name}`,
          },
          range,
          symbol.key
        );
      return;
    }
    if (
      node.type === "FunctionDefinition" ||
      node.type === "ModifierDefinition" ||
      node.type === "EventDefinition" ||
      node.type === "CustomErrorDefinition"
    ) {
      const name = node.name;
      if (name) {
        const params = (node.parameters ?? []).map(parameter);
        const visibility = "visibility" in node ? node.visibility : undefined;
        const returns =
          node.type === "FunctionDefinition" && node.returnParameters?.length
            ? ` returns (${node.returnParameters.map(parameter).join(", ")})`
            : "";
        add(
          node,
          {
            name,
            kind: node.type === "EventDefinition" ? "Event" : "Function",
            parameters: params,
            detail: `${name}(${params.join(", ")})${visibility && visibility !== "default" ? " " + visibility : ""}${node.type === "FunctionDefinition" && node.stateMutability ? " " + node.stateMutability : ""}${returns}`,
          },
          scope,
          owner,
          { visibility }
        );
      }
      if ("body" in node) {
        for (const param of node.parameters ?? [])
          variable(param, range, undefined, true);
        if (node.type === "FunctionDefinition")
          for (const param of node.returnParameters ?? [])
            variable(param, range, undefined, true);
        if (node.body) walk(node.body, range, owner);
      }
      return;
    }
    if (node.type === "VariableDeclaration") {
      variable(node, scope, node.isStateVar ? owner : undefined);
      return;
    }
    if (node.type === "FileLevelConstant") {
      add(
        node,
        {
          name: node.name,
          kind: "Constant",
          detail: `${typeName(node.typeName)} constant ${node.name}`,
        },
        all,
        undefined,
        { typeName: typeName(node.typeName) }
      );
      return;
    }
    if (node.type === "TypeDefinition") {
      add(
        node,
        {
          name: node.name,
          kind: "Class",
          detail: `type ${node.name} is ${typeName(node.definition)}`,
        },
        scope,
        owner
      );
      return;
    }
    const childScope = ["Block", "ForStatement", "CatchClause"].includes(
      node.type
    )
      ? range
      : scope;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value)
          if (child && typeof child === "object" && "type" in child)
            walk(child as ASTNode, childScope, owner);
      } else if (value && typeof value === "object" && "type" in value)
        walk(value as ASTNode, childScope, owner);
    }
  };
  walk(ast);
  return index;
}
function relativePath(from: string, to: string) {
  const base = from.split("/");
  base.pop();
  const target = to.split("/");
  while (base.length && base[0] === target[0]) {
    base.shift();
    target.shift();
  }
  const path = [...base.map(() => ".."), ...target].join("/");
  return path.startsWith("..") ? path : "./" + path;
}
export class SolidityLanguageService {
  private files = new Map<string, SolidityFile>();
  private cache = new Map<string, Index>();
  private remappings: string[] = [];
  setFiles(files: SolidityFile[], remappings: string[] = []) {
    if (JSON.stringify(remappings) !== JSON.stringify(this.remappings))
      this.cache.clear();
    this.remappings = remappings;
    this.files = new Map(files.map((file) => [file.name, file]));
    for (const path of this.cache.keys())
      if (!this.files.has(path)) this.cache.delete(path);
  }
  query(query: LanguageQuery): LanguageReply {
    const source = this.files.get(query.path);
    if (!source) return { items: [] };
    const current = { ...source, content: query.content };
    const get = (path: string): Index | undefined => {
      const file = path === current.name ? current : this.files.get(path);
      if (!file) return;
      const cached = this.cache.get(path);
      if (cached?.file.id === file.id && cached.file.content === file.content)
        return cached;
      const indexed = indexFile(
        file,
        path === current.name ? query.offset : file.content.length,
        this.remappings
      );
      if (indexed) this.cache.set(path, indexed);
      // Cached declarations are useful while typing an incomplete statement.
      return indexed ?? (cached?.file.id === file.id ? cached : undefined);
    };
    const active = get(query.path);
    const before = query.content.slice(0, query.offset);
    const importMatch = before.match(
      /\bimport\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+)?["']([^"']*)$/
    );
    if (
      query.kind === "completion" &&
      importMatch &&
      !maskNonCode(before.slice(0, before.length - importMatch[0].length))
        .trimEnd()
        .endsWith("//")
    ) {
      // Ensure the directive isn't inside a comment (the opening quote is expected).
      const directiveStart = before.length - importMatch[0].length;
      if (!insideNonCode(query.content, directiveStart + 1))
        return {
          items: [...this.files.values()]
            .filter((file) => file.id !== source.id)
            .map((file) => ({
              name: relativePath(query.path, file.name),
              kind: "Module",
              detail: file.name,
            })),
          importRange: [query.offset - importMatch[1].length, query.offset],
        };
    }
    if (insideNonCode(query.content, query.offset)) return { items: [] };
    const roots: Symbol[] = [];
    const namespaces = new Map<string, Index>();
    if (active)
      for (const directive of active.imports) {
        const imported = get(directive.path);
        if (!imported) continue;
        const exported = imported.symbols.filter(
          (symbol) => !symbol.owner && symbol.kind !== "Variable"
        );
        if (directive.alias) {
          namespaces.set(directive.alias, imported);
          roots.push({
            name: directive.alias,
            kind: "Module",
            detail: `import ${directive.path}`,
            key: `namespace:${directive.alias}`,
            scope: [0, query.content.length],
            fileId: imported.file.id,
            path: imported.file.name,
            offset: 0,
          });
        } else if (directive.aliases)
          for (const [original, alias] of directive.aliases) {
            for (const symbol of exported.filter(
              (symbol) => symbol.name === original
            ))
              roots.push({ ...symbol, name: alias ?? original });
          }
        else roots.push(...exported);
      }
    const localRoots =
      active?.symbols.filter(
        (symbol) => !symbol.owner && symbol.kind !== "Variable"
      ) ?? [];
    roots.push(...localRoots);
    const contract = active?.symbols.find(
      (symbol) =>
        symbol.kind === "Class" &&
        symbol.bases &&
        query.offset >= symbol.scope[0] &&
        query.offset <= symbol.scope[1]
    );
    const owned = (
      owner: Symbol,
      inherited = true,
      visited = new Set<string>()
    ): Symbol[] => {
      if (visited.has(owner.key)) return [];
      visited.add(owner.key);
      const file = get(owner.path!);
      const own =
        file?.symbols.filter((symbol) => symbol.owner === owner.key) ?? [];
      if (!inherited) return own;
      // Resolve bases from each declaring source's imports, including aliased names.
      const baseScope = [
        ...(file?.symbols.filter((symbol) => !symbol.owner) ?? []),
      ];
      for (const imported of file?.imports ?? []) {
        for (const symbol of get(imported.path)?.symbols.filter(
          (symbol) => !symbol.owner
        ) ?? []) {
          if (imported.alias)
            baseScope.push({
              ...symbol,
              name: `${imported.alias}.${symbol.name}`,
            });
          else if (imported.aliases)
            for (const [original, alias] of imported.aliases) {
              if (symbol.name === original)
                baseScope.push({ ...symbol, name: alias ?? original });
            }
          else baseScope.push(symbol);
        }
      }
      return [
        ...own,
        ...(owner.bases ?? []).flatMap((name) => {
          const base = baseScope.find(
            (symbol) => symbol.name === name && symbol.bases
          );
          return base
            ? owned(base, true, visited).filter(
                (symbol) => symbol.visibility !== "private"
              )
            : [];
        }),
      ];
    };
    const locals =
      active?.symbols
        .filter(
          (symbol) =>
            !symbol.owner &&
            symbol.kind === "Variable" &&
            query.offset >= symbol.scope[0] &&
            query.offset <= symbol.scope[1]
        )
        .sort((a, b) => b.scope[0] - a.scope[0]) ?? [];
    const visible = [...locals, ...(contract ? owned(contract) : []), ...roots];
    const resolveType = (name: string): Symbol | undefined => {
      const direct = visible.find(
        (symbol) =>
          symbol.name === name &&
          ["Class", "Struct", "Enum"].includes(symbol.kind)
      );
      if (direct) return direct;
      const [space, member] = name.split(".");
      return namespaces
        .get(space)
        ?.symbols.find((symbol) => !symbol.owner && symbol.name === member);
    };
    const externalMembers = (values: Symbol[]) =>
      values.flatMap((symbol): LanguageItem[] => {
        if (symbol.visibility !== "public" && symbol.visibility !== "external")
          return [];
        if (symbol.kind === "Function") return [symbol];
        if (symbol.kind !== "Field") return [];
        const parameters: string[] = [];
        let type = symbol.typeName ?? "";
        while (type.startsWith("mapping(") || type.endsWith("]")) {
          const mapping = type.match(/^mapping\((.*?) => (.*)\)$/);
          if (mapping) {
            parameters.push(mapping[1]);
            type = mapping[2];
          } else {
            parameters.push("uint256 index");
            type = type.replace(/\[[^\]]*\]$/, "");
          }
        }
        return [
          {
            ...symbol,
            kind: "Function",
            parameters,
            detail: `${symbol.name}(${parameters.join(", ")}) · public getter`,
          },
        ];
      });
    const members = (receiver: string): LanguageItem[] => {
      const variable = visible.find(
        (symbol) => symbol.name === receiver && symbol.typeName
      );
      if (!variable && MEMBERS[receiver]) return MEMBERS[receiver];
      if (namespaces.has(receiver))
        return namespaces
          .get(receiver)!
          .symbols.filter(
            (symbol) => !symbol.owner && symbol.kind !== "Variable"
          );
      if (receiver === "this" && contract)
        return externalMembers(owned(contract));
      if (receiver === "super" && contract)
        return owned(contract).filter(
          (symbol) =>
            symbol.kind === "Function" &&
            symbol.owner !== contract.key &&
            symbol.visibility !== "external" &&
            symbol.visibility !== "private"
        );
      const parts = receiver.split(".");
      const type = variable?.typeName ?? receiver;
      if (type.startsWith("address"))
        return [
          ...MEMBERS.address,
          ...(type.includes("payable") ? MEMBERS.payable : []),
        ];
      if (type.endsWith("]") || type === "bytes")
        return [
          ...MEMBERS.array,
          ...((variable?.storage === "storage" || variable?.kind === "Field") &&
          (type.endsWith("[]") || type === "bytes")
            ? MEMBERS.storageArray
            : []),
        ];
      const definition = resolveType(type);
      if (definition) {
        const values = owned(definition);
        if (definition.kind === "Struct" || definition.kind === "Enum")
          return values;
        return [
          ...externalMembers(values),
          ...(!variable && definition.detail.startsWith("library ")
            ? values.filter(
                (symbol) =>
                  symbol.kind === "Function" && symbol.visibility === "internal"
              )
            : []),
        ];
      }
      if (parts.length === 2) {
        const outer = visible.find(
          (symbol) => symbol.name === parts[0] && symbol.typeName
        );
        const struct = outer && resolveType(outer.typeName!);
        const field =
          struct && owned(struct).find((symbol) => symbol.name === parts[1]);
        if (field?.typeName) {
          const inner = resolveType(field.typeName);
          if (inner) return owned(inner);
        }
      }
      return [];
    };
    const code = maskNonCode(query.content);
    const prefix = code.slice(0, query.offset);
    if (query.kind === "signature") {
      let depth = 0,
        parameterIndex = 0,
        open = -1;
      for (let i = prefix.length - 1; i >= 0; i--) {
        const char = prefix[i];
        if (")]}".includes(char)) depth++;
        else if ("([{".includes(char)) {
          if (depth) depth--;
          else if (char === "(") {
            open = i;
            break;
          } else break;
        } else if (char === "," && !depth) parameterIndex++;
      }
      if (open < 0) return { items: [] };
      const callee = prefix
        .slice(0, open)
        .match(/([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*$/)?.[1]
        ?.replace(/\s/g, "");
      if (!callee) return { items: [] };
      const dot = callee.lastIndexOf(".");
      const candidates =
        dot >= 0 ? members(callee.slice(0, dot)) : [...visible, ...GLOBALS];
      return {
        items: candidates.filter(
          (item) => item.name === callee.slice(dot + 1) && item.parameters
        ),
        activeParameter: parameterIndex,
      };
    }
    const word = prefix.match(/[\w$]*$/)?.[0] ?? "";
    const stem = prefix.slice(0, prefix.length - word.length);
    const receiver = stem
      .match(/([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*$/)?.[1]
      ?.replace(/\s/g, "");
    const items = receiver ? members(receiver) : [...visible, ...GLOBALS];
    if (query.kind === "completion") {
      const seen = new Set<string>();
      return {
        items: items.filter((item) => {
          const key = `${item.name}:${item.parameters?.join(",") ?? item.kind}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      };
    }
    const suffix = code.slice(query.offset).match(/^[\w$]*/)?.[0] ?? "";
    return { items: items.filter((item) => item.name === word + suffix) };
  }
}
