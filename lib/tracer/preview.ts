import type { Arg, DecodeBytesParamResult } from "@/types";

/** Bounded summaries for dense rows. The complete value stays in the parameter tree. */
export function previewArg(arg: Arg, depth = 0): string {
  if (depth > 2) return "…";
  if (Array.isArray(arg.value)) {
    const children = arg.value as Arg[];
    const parts = children
      .slice(0, 3)
      .map((child) => previewArg(child, depth + 1));
    if (children.length > 3) parts.push(`… +${children.length - 3}`);
    return `${arg.baseType === "tuple" ? "(" : "["}${parts.join(", ")}${arg.baseType === "tuple" ? ")" : "]"}`;
  }
  if (arg.baseType.includes("bytes")) {
    const nested = (arg.value as DecodeBytesParamResult | null)?.decoded;
    if (nested)
      return `${nested.guessedFunctionName ?? nested.functionName}(${previewArgs(nested.args, depth + 1)})`;
  }
  const value = String(arg.rawValue ?? arg.value ?? "");
  if (arg.baseType === "address" && /^0x[\da-f]{40}$/i.test(value))
    return `${value.slice(0, 8)}…${value.slice(-4)}`;
  const text = arg.baseType === "string" ? JSON.stringify(value) : value;
  return text.length > 90 ? `${text.slice(0, 70)}…` : text;
}
export function previewArgs(args: Arg[], depth = 0): string {
  const parts = args
    .slice(0, 4)
    .map(
      (arg) => `${arg.name ? `${arg.name}: ` : ""}${previewArg(arg, depth)}`
    );
  if (args.length > 4) parts.push(`… +${args.length - 4}`);
  return parts.join(", ");
}
