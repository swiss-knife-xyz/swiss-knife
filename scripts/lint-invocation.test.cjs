const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test("lint uses installed ESLint with the existing repository restrictions", async () => {
  const pkg = require("../package.json");
  assert.equal(pkg.scripts.lint, "eslint .");
  const { default: config } = await import(
    pathToFileURL(path.resolve(__dirname, "../eslint.config.mjs")).href
  );
  const legacy = require("../.eslintrc.json");
  assert.ok(Array.isArray(config));
  assert.ok(config.length > 2);
  assert.ok(
    config.some(
      (item) => JSON.stringify(item.rules) === JSON.stringify(legacy.rules)
    )
  );
  for (const override of legacy.overrides) {
    assert.ok(
      config.some(
        (item) =>
          JSON.stringify(item.files) === JSON.stringify(override.files) &&
          JSON.stringify(item.rules) === JSON.stringify(override.rules)
      )
    );
  }
});
