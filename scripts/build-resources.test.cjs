const { test } = require("node:test");
const assert = require("node:assert/strict");
const config = require("../next.config.js");

test("production webpack compilation opts into documented bounded-memory mode", () => {
  assert.equal(config.experimental?.webpackMemoryOptimizations, true);
  assert.equal(config.experimental?.webpackBuildWorker, true);
  assert.equal(config.experimental?.cpus, 1);
  assert.notEqual(config.typescript?.ignoreBuildErrors, true);
});
