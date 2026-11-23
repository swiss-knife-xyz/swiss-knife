import { parse } from "@solidity-parser/parser";
import type {
  ASTNode,
  TypeName,
  VariableDeclaration,
} from "@solidity-parser/parser/dist/src/ast-types";
export type OutlineKind =
  | "contract"
  | "interface"
  | "library"
  | "function"
  | "constructor"
  | "receive"
  | "fallback"
  | "modifier"
  | "event"
  | "error"
  | "variable"
  | "struct"
  | "enum"
  | "enumMember"
  | "type";
export type OutlineSymbol = {
  id: string;
  kind: OutlineKind;
  name: string;
  detail: string;
  tags: string[];
  line: number;
  column: number;
  children: OutlineSymbol[];
};
export type OutlineResult = { symbols: OutlineSymbol[]; unavailable?: boolean };
function typeName(type: TypeName | null, source: string): string {
  if (!type) return "";
  switch (type.type) {
    case "ElementaryTypeName":
      return type.name + (type.stateMutability === "payable" ? " payable" : "");
    case "UserDefinedTypeName":
      return type.namePath;
    case "ArrayTypeName":
      return (
        typeName(type.baseTypeName, source) +
        `[${type.length?.range ? source.slice(type.length.range[0], type.length.range[1] + 1) : ""}]`
      );
    case "Mapping":
      return `mapping(${typeName(type.keyType, source)} => ${typeName(type.valueType, source)})`;
    case "FunctionTypeName":
      return "function";
    default:
      return "";
  }
}
export function solidityOutline(source: string): OutlineResult {
  try {
    const ast = parse(source, { tolerant: true, range: true, loc: true });
    const symbol = (
      node: ASTNode,
      kind: OutlineKind,
      name: string,
      detail = "",
      tags: string[] = [],
      children: OutlineSymbol[] = []
    ): OutlineSymbol => ({
      id: `${node.type}:${node.range?.[0] ?? 0}:${name}`,
      kind,
      name,
      detail,
      tags: tags.filter(
        (tag) => tag && tag !== "default" && tag !== "nonpayable"
      ),
      line: node.loc?.start.line ?? 1,
      column: (node.loc?.start.column ?? 0) + 1,
      children,
    });
    const variable = (node: VariableDeclaration) =>
      symbol(
        node,
        "variable",
        node.name ?? "",
        typeName(node.typeName, source),
        [
          node.visibility,
          node.isDeclaredConst ? "constant" : "",
          "isImmutable" in node && node.isImmutable ? "immutable" : "",
          "isTransient" in node && node.isTransient ? "transient" : "",
        ].filter((tag): tag is string => !!tag)
      );
    const declarations = (node: ASTNode): OutlineSymbol[] => {
      switch (node.type) {
        case "ContractDefinition":
          return [
            symbol(
              node,
              node.kind === "interface"
                ? "interface"
                : node.kind === "library"
                  ? "library"
                  : "contract",
              node.name,
              node.baseContracts.length
                ? `is ${node.baseContracts.map((base) => base.baseName.namePath).join(", ")}`
                : "",
              [],
              node.subNodes.flatMap((child) => declarations(child as ASTNode))
            ),
          ];
        case "StateVariableDeclaration":
          return node.variables.map(variable);
        case "FunctionDefinition": {
          const kind = node.isConstructor
            ? "constructor"
            : node.isReceiveEther
              ? "receive"
              : node.isFallback
                ? "fallback"
                : "function";
          return [
            symbol(
              node,
              kind,
              node.name || kind,
              `(${node.parameters.map((param) => typeName(param.typeName, source)).join(", ")})`,
              [node.visibility, node.stateMutability ?? ""]
            ),
          ];
        }
        case "ModifierDefinition":
        case "EventDefinition":
        case "CustomErrorDefinition":
          return [
            symbol(
              node,
              node.type === "ModifierDefinition"
                ? "modifier"
                : node.type === "EventDefinition"
                  ? "event"
                  : "error",
              node.name,
              `(${(node.parameters ?? []).map((param) => typeName(param.typeName, source)).join(", ")})`
            ),
          ];
        case "StructDefinition":
          return [
            symbol(
              node,
              "struct",
              node.name,
              "",
              [],
              node.members.map(variable)
            ),
          ];
        case "EnumDefinition":
          return [
            symbol(
              node,
              "enum",
              node.name,
              "",
              [],
              node.members.map((member) =>
                symbol(member, "enumMember", member.name)
              )
            ),
          ];
        case "TypeDefinition":
          return [
            symbol(
              node,
              "type",
              node.name,
              `is ${typeName(node.definition, source)}`
            ),
          ];
        case "FileLevelConstant":
          return [
            symbol(
              node,
              "variable",
              node.name,
              typeName(node.typeName, source),
              ["constant"]
            ),
          ];
        default:
          return [];
      }
    };
    return { symbols: ast.children.flatMap(declarations) };
  } catch {
    return { symbols: [], unavailable: true };
  }
}
