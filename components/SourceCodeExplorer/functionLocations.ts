import { parse } from "@solidity-parser/parser";
import type {
  ASTNode,
  ContractDefinition,
  SourceUnit,
  TypeName,
} from "@solidity-parser/parser/dist/src/ast-types";
import { resolveImport } from "@/lib/solidity/compilation";

export type FunctionLocation = { path: string; line: number; column: number };
export type FunctionLocations = Record<string, FunctionLocation>;
type Symbol = { node: ASTNode; path: string; owner?: ContractDefinition };

/** Build once in a worker. No editor models, compilation, or network access required. */
export function buildFunctionLocations(
  sources: Record<string, string>,
  contractName: string
): FunctionLocations {
  const units = new Map<string, SourceUnit | null>();
  function getUnit(path: string): SourceUnit | null {
    if (units.has(path)) return units.get(path)!;
    let unit: SourceUnit | null = null;
    try {
      if (Object.hasOwn(sources, path))
        unit = parse(sources[path], { loc: true });
    } catch {
      /* Unsupported syntax must not produce guessed locations. */
    }
    units.set(path, unit);
    return unit;
  }
  // Cheaply locate candidate root files, then parse imports on demand. Matches
  // inside comments/strings are harmless: the AST still validates the root.
  if (!contractName) return {};
  const escapedName = contractName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const trivia = String.raw`(?:\s|/\*[\s\S]*?\*/|//[^\r\n]*(?:[\r\n]|$))+`;
  const rootPattern = new RegExp(
    String.raw`\b(?:contract|interface|library)${trivia}${escapedName}(?![\w$])`
  );
  const contracts: Symbol[] = [];
  for (const [path, source] of Object.entries(sources)) {
    if (!rootPattern.test(source)) continue;
    for (const node of getUnit(path)?.children ?? []) {
      if (node.type === "ContractDefinition") contracts.push({ node, path });
    }
  }
  const roots = contracts.filter(
    (item) =>
      item.node.type === "ContractDefinition" && item.node.name === contractName
  );
  if (roots.length !== 1) return {};

  // Resolve only visible symbols, including named and namespace imports. Never
  // choose an unrelated contract simply because it declares the same signature.
  function fileSymbol(
    path: string,
    name: string,
    seen = new Set<string>()
  ): Symbol | null {
    const key = `${path}:${name}`;
    if (seen.has(key)) return null;
    const next = new Set(seen).add(key);
    const unit = getUnit(path);
    if (!unit) return null;
    const [head, ...tail] = name.split(".");
    const own = unit.children.find(
      (node) => "name" in node && node.name === head
    );
    if (own) return member({ node: own, path }, tail.join("."));
    const found: Symbol[] = [];
    for (const node of unit.children) {
      if (node.type !== "ImportDirective") continue;
      const importedPath = resolveImport(path, node.path);
      let result: Symbol | null = null;
      if (node.unitAlias) {
        if (head === node.unitAlias && tail.length)
          result = fileSymbol(importedPath, tail.join("."), next);
      } else if (node.symbolAliases) {
        const alias = node.symbolAliases.find(
          ([original, renamed]) => (renamed ?? original) === head
        );
        if (alias)
          result = fileSymbol(
            importedPath,
            [alias[0], ...tail].join("."),
            next
          );
      } else result = fileSymbol(importedPath, name, next);
      if (
        result &&
        !found.some(
          (item) => item.path === result.path && item.node === result.node
        )
      )
        found.push(result);
    }
    return found.length === 1 ? found[0] : null;
  }
  function member(symbol: Symbol, name: string): Symbol | null {
    if (!name) return symbol;
    if (symbol.node.type !== "ContractDefinition") return null;
    const node = symbol.node.subNodes.find(
      (node) => "name" in node && node.name === name
    ) as ASTNode | undefined;
    return node ? { node, path: symbol.path, owner: symbol.node } : null;
  }
  const linearizations = new Map<ASTNode, Symbol[] | null>();
  // Solidity uses C3 with the rightmost base taking precedence.
  function linearize(
    symbol: Symbol,
    seen = new Set<ASTNode>()
  ): Symbol[] | null {
    if (linearizations.has(symbol.node))
      return linearizations.get(symbol.node)!;
    if (symbol.node.type !== "ContractDefinition" || seen.has(symbol.node))
      return null;
    const next = new Set(seen).add(symbol.node);
    const bases: Symbol[] = [];
    for (const base of [...symbol.node.baseContracts].reverse()) {
      const resolved = fileSymbol(symbol.path, base.baseName.namePath);
      if (!resolved || resolved.node.type !== "ContractDefinition") return null;
      bases.push(resolved);
    }
    const sequences: Symbol[][] = [];
    for (const base of bases) {
      const order = linearize(base, next);
      if (!order) return null;
      sequences.push([...order]);
    }
    sequences.push([...bases]);
    const result = [symbol];
    while (sequences.some((sequence) => sequence.length)) {
      const candidate = sequences.find(
        (sequence) =>
          sequence.length &&
          !sequences.some((other) =>
            other.slice(1).some((item) => item.node === sequence[0].node)
          )
      )?.[0];
      if (!candidate) return null;
      result.push(candidate);
      for (const sequence of sequences)
        if (sequence[0]?.node === candidate.node) sequence.shift();
    }
    linearizations.set(symbol.node, result);
    return result;
  }
  function scopedSymbol(context: Symbol, name: string): Symbol | null {
    const [head, ...tail] = name.split(".");
    const owner =
      context.owner ??
      (context.node.type === "ContractDefinition" ? context.node : undefined);
    if (owner) {
      const order = linearize({ node: owner, path: context.path });
      if (!order) return null;
      for (const item of order) {
        const local = member(item, head);
        if (local) return member(local, tail.join("."));
      }
    }
    return fileSymbol(context.path, name);
  }
  function abiType(
    type: TypeName | null,
    context: Symbol,
    seen = new Set<ASTNode>()
  ): string | null {
    if (!type) return null;
    switch (type.type) {
      case "ElementaryTypeName":
        return (
          (
            {
              uint: "uint256",
              int: "int256",
              byte: "bytes1",
              fixed: "fixed128x18",
              ufixed: "ufixed128x18",
            } as Record<string, string>
          )[type.name] ?? type.name
        );
      case "ArrayTypeName": {
        const base = abiType(type.baseTypeName, context, seen);
        const length = !type.length
          ? ""
          : type.length.type === "NumberLiteral" &&
              /^\d+$/.test(type.length.number)
            ? String(BigInt(type.length.number))
            : null;
        return base && length !== null ? `${base}[${length}]` : null;
      }
      case "FunctionTypeName":
        return type.visibility === "external" ? "function" : null;
      case "UserDefinedTypeName": {
        const resolved = scopedSymbol(context, type.namePath);
        if (!resolved || seen.has(resolved.node)) return null;
        const next = new Set(seen).add(resolved.node);
        const node = resolved.node;
        if (node.type === "ContractDefinition") return "address";
        if (node.type === "EnumDefinition")
          return node.members.length <= 256 ? "uint8" : null;
        if (node.type === "TypeDefinition")
          return abiType(node.definition, resolved, next);
        if (node.type === "StructDefinition") {
          const members = node.members.map((item) =>
            abiType(item.typeName, resolved, next)
          );
          return members.every((item) => item !== null)
            ? `(${members.join(",")})`
            : null;
        }
        return null;
      }
      default:
        return null;
    }
  }
  const order = linearize(roots[0]);
  if (!order) return {};
  const locations: FunctionLocations = Object.create(null);
  const claimed = new Set<string>();
  const unresolved = new Set<string>();
  for (const context of order) {
    if (
      context.node.type !== "ContractDefinition" ||
      context.node.kind === "library"
    )
      continue;
    for (const node of context.node.subNodes as ASTNode[]) {
      let name: string | null = null;
      let types: (string | null)[] = [];
      let hasBody = true;
      let declaration: ASTNode = node;
      if (
        node.type === "FunctionDefinition" &&
        node.name &&
        !node.isConstructor &&
        ["public", "external"].includes(node.visibility)
      ) {
        name = node.name;
        types = node.parameters.map((param) =>
          param.storageLocation === "storage"
            ? null
            : abiType(param.typeName, context)
        );
        hasBody = !!node.body;
      } else if (node.type === "StateVariableDeclaration") {
        const variable = node.variables[0];
        if (variable?.visibility !== "public" || !variable.name) continue;
        name = variable.name;
        declaration = variable;
        let type = variable.typeName;
        while (type?.type === "Mapping" || type?.type === "ArrayTypeName") {
          types.push(
            type.type === "Mapping" ? abiType(type.keyType, context) : "uint256"
          );
          type = type.type === "Mapping" ? type.valueType : type.baseTypeName;
        }
      }
      if (!name) continue;
      if (types.some((type) => type === null)) {
        unresolved.add(`${name}:${types.length}`);
        continue;
      }
      const signature = `${name}(${types.join(",")})`;
      if (claimed.has(signature)) continue;
      claimed.add(signature);
      if (
        !hasBody ||
        !declaration.loc ||
        unresolved.has(`${name}:${types.length}`)
      )
        continue;
      locations[signature] = {
        path: context.path,
        line: declaration.loc.start.line,
        column: declaration.loc.start.column + 1,
      };
    }
  }
  return locations;
}
