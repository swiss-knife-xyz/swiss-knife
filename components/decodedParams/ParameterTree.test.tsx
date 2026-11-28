import assert from "node:assert/strict";
import { test } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { Arg } from "@/types";

window.scrollTo = () => {};
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }),
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const modules = Promise.all([
  import("@chakra-ui/react"),
  import("./CalldataTree"),
]);

const leaf: Arg = {
  name: "message",
  type: "string",
  baseType: "string",
  value: "hello",
  rawValue: "hello",
};
const tuple: Arg = {
  name: "record",
  type: "tuple",
  baseType: "tuple",
  value: [leaf],
  rawValue: ["hello"],
};

async function mount(arg: Arg) {
  const [{ ChakraProvider }, { CalldataTree }] = await modules;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<ChakraProvider><CalldataTree args={[arg]} showControls={false} /></ChakraProvider>);
  });
  return {
    container,
    async cleanup() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

function disclosure(container: HTMLElement) {
  return container.querySelector<HTMLButtonElement>(
    "button[aria-controls][aria-expanded]"
  );
}

test("standalone decoded tuple uses an accessible tree branch and retains child state", async () => {
  const ui = await mount(tuple);
  try {
    const button = ui.container.querySelector<HTMLElement>('[role="button"][aria-label="record"]')!;
    assert.ok(button);
    assert.equal(button.getAttribute("aria-expanded"), "true");
    const input = ui.container.querySelector("input")!;
    assert.equal(input.value, "hello");
    assert.equal(input.readOnly, true);
    assert.equal(getComputedStyle(input).caretColor, "rgba(0, 0, 0, 0)");
    input.focus();
    input.setSelectionRange(0, input.value.length);
    assert.equal(input.value.slice(input.selectionStart!, input.selectionEnd!), "hello");
    await act(async () => button.click());
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.ok(ui.container.querySelector("input")!.closest("[hidden]"));
    await act(async () => button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.equal(ui.container.querySelector("input")!.closest("[hidden]"), null);
    assert.equal(ui.container.querySelector("input")!.value, "hello");
  } finally {
    await ui.cleanup();
  }
});

test("tuple array items and nested tuples use shared tree branches", async () => {
  const nested = { ...tuple, name: "nested" };
  const item = { ...tuple, value: [leaf, nested] };
  const ui = await mount({
    name: "records",
    type: "tuple[]",
    baseType: "array",
    value: [item],
    rawValue: [["hello", ["hello"]]],
  });
  try {
    const arrayToggle = ui.container.querySelector<HTMLElement>('[role="button"][aria-label="records"]')!;
    const nestedToggle = ui.container.querySelector<HTMLElement>('[role="button"][aria-label="nested"]')!;
    assert.ok(arrayToggle);
    assert.ok(nestedToggle);
    assert.equal(arrayToggle.getAttribute("aria-expanded"), "true");
    assert.equal(disclosure(ui.container), null, "no legacy tuple disclosure inside the tree");
    await act(async () => nestedToggle.click());
    assert.equal(nestedToggle.getAttribute("aria-expanded"), "false");
    await act(async () => arrayToggle.click());
    await act(async () => arrayToggle.click());
    assert.ok(ui.container.contains(nestedToggle));
    assert.equal(nestedToggle.getAttribute("aria-expanded"), "false", "array toggle retains nested state");
  } finally {
    await ui.cleanup();
  }
});

test("nested standalone tuples have unique controls and retain independent state", async () => {
  const ui = await mount({
    ...tuple,
    value: [tuple, { ...tuple, name: "other" }],
  });
  try {
    const buttons = Array.from(
      ui.container.querySelectorAll<HTMLButtonElement>(
        '[role="button"][aria-expanded]'
      )
    );
    assert.equal(buttons.length, 3);
    assert.equal(
      new Set(buttons.map((button) => button.closest("[data-calldata-branch]")?.getAttribute("data-calldata-branch")))
        .size,
      3
    );
    await act(async () => buttons[1].click());
    await act(async () => buttons[0].click());
    await act(async () => buttons[0].click());
    assert.equal(buttons[1].getAttribute("aria-expanded"), "false");
    assert.equal(buttons[2].getAttribute("aria-expanded"), "true");
  } finally {
    await ui.cleanup();
  }
});

test("primitive and empty arrays do not acquire tuple controls", async () => {
  for (const value of [[], [leaf]]) {
    const ui = await mount({
      name: "messages",
      type: "string[]",
      baseType: "array",
      value,
      rawValue: value.map((arg) => arg.rawValue),
    });
    try {
      assert.equal(disclosure(ui.container), null);
      const toggle = ui.container.querySelector<HTMLElement>('[role="button"][aria-label="messages"]')!;
      assert.ok(toggle);
      assert.equal(toggle.getAttribute("aria-expanded"), "true");
      if (value.length) {
        assert.equal(ui.container.querySelector("input")?.value, "hello");
      } else {
        assert.match(ui.container.textContent!, /0 items/);
        assert.match(ui.container.textContent!, /No items/);
      }
    } finally {
      await ui.cleanup();
    }
  }
});

test("empty tuples retain an explicit empty tree branch", async () => {
  const ui = await mount({ ...tuple, value: [] });
  try {
    assert.equal(disclosure(ui.container), null);
    assert.match(ui.container.textContent!, /0 fields/);
    assert.match(ui.container.textContent!, /No parameters/);
  } finally {
    await ui.cleanup();
  }
});

test("contract named tuple objects render their ABI fields instead of an empty tuple", async () => {
  const { contractOutputArg } = await import("@/lib/contractOutput");
  const { encodeAbiParameters, decodeAbiParameters } = await import("viem");
  const output = {
    name: "reserve",
    type: "tuple",
    components: [
      {
        name: "configuration",
        type: "tuple",
        components: [{ name: "data", type: "uint256" }],
      },
      { name: "liquidityIndex", type: "uint128" },
      { name: "active", type: "bool" },
    ],
  } as const;
  const [value] = decodeAbiParameters(
    [output],
    encodeAbiParameters(
      [output],
      [
        {
          configuration: { data: 42n },
          liquidityIndex: 100n,
          active: true,
        },
      ]
    )
  );
  const arg = contractOutputArg(output, value);
  const ui = await mount(arg);
  try {
    assert.equal(
      ui.container.querySelectorAll('[role="button"][aria-expanded]')
        .length,
      2
    );
    assert.match(ui.container.textContent!, /configuration/);
    assert.match(ui.container.textContent!, /liquidityIndex/);
    assert.deepEqual(
      Array.from(ui.container.querySelectorAll<HTMLInputElement>("input[readonly]")).map(
        (input) => input.value
      ),
      ["42", "100", "true"]
    );
  } finally {
    await ui.cleanup();
  }
});

test("contract output conversion preserves positional tuples and nested fixed arrays", async () => {
  const { contractOutputArg } = await import("@/lib/contractOutput");
  const arg = contractOutputArg(
    {
      type: "tuple[1][]",
      components: [
        { name: "message", type: "string" },
        { name: "counts", type: "uint256[2]" },
      ],
    },
    [[["hello", [1n, 2n]]]]
  );
  const item = (arg.value as Arg[])[0];
  assert.equal(item.baseType, "array");
  const tupleArg = (item.value as Arg[])[0];
  assert.equal(tupleArg.baseType, "tuple");
  const fields = tupleArg.value as Arg[];
  assert.equal(fields[0].value, "hello");
  assert.deepEqual(
    (fields[1].value as Arg[]).map((field) => field.value),
    [1n, 2n]
  );
  assert.equal(fields[1].baseType, "array");
});

test("multiple embedded parameter trees keep raw-byte disclosure targets unique", async () => {
  const [{ ChakraProvider }, { CalldataTree }] = await modules;
  const bytes: Arg = { name: "payload", type: "bytes", baseType: "bytes", rawValue: "0x12345678", value: { decoded: { functionName: "ping", signature: "ping()", rawArgs: [], args: [] } } };
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<ChakraProvider><CalldataTree args={[bytes]} showControls={false} /><CalldataTree args={[bytes]} showControls={false} /></ChakraProvider>); });
    const controls = [...container.querySelectorAll<HTMLButtonElement>('button[aria-controls]')];
    assert.equal(controls.length, 2);
    assert.notEqual(controls[0].getAttribute("aria-controls"), controls[1].getAttribute("aria-controls"));
    await act(async () => controls[0].click());
    assert.ok(document.getElementById(controls[0].getAttribute("aria-controls")!));
    assert.equal(document.getElementById(controls[1].getAttribute("aria-controls")!), null);
  } finally { await act(async () => root.unmount()); container.remove(); }
});
