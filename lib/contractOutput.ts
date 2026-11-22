import type { JsonFragmentType } from "ethers";
import type { Arg } from "@/types";

// viem returns named tuples as objects and unnamed tuples as positional arrays.
export function contractOutputArg(output: JsonFragmentType, value: any): Arg {
  const type = output.type ?? "";
  const array = type.match(/^(.*)\[\d*\]$/);
  const baseType = array ? "array" : type;
  let decoded = value;
  if (value != null && array) {
    decoded = value.map((item: any) =>
      contractOutputArg({ ...output, name: "", type: array[1] }, item)
    );
  } else if (value != null && type === "tuple" && output.components) {
    decoded = output.components.map((component, index) =>
      contractOutputArg(
        component,
        Array.isArray(value) ? value[index] : value[component.name ?? index]
      )
    );
  }
  return {
    name: output.name ?? "",
    type,
    baseType,
    rawValue: value,
    value: decoded,
  };
}
