import { JsonFragmentType } from "ethers";

/**
 * Recursively converts string boolean values ("true"/"false") to actual booleans
 * for Solidity `bool` types. Handles nested types: bool[], bool[N], tuples with
 * bool components, and any combination thereof.
 *
 * This is needed because input components store booleans as strings,
 * but viem's encoding functions require actual boolean values.
 */
export const convertBooleans = (
  value: any,
  input: JsonFragmentType
): any => {
  if (value === undefined || value === null) return value;

  const type = input.type;
  if (!type) return value;

  if (type === "bool") {
    return value === "true" || value === true;
  }

  // Array types: bool[], bool[3], tuple[], tuple[][3], etc.
  const arrayMatch = type.match(/^(.+)\[\d*\]$/);
  if (arrayMatch && Array.isArray(value)) {
    const baseType = arrayMatch[1];
    return value.map((item: any) =>
      convertBooleans(item, { ...input, type: baseType })
    );
  }

  // Tuple types
  if (type === "tuple" && input.components && Array.isArray(value)) {
    return value.map((item: any, i: number) =>
      convertBooleans(item, input.components![i])
    );
  }

  return value;
};

/**
 * Prepares function arguments by converting boolean strings to actual booleans.
 * Maps over all inputs and applies convertBooleans to each.
 */
export const prepareArgs = (
  inputs: readonly JsonFragmentType[] | undefined,
  inputsState: { [key: number]: any }
): any[] | undefined => {
  return inputs?.map((input, i) => convertBooleans(inputsState[i], input));
};
