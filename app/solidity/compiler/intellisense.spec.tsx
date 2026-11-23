// @vitest-environment node
import { expect, it } from "vitest";
import { SolidityLanguageService } from "@/lib/solidity/language-service";
import type { SolidityFile } from "@/lib/solidity/workspace";
const file = (name: string, content: string) => ({ id: name, name, content });
const base = file(
  "lib/Base.sol",
  `contract Base {uint256 public supply; uint256 private secret; function shared(uint256 amount) internal {} function hidden() private {} function send(address to,uint256 amount) public {} }`
);
const other = file(
  "Unrelated.sol",
  "contract Unrelated {uint secret; function unrelated() public {uint leaked;}} "
);
function run(
  code: string,
  kind: "completion" | "hover" | "signature" | "definition" = "completion",
  files: SolidityFile[] = []
) {
  const offset = code.indexOf("|");
  const content = code.replace("|", "");
  const service = new SolidityLanguageService();
  service.setFiles([file("src/Main.sol", content), base, other, ...files]);
  return service.query({ path: "src/Main.sol", content, offset, kind });
}
const names = (result: ReturnType<typeof run>) =>
  result.items.map((item) => item.name);
it("offers Solidity keywords, sized types, builtins and snippets before compilation", () => {
  const result = run("contract Main { fun| }");
  expect(names(result)).toEqual(
    expect.arrayContaining(["function", "uint256", "bytes32", "require"])
  );
  expect(
    result.items.find(
      (item) => item.name === "function" && item.kind === "Snippet"
    )?.insertText
  ).toContain("${1:name}");
});
it("completes builtin members while typing an incomplete expression", () => {
  expect(names(run("contract Main {function f() public {msg.|}}"))).toEqual([
    "sender",
    "value",
    "data",
    "sig",
  ]);
  expect(
    names(run("contract Main {function f() public {block.t|}}"))
  ).toContain("timestamp");
  expect(names(run("contract Main {function f() public {abi.|}}"))).toContain(
    "encodeCall"
  );
});
it("keeps parameters, block locals and state in scope without leaking other functions or files", () => {
  const result = run(
    "contract Main {uint256 total; function first(uint256 amount) public {uint256 before; {uint256 inner;} | uint256 after;} function second() public {uint256 elsewhere;}}"
  );
  expect(names(result)).toEqual(
    expect.arrayContaining(["total", "amount", "before", "first"])
  );
  for (const absent of [
    "inner",
    "after",
    "elsewhere",
    "secret",
    "leaked",
    "Unrelated",
  ])
    expect(names(result)).not.toContain(absent);
});
it("supports imported aliases, inherited members and external contract methods", () => {
  const result = run(
    'import {Base as Parent} from "../lib/Base.sol"; contract Main is Parent {function f() public { | }}'
  );
  expect(names(result)).toEqual(
    expect.arrayContaining(["Parent", "shared", "supply"])
  );
  expect(names(result)).not.toContain("secret");
  expect(names(result)).not.toContain("hidden");
  const methods = run(
    'import {Base as Parent} from "../lib/Base.sol"; contract Main {function f(Parent target) public {target.|}}'
  );
  expect(names(methods)).toContain("send");
  expect(names(methods)).not.toContain("shared");
});
it("supports namespace imports and local struct fields", () => {
  expect(
    names(
      run(
        'import * as Types from "../lib/Base.sol"; contract Main {function f() public {Types.|}}'
      )
    )
  ).toContain("Base");
  expect(
    names(
      run(
        "contract Main {struct Position {uint256 amount; address owner;} function f(Position memory position) public {position.|}}"
      )
    )
  ).toEqual(["amount", "owner"]);
});
it("offers only storage array mutations and payable address transfers", () => {
  expect(
    names(run("contract Main {uint256[] items; function f() public {items.|}}"))
  ).toEqual(expect.arrayContaining(["length", "push", "pop"]));
  expect(
    names(
      run("contract Main {function f(uint256[] memory items) public {items.|}}")
    )
  ).toEqual(["length"]);
  expect(
    names(
      run(
        "contract Main {function f(address payable recipient) public {recipient.|}}"
      )
    )
  ).toContain("transfer");
  expect(
    names(
      run("contract Main {function f(address recipient) public {recipient.|}}")
    )
  ).not.toContain("transfer");
});
it("suggests import paths and suppresses suggestions inside comments and ordinary strings", () => {
  const result = run('import "../l|"; contract Main {}');
  expect(names(result)).toContain("../lib/Base.sol");
  expect(result.importRange).toEqual([8, 12]);
  expect(run("contract Main { // msg.|\n}").items).toEqual([]);
  expect(run('contract Main { string s = "msg.|"; }').items).toEqual([]);
  expect(run('// import "../l|";\ncontract Main {}').items).toEqual([]);
});
it("provides member hover details and correct signature parameter hints with nested arguments", () => {
  expect(
    run("contract Main {uint256 to|tal;}", "hover").items[0]
  ).toMatchObject({ name: "total", kind: "Field" });
  expect(
    run(
      "contract Main {function f() public {address a = msg.sen|der;}}",
      "hover"
    ).items[0]
  ).toMatchObject({ name: "sender", detail: "address" });
  const hint = run(
    'import "../lib/Base.sol"; contract Main is Base {function f() public {send(address(0), |);}}',
    "signature"
  );
  expect(hint.items[0].parameters).toEqual(["address to", "uint256 amount"]);
  expect(hint.activeParameter).toBe(1);
});
it("navigates to imported definitions and refreshes renamed, edited and removed files", () => {
  const result = run(
    'import {Base as Parent} from "../lib/Base.sol"; contract Main is Par|ent {}',
    "definition"
  );
  expect(result.items[0]).toMatchObject({
    fileId: base.id,
    path: base.name,
    offset: 0,
  });
  const service = new SolidityLanguageService();
  const content =
    'import "../lib/Base.sol"; contract Main is Base {function f() public { | }}'.replace(
      "|",
      ""
    );
  const main = file("src/Main.sol", content);
  const query = {
    path: main.name,
    content,
    offset: content.indexOf(" {  ") + 4,
    kind: "completion" as const,
  };
  // Pick a stable point within f's body.
  query.offset = content.lastIndexOf("}") - 2;
  service.setFiles([main, base]);
  expect(names(service.query(query))).toContain("shared");
  service.setFiles([
    main,
    { ...base, content: base.content.replace("shared", "updated") },
  ]);
  expect(names(service.query(query))).toContain("updated");
  expect(names(service.query(query))).not.toContain("shared");
  service.setFiles([main]);
  expect(names(service.query(query))).not.toContain("updated");
});

it("offers generated public getters and imported namespace identifiers", () => {
  const result = run(
    'import "../lib/Base.sol"; contract Main {function f(Base target) public {target.|}}'
  );
  expect(result.items.find((item) => item.name === "supply")).toMatchObject({
    kind: "Function",
    parameters: [],
  });
  expect(
    names(
      run(
        'import * as Types from "../lib/Base.sol"; contract Main {function f() public {Ty|}}'
      )
    )
  ).toContain("Types");
});
