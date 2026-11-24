import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./seo-lint.mjs", import.meta.url));
const clean = "export const value = 1;\n";
const invalid = "export const value = http();\n";
function fixture(t) {
  const scratch = fileURLToPath(new URL(".hermes/cache/scratch/", `file://${process.env.HOME}/`));
  mkdirSync(scratch, { recursive: true });
  const cwd = mkdtempSync(join(scratch, "seo-lint-"));
  symlinkSync(fileURLToPath(new URL("../node_modules", import.meta.url)), join(cwd, "node_modules"), "dir");
  mkdirSync(join(cwd, "pages"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" });
  const write = (name, source) => writeFileSync(join(cwd, name), source);
  git("init", "-q");
  write(".eslintrc.json", JSON.stringify({ rules: {
    "no-restricted-syntax": ["error", { selector: "CallExpression[callee.name='http']", message: "Forbidden http call" }],
  }, overrides: [] }));
  write(".gitignore", "node_modules\n");
  write("source.js", clean);
  git("add", ".");
  git("-c", "user.name=Lint Test", "-c", "user.email=lint@example.invalid", "commit", "-qm", "baseline");
  const lint = (...args) => {
    const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
    assert.ok(result.status === 0 || result.status === 1, result.stderr);
    assert.ok(result.stdout.startsWith("{"), result.stderr);
    return { status: result.status, ...JSON.parse(result.stdout) };
  };
  return { git, write, lint, cwd };
}

test("default discovers staged-only source changes", (t) => {
  const { git, write, lint } = fixture(t);
  write("source.js", invalid);
  git("add", "source.js");
  const result = lint();
  assert.equal(result.files, 1);
  assert.equal(result.baselineErrors, 0, JSON.stringify(result));
  assert.equal(result.currentErrors, 1);
  assert.equal(result.introduced.length, 1);
  assert.equal(result.status, 1);
});

test("staged mode evaluates index content and excludes unstaged/untracked paths", (t) => {
  const { git, write, lint } = fixture(t);
  write("source.js", invalid);
  git("add", "source.js");
  write("source.js", clean);
  write("untracked.js", invalid);
  const staged = lint("--staged");
  assert.equal(staged.files, 1);
  assert.equal(staged.currentErrors, 1);
  assert.equal(staged.introduced.length, 1);
  assert.equal(staged.status, 1);
  const working = lint();
  assert.equal(working.files, 2);
  assert.equal(working.currentErrors, 1);
  assert.equal(working.introduced[0].file, "untracked.js");
});

test("deleted paths are skipped in the selected snapshot", (t) => {
  const { git, write, lint, cwd } = fixture(t);
  git("rm", "source.js");
  assert.equal(lint("--staged").files, 0);
  assert.equal(lint().files, 0);
  write("source.js", invalid);
  // A staged deletion recreated in the worktree is linted only in default mode.
  assert.equal(lint("--staged").files, 0);
  assert.equal(lint().introduced.length, 1);
  write("added.js", invalid);
  git("add", "added.js");
  rmSync(join(cwd, "added.js"));
  assert.equal(lint("--staged").introduced.length, 1);
  assert.equal(lint().files, 1);
});

test("default unions staged, unstaged and untracked paths without duplicates", (t) => {
  const { git, write, lint } = fixture(t);
  write("unstaged.js", clean);
  git("add", "unstaged.js");
  git("-c", "user.name=Lint Test", "-c", "user.email=lint@example.invalid", "commit", "-qm", "second baseline");
  write("source.js", "export const value = 2;\n");
  git("add", "source.js");
  write("source.js", invalid);
  write("unstaged.js", invalid);
  const unusual = "odd \"name\nfile.js";
  write(unusual, invalid);
  const staged = lint("--staged");
  assert.equal(staged.files, 1);
  assert.equal(staged.currentErrors, 0);
  assert.equal(staged.status, 0);
  const working = lint();
  assert.equal(working.files, 3);
  assert.equal(working.introduced.length, 3);
  assert.ok(working.introduced.some(({ file }) => file === unusual));
});

test("existing errors remain baseline-aware but extra occurrences fail", (t) => {
  const { git, write, lint } = fixture(t);
  write("source.js", invalid);
  git("add", "source.js");
  git("-c", "user.name=Lint Test", "-c", "user.email=lint@example.invalid", "commit", "-qm", "legacy lint error");
  write("source.js", `${invalid}\nexport const other = 2;\n`);
  git("add", "source.js");
  const unchanged = lint("--staged");
  assert.equal(unchanged.baselineErrors, 1);
  assert.equal(unchanged.currentErrors, 1);
  assert.equal(unchanged.status, 0);
  write("source.js", `${invalid}\nexport const other = http();\n`);
  git("add", "source.js");
  const extra = lint("--staged");
  assert.equal(extra.baselineErrors, 1);
  assert.equal(extra.currentErrors, 2);
  assert.equal(extra.introduced.length, 1);
  assert.equal(extra.status, 1);
});
