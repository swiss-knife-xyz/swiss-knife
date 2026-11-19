const assert = require("node:assert/strict");
const { test, afterEach } = require("node:test");
const checkPhoneLayout = require("./checkPhoneLayout.cjs");

const rect = (left, right) => ({
  left,
  right,
  width: right - left,
  height: 40,
});
function mount({
  controlRect = rect(16, 304),
  ancestor = null,
  documentWidth = 320,
  controls = true,
} = {}) {
  global.window = { innerWidth: 320 };
  const control = {
    tagName: "INPUT",
    textContent: "",
    parentElement: ancestor,
    getBoundingClientRect: () => controlRect,
    getAttribute: (name) =>
      name === "placeholder" ? "Contract Address" : null,
    closest: () => null,
  };
  global.document = {
    documentElement: { scrollWidth: documentWidth },
    querySelectorAll: (selector) =>
      selector === "div" ? [] : controls ? [control] : [],
  };
  global.getComputedStyle = (element) => ({
    visibility: "visible",
    overflowX: "visible",
    ...element.style,
  });
}
afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.getComputedStyle;
});

test("accepts controls fitting the phone viewport", () => {
  mount();
  assert.deepEqual(checkPhoneLayout(), {
    width: 320,
    documentWidth: 320,
    controls: 1,
  });
});
test("rejects internal horizontal control clipping even when document width fits", () => {
  mount({ controlRect: rect(16, 775) });
  assert.throws(checkPhoneLayout, /Contract Address: horizontal bounds/);
});
test("rejects a blank page rather than reporting false success", () => {
  mount({ controls: false });
  assert.throws(checkPhoneLayout, /No visible controls/);
});
test("rejects page-level overflow", () => {
  mount({ documentWidth: 832 });
  assert.throws(checkPhoneLayout, /Document overflows/);
});
test("rejects controls clipped by a narrower scroll ancestor", () => {
  mount({
    ancestor: {
      parentElement: null,
      clientWidth: 160,
      getBoundingClientRect: () => rect(16, 176),
      style: { overflowX: "hidden" },
    },
  });
  assert.throws(checkPhoneLayout, /Contract Address: clipped by ancestor/);
});
