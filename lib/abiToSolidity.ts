import type { JsonFragment, JsonFragmentType } from "ethers";

// ABI types are authoritative: internalType may describe enums, contracts or
// value types whose original definitions cannot be reconstructed from the ABI.
const reserved = new Set((
  "abstract address after alias anonymous apply as assembly auto bool break byte bytes calldata case catch constant constructor continue contract copyof default define delete do else emit enum ether event external false final fixed for function gwei hex immutable implements import in indexed inline int interface internal is let library macro mapping match memory modifier mutable new null of override partial payable pragma private promise public pure reference relocatable return returns sealed sizeof static storage string struct super supports switch this throw true try tuple type typedef typeof ufixed uint unchecked unicode using var view virtual wei while years seconds minutes hours days weeks szabo finney"
).split(" "));

function identifier(value: string) {
  return /^[A-Za-z_$][\w$]*$/.test(value) && !reserved.has(value) &&
    !/^(?:u?int\d*|bytes\d*|u?fixed\d*x?\d*)$/.test(value);
}

function safeName(value: string, fallback: string) {
  const cleaned = value.replace(/[^\w$]/g, "_");
  return identifier(cleaned) ? cleaned : fallback;
}

export function abiToSolidity(abi: readonly JsonFragment[], contractName = "Contract"): string {
  const usedTypes = new Set(abi.map((item) => item.name || ""));
  const interfaceName = uniqueName(safeName(`I${contractName || "Contract"}`, "IContract"), usedTypes);
  const structs = new Map<string, string>();
  const declarations: string[] = [];
  let anonymousStruct = 0;

  function uniqueName(preferred: string, used: Set<string>) {
    let name = preferred;
    for (let suffix = 2; used.has(name); suffix++) name = `${preferred}_${suffix}`;
    used.add(name);
    return name;
  }

  function typeOf(param: JsonFragmentType, depth = 0): { type: string; reference: boolean } {
    if (depth > 64) throw new Error("ABI tuple nesting is too deep.");
    const match = /^(\w+)((?:\[(?:[1-9]\d*)?\])*)$/.exec(param.type || "");
    if (!match) throw new Error(`Unsupported ABI type: ${param.type || "missing type"}.`);
    const [, base, suffix] = match;
    if (base === "tuple") {
      if (!param.components?.length) throw new Error("A tuple is missing its component definitions.");
      // Include field names and type hints so unrelated named structs stay distinct.
      const key = JSON.stringify({ internalType: param.internalType?.replace(/\[.*$/, ""), components: param.components });
      let name = structs.get(key);
      if (!name) {
        const hint = param.internalType?.match(/^struct (.+?)(?:\[|$)/)?.[1].split(".").pop();
        const preferred = hint && identifier(hint) ? hint : `Tuple${++anonymousStruct}`;
        name = uniqueName(preferred, usedTypes);
        structs.set(key, name);
        const fields = new Set<string>();
        const body = param.components.map((field, index) => {
          const fieldType = typeOf(field, depth + 1).type;
          const fieldName = uniqueName(safeName(field.name || "", `field${index}`), fields);
          return `        ${fieldType} ${fieldName};`;
        });
        declarations.push(`    struct ${name} {\n${body.join("\n")}\n    }`);
      }
      return { type: name + suffix, reference: true };
    }
    const integer = /^(u?int)(\d*)$/.exec(base);
    const bytes = /^bytes(\d+)$/.exec(base);
    let type = base;
    if (integer) {
      const width = Number(integer[2] || 256);
      if (width < 8 || width > 256 || width % 8) throw new Error(`Invalid integer type: ${base}.`);
      type = `${integer[1]}${width}`;
    } else if (bytes) {
      if (Number(bytes[1]) < 1 || Number(bytes[1]) > 32) throw new Error(`Invalid bytes type: ${base}.`);
    } else if (base === "function") {
      type = "function() external";
    } else if (!["address", "bool", "string", "bytes"].includes(base)) {
      throw new Error(`Unsupported ABI type: ${base}.`);
    }
    return { type: type + suffix, reference: !!suffix || base === "string" || base === "bytes" };
  }

  function parameters(params: readonly JsonFragmentType[] = [], location?: "calldata" | "memory", event = false) {
    const names = new Set<string>();
    return params.map((param, index) => {
      const { type, reference } = typeOf(param);
      const name = param.name ? uniqueName(safeName(param.name, `param${index}`), names) : "";
      return [type, reference && location, event && param.indexed && "indexed", name].filter(Boolean).join(" ");
    }).join(", ");
  }

  const members: string[] = [];
  const seen = new Set<string>();
  function canonicalType(param: JsonFragmentType, depth = 0): string {
    if (depth > 64) throw new Error("ABI tuple nesting is too deep.");
    if (param.type?.startsWith("tuple")) {
      return `(${(param.components || []).map((component) => canonicalType(component, depth + 1)).join(",")})${param.type.slice(5)}`;
    }
    return (param.type || "").replace(/^(u?int)(?=\[|$)/, (_, base) => `${base}256`);
  }
  let hasConstructor = false;
  for (const item of abi) {
    if (item.type === "constructor") { hasConstructor = true; continue; }
    if (item.type === "receive" || item.type === "fallback") {
      const declaration = `    ${item.type}() external${item.type === "receive" || item.stateMutability === "payable" || item.payable ? " payable" : ""};`;
      if (!seen.has(declaration)) members.push(declaration);
      seen.add(declaration);
      continue;
    }
    if (!["function", "event", "error"].includes(item.type || "")) continue;
    if (!item.name || !identifier(item.name)) {
      throw new Error(`Cannot generate a Solidity declaration for ABI name "${item.name || "unnamed"}".`);
    }
    const signature = `${item.type}:${item.name}(${(item.inputs || []).map((param) => canonicalType(param)).join(",")})`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    const inputs = parameters(item.inputs, item.type === "function" ? "calldata" : undefined, item.type === "event");
    let declaration: string;
    if (item.type === "function") {
      const mutability = item.stateMutability || (item.constant ? "view" : item.payable ? "payable" : "nonpayable");
      if (!["view", "pure", "payable", "nonpayable"].includes(mutability)) throw new Error("Invalid function mutability.");
      const outputs = parameters(item.outputs, "memory");
      declaration = `    function ${item.name}(${inputs}) external${mutability === "nonpayable" ? "" : ` ${mutability}`}${outputs ? ` returns (${outputs})` : ""};`;
    } else {
      declaration = `    ${item.type} ${item.name}(${inputs})${item.type === "event" && item.anonymous ? " anonymous" : ""};`;
    }
    members.push(declaration);
  }

  return [
    "// SPDX-License-Identifier: UNLICENSED",
    "pragma solidity ^0.8.20;",
    "",
    "// Generated from ABI. Original implementation and source-only types are not included.",
    ...(hasConstructor ? ["// Constructors are omitted because interfaces cannot declare them."] : []),
    `interface ${interfaceName} {`,
    [...declarations, ...members].join("\n\n"),
    "}",
    "",
  ].join("\n");
}
