export type LanguageItem = {
  name: string;
  kind:
    | "Keyword"
    | "Snippet"
    | "Function"
    | "Variable"
    | "Field"
    | "Class"
    | "Struct"
    | "Enum"
    | "EnumMember"
    | "Event"
    | "Module"
    | "Constant";
  detail: string;
  documentation?: string;
  parameters?: string[];
  insertText?: string;
  fileId?: string;
  path?: string;
  offset?: number;
};
const field = (
  name: string,
  detail: string,
  documentation?: string
): LanguageItem => ({ name, kind: "Field", detail, documentation });
const fn = (
  name: string,
  parameters: string[],
  returns = "",
  documentation?: string
): LanguageItem => ({
  name,
  kind: "Function",
  parameters,
  detail: `${name}(${parameters.join(", ")})${returns ? ` returns (${returns})` : ""}`,
  documentation,
});
export const MEMBERS: Record<string, LanguageItem[]> = {
  msg: [
    field("sender", "address", "Sender of the current call."),
    field("value", "uint256", "Wei sent with the current call."),
    field("data", "bytes calldata", "Complete call data."),
    field("sig", "bytes4", "The first four bytes of the call data."),
  ],
  block: [
    field("number", "uint256"),
    field("timestamp", "uint256", "Current block timestamp in Unix seconds."),
    field("chainid", "uint256"),
    field("basefee", "uint256"),
    field("blobbasefee", "uint256"),
    field("coinbase", "address payable"),
    field("gaslimit", "uint256"),
    field("prevrandao", "uint256"),
  ],
  tx: [
    field("gasprice", "uint256"),
    field(
      "origin",
      "address",
      "Original transaction sender. Avoid using tx.origin for authorization."
    ),
  ],
  abi: [
    fn("encode", ["values"], "bytes"),
    fn(
      "encodePacked",
      ["values"],
      "bytes",
      "Packed encoding. Multiple dynamic values can create ambiguous encodings."
    ),
    fn("encodeWithSelector", ["bytes4 selector", "values"], "bytes"),
    fn("encodeWithSignature", ["string signature", "values"], "bytes"),
    fn("encodeCall", ["function functionPointer", "tuple arguments"], "bytes"),
    fn("decode", ["bytes data", "types"], "values"),
  ],
  address: [
    field("balance", "uint256"),
    field("code", "bytes memory"),
    field("codehash", "bytes32"),
    fn("call", ["bytes data"], "bool success, bytes memory result"),
    fn("staticcall", ["bytes data"], "bool success, bytes memory result"),
    fn("delegatecall", ["bytes data"], "bool success, bytes memory result"),
  ],
  payable: [
    fn("transfer", ["uint256 amount"]),
    fn("send", ["uint256 amount"], "bool"),
  ],
  array: [field("length", "uint256")],
  storageArray: [fn("push", ["value"]), fn("pop", [])],
};
export const GLOBALS: LanguageItem[] = [
  ...["msg", "block", "tx", "abi"].map(
    (name): LanguageItem => ({
      name,
      kind: "Module",
      detail: `Solidity ${name} namespace`,
    })
  ),
  fn("require", ["bool condition", "string reason"]),
  fn("assert", ["bool condition"]),
  fn("revert", ["string reason"]),
  fn("keccak256", ["bytes data"], "bytes32"),
  fn("sha256", ["bytes data"], "bytes32"),
  fn("ripemd160", ["bytes data"], "bytes20"),
  fn(
    "ecrecover",
    ["bytes32 hash", "uint8 v", "bytes32 r", "bytes32 s"],
    "address"
  ),
  fn("gasleft", [], "uint256"),
  fn("blockhash", ["uint256 blockNumber"], "bytes32"),
  fn("blobhash", ["uint256 index"], "bytes32"),
  fn("addmod", ["uint256 x", "uint256 y", "uint256 modulus"], "uint256"),
  fn("mulmod", ["uint256 x", "uint256 y", "uint256 modulus"], "uint256"),
  ..."pragma solidity import contract interface library abstract function constructor modifier event error struct enum mapping using is public private internal external view pure payable virtual override returns return emit memory storage calldata constant immutable transient if else for while do break continue unchecked try catch assembly new delete this super true false wei gwei ether seconds minutes hours days weeks address bool string bytes uint int"
    .split(" ")
    .concat(
      Array.from({ length: 32 }, (_, i) => `uint${(i + 1) * 8}`),
      Array.from({ length: 32 }, (_, i) => `int${(i + 1) * 8}`),
      Array.from({ length: 32 }, (_, i) => `bytes${i + 1}`)
    )
    .map(
      (name): LanguageItem => ({
        name,
        kind: "Keyword",
        detail: "Solidity keyword / type",
      })
    ),
  {
    name: "function",
    kind: "Snippet",
    detail: "Function declaration",
    insertText:
      "function ${1:name}(${2:parameters}) ${3:public} ${4:returns (uint256)} {\n\t${0}\n}",
  },
  {
    name: "constructor",
    kind: "Snippet",
    detail: "Constructor declaration",
    insertText: "constructor(${1:parameters}) {\n\t${0}\n}",
  },
  {
    name: "contract",
    kind: "Snippet",
    detail: "Contract declaration",
    insertText: "contract ${1:Name} {\n\t${0}\n}",
  },
  {
    name: "event",
    kind: "Snippet",
    detail: "Event declaration",
    insertText: "event ${1:Name}(${2:address indexed account});",
  },
  {
    name: "error",
    kind: "Snippet",
    detail: "Custom error declaration",
    insertText: "error ${1:Name}(${2:parameters});",
  },
  {
    name: "modifier",
    kind: "Snippet",
    detail: "Modifier declaration",
    insertText: "modifier ${1:name}() {\n\t${2}\n\t_;\n}",
  },
  {
    name: "if",
    kind: "Snippet",
    detail: "If statement",
    insertText: "if (${1:condition}) {\n\t${0}\n}",
  },
  {
    name: "for",
    kind: "Snippet",
    detail: "For loop",
    insertText:
      "for (uint256 ${1:i} = 0; ${1:i} < ${2:length}; ++${1:i}) {\n\t${0}\n}",
  },
];
