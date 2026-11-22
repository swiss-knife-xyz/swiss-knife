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
  import("../renderParams"),
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
  const [{ ChakraProvider }, { renderParamTypes }] = await modules;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<ChakraProvider>{renderParamTypes(arg)}</ChakraProvider>);
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

test("standalone decoded tuple starts expanded and toggles a right/down disclosure", async () => {
  const ui = await mount(tuple);
  try {
    const button = disclosure(ui.container);
    assert.ok(button, "standalone tuple needs an accessible disclosure button");
    assert.equal(button.type, "button");
    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.match(button.getAttribute("aria-label")!, /collapse.*tuple/i);
    assert.ok(button.querySelector('svg[data-disclosure="down"]'));
    const content = document.getElementById(
      button.getAttribute("aria-controls")!
    )!;
    const input = content.querySelector("input");
    assert.ok(input);
    assert.equal(input.value, "hello");
    await act(async () => button.click());
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.equal(getComputedStyle(content).display, "none");
    assert.ok(button.querySelector('svg[data-disclosure="right"]'));
    await act(async () => button.click());
    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.notEqual(getComputedStyle(content).display, "none");
    assert.ok(
      content.querySelector("input") === input,
      "toggle must retain child DOM state"
    );
  } finally {
    await ui.cleanup();
  }
});

test("direct tuple array items have no redundant disclosure, but nested tuples do", async () => {
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
    // ArrayParam retains its existing collapsed default and independent control.
    const arrayToggle = Array.from(ui.container.querySelectorAll("p")).find(
      (p) => p.querySelector("svg")
    );
    assert.ok(arrayToggle);
    const arrayContent =
      ui.container.querySelector<HTMLElement>(".chakra-collapse")!;
    assert.equal(arrayContent.style.height, "0px");
    await act(async () => arrayToggle.click());
    const buttons = ui.container.querySelectorAll(
      "button[aria-expanded][aria-controls]"
    );
    assert.equal(
      buttons.length,
      1,
      "only the nested standalone tuple gets a disclosure"
    );
    assert.match(buttons[0].getAttribute("aria-label")!, /nested/);
    const nestedButton = buttons[0] as HTMLButtonElement;
    await act(async () => nestedButton.click());
    assert.equal(nestedButton.getAttribute("aria-expanded"), "false");
    await act(async () => arrayToggle.click());
    await act(async () => arrayToggle.click());
    assert.ok(
      ui.container.contains(nestedButton),
      "nested control remains mounted"
    );
    assert.equal(
      nestedButton.getAttribute("aria-expanded"),
      "false",
      "array toggle retains nested tuple state"
    );
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
        "button[aria-controls][aria-expanded]"
      )
    );
    assert.equal(buttons.length, 3);
    assert.equal(
      new Set(buttons.map((button) => button.getAttribute("aria-controls")))
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
      if (value.length) {
        const toggle = Array.from(ui.container.querySelectorAll("p")).find(
          (p) => p.querySelector("svg")
        );
        assert.ok(toggle);
        await act(async () => toggle.click());
        assert.equal(ui.container.querySelector("input")?.value, "hello");
      } else {
        assert.equal(ui.container.querySelector("input")?.value, "[ ]");
      }
    } finally {
      await ui.cleanup();
    }
  }
});

test("empty and fallback object tuples keep their existing representations", async () => {
  for (const value of [[], { message: "hello" }]) {
    const ui = await mount({ ...tuple, value: value as Arg["value"] });
    try {
      assert.equal(disclosure(ui.container), null);
      assert.equal(
        ui.container.querySelector("input")?.value,
        Array.isArray(value) ? "()" : "hello"
      );
    } finally {
      await ui.cleanup();
    }
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
      ui.container.querySelectorAll("button[aria-controls][aria-expanded]")
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
