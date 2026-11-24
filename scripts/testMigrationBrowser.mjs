// Isolated Chrome check: exercise real Next redirects, intercept only target HTML.
// No live ETH.sh requests or signed-in browser profiles are used.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { getMigrationRedirect } = require("../lib/migration/redirect.js");
const origin = new URL(
  process.env.MIGRATION_TEST_ORIGIN || "http://127.0.0.1:3222"
);
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+\/$/.test(origin.href))
  throw Error("Local test server required");
const profile = await mkdtemp(join(tmpdir(), "swiss-migration-chrome-"));
const chrome = spawn(
  process.env.MIGRATION_CHROME_BINARY ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-proxy-server",
    "--host-resolver-rules=MAP *.swiss-knife.xyz 127.0.0.1, MAP swiss-knife.xyz 127.0.0.1",
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0",
    "about:blank",
  ],
  { stdio: "ignore" }
);
let launchError;
chrome.on("error", (error) => {
  launchError = error;
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    if (launchError) throw launchError;
    try {
      port = (
        await readFile(join(profile, "DevToolsActivePort"), "utf8")
      ).split("\n")[0];
      break;
    } catch {
      await wait(100);
    }
  }
  if (!port) throw Error("Chrome did not start");
  const tab = await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: "PUT",
    })
  ).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(timer);
      message.error
        ? reject(Error(message.error.message))
        : resolve(message.result);
    }
    if (message.method === "Fetch.requestPaused") {
      call("Fetch.fulfillRequest", {
        requestId: message.params.requestId,
        responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "text/html" }],
        body: Buffer.from(
          "<!doctype html><title>Migration target fixture</title><p>Redirect target</p>"
        ).toString("base64"),
      }).catch((error) => {
        launchError = error;
      });
    }
  });
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error(`CDP timeout: ${method}`));
      }, 20000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Fetch.enable", {
    patterns: [
      { urlPattern: "https://eth.sh/*" },
      { urlPattern: "https://*.eth.sh/*" },
    ],
  });
  const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const cases = [
    ["contract-address", "/?salt=0x1234#keep"],
    ["7702beat", "/#tools"],
    ["7702beat", "/#wall-of-shame"],
    ["wallet", "/signatures#sign?messageToSign=hello%20world"],
    [
      "wallet",
      "/signatures/view?payload=a%2Bb%3D%3D#payload=b%2Bc%3D%3D&returnParams=x%3D1",
    ],
    [
      "transact",
      "/send-tx?to=alice.eth&calldata=0x1234&eth=0.01&chainId=8453#review",
    ],
    ["explorer", `/address/${address}?chainId=8453#read`],
  ];
  for (const [tool, path] of cases) {
    const old = new URL(`http://${tool}.swiss-knife.xyz:${origin.port}${path}`);
    const expected = new URL(getMigrationRedirect(old.href, { enabled: true }));
    expected.hash = old.hash;
    await call("Page.navigate", { url: old.href });
    let actual;
    for (let i = 0; i < 100; i++) {
      if (launchError) throw launchError;
      const result = await call("Runtime.evaluate", {
        expression: "location.href",
        returnByValue: true,
      });
      actual = result.result.value;
      if (actual === expected.href) break;
      await wait(100);
    }
    if (actual !== expected.href)
      throw Error(`Redirect mismatch: ${actual}; expected ${expected.href}`);
    console.log(`PASS ${tool}${path}`);
  }
  console.log(
    `${cases.length} real-browser redirect checks passed, including fragment inheritance.`
  );
} finally {
  socket?.close();
  chrome.kill("SIGTERM");
  await wait(700);
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 4,
    retryDelay: 300,
  });
}
