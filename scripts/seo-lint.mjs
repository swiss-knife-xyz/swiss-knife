import { ESLint } from "eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Next 16 removed `next lint`; evaluate the installed flat config without
// changing the repository's legacy lint setup or grandfathering new errors.
const legacy = JSON.parse(readFileSync(".eslintrc.json", "utf8"));
const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    ...nextVitals,
    { rules: legacy.rules },
    ...legacy.overrides.map(({ files, rules }) => ({ files, rules })),
  ],
});
// Default: lint the working copy of the staged/unstaged/untracked union.
// --staged: lint only index blobs, including files missing from the worktree.
// NUL-delimited discovery preserves spaces, quotes and newlines in paths.
const staged = process.argv.slice(2).includes("--staged");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const files = [...new Set([
  ...git("diff", "--cached", "--name-only", "-z", ...(staged ? ["--diff-filter=d"] : [])).split("\0"),
  ...(!staged ? [
    ...git("diff", "--name-only", "-z").split("\0"),
    ...git("ls-files", "--others", "--exclude-standard", "-z").split("\0"),
  ] : []),
])].filter((file) => /\.(tsx?|[cm]?js)$/.test(file) && (staged || existsSync(file)));
const diagnosticKey = (message) => JSON.stringify([message.ruleId,
  message.message.replace(/:\d+:\d+/g, ":LINE:COL").replace(/^(\s*>?\s*)\d+(\s*\|)/gm, "$1LINE$2"),
]);
let baselineErrors = 0;
let currentErrors = 0;
const introduced = [];
for (const file of files) {
  const source = staged ? git("show", `:${file}`) : readFileSync(file, "utf8");
  const [current] = await eslint.lintText(source, { filePath: file });
  let baseline = { messages: [] };
  try {
    const source = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    [baseline] = await eslint.lintText(source, { filePath: file });
  } catch { /* New files have no baseline. */ }
  const counts = new Map();
  for (const message of baseline.messages.filter((message) => message.severity === 2)) {
    const key = diagnosticKey(message);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    baselineErrors += 1;
  }
  for (const message of current.messages.filter((message) => message.severity === 2)) {
    currentErrors += 1;
    const key = diagnosticKey(message);
    if (counts.get(key)) counts.set(key, counts.get(key) - 1);
    else introduced.push({ file, line: message.line, rule: message.ruleId, message: message.message });
  }
}
console.log(JSON.stringify({ files: files.length, baselineErrors, currentErrors, introduced }, null, 2));
if (introduced.length) process.exitCode = 1;
