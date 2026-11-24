import { parse } from "@solidity-parser/parser";
import type {
  ASTNode,
  TypeName,
} from "@solidity-parser/parser/dist/src/ast-types";
import { toFunctionSelector } from "viem";

export type FunctionSelector = {
  line: number;
  column: number;
  signature: string;
  selector: string;
};

/** Only emit selectors whose ABI types can be resolved, never hash source type names. */
export function functionSelectors(source: string): FunctionSelector[] {
  try {
    const ast = parse(source, { loc: true });
    const globals = new Map<string, ASTNode>();
    for (const node of ast.children) {
      if ("name" in node && typeof node.name === "string")
        globals.set(node.name, node);
      if (node.type === "ContractDefinition") {
        for (const child of node.subNodes as ASTNode[]) {
          if ("name" in child && typeof child.name === "string")
            globals.set(`${node.name}.${child.name}`, child);
        }
      }
    }
    const results: FunctionSelector[] = [];
    for (const contract of ast.children) {
      if (contract.type !== "ContractDefinition") continue;
      const locals = new Map<string, ASTNode>();
      for (const node of contract.subNodes as ASTNode[])
        if ("name" in node && typeof node.name === "string")
          locals.set(node.name, node);
      const resolveType = (
        type: TypeName | null,
        seen = new Set<ASTNode>()
      ): string | null => {
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
            const base = resolveType(type.baseTypeName, seen);
            // Constant expressions need compiler evaluation; don't guess their value.
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
            if (contract.kind === "library") return null; // Library ABI has different rules for storage types.
            const node =
              locals.get(type.namePath) ?? globals.get(type.namePath);
            if (!node || seen.has(node)) return null;
            const next = new Set(seen).add(node);
            if (node.type === "ContractDefinition") return "address";
            if (node.type === "EnumDefinition")
              return node.members.length <= 256 ? "uint8" : null;
            if (node.type === "TypeDefinition")
              return resolveType(node.definition, next);
            if (node.type === "StructDefinition") {
              const members = node.members.map((member) =>
                resolveType(member.typeName, next)
              );
              return members.every(
                (member): member is string => member !== null
              )
                ? `(${members.join(",")})`
                : null;
            }
            return null;
          }
          default:
            return null;
        }
      };
      for (const node of contract.subNodes as ASTNode[]) {
        if (
          node.type !== "FunctionDefinition" ||
          !node.name ||
          node.isConstructor ||
          node.isFallback ||
          node.isReceiveEther ||
          !["public", "external"].includes(node.visibility)
        )
          continue;
        const types = node.parameters.map((param) =>
          param.storageLocation === "storage"
            ? null
            : resolveType(param.typeName)
        );
        if (types.some((type) => type === null) || !node.loc) continue;
        const signature = `${node.name}(${types.join(",")})`;
        results.push({
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          signature,
          selector: toFunctionSelector(signature),
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}
