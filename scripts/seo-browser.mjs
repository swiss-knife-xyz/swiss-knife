import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

// An isolated Chrome process/profile, never the shared or signed-in browser.
// CDP uses wall-clock polling: compiler workers can stall virtual-time CLI dumps.
const args = process.argv.slice(2);
const output = args[args.indexOf("--output") + 1];
if (!args.includes("--output") || !output) throw new Error("--output is required");
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:3212";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error("Localhost only");
const profile = await mkdtemp("/Users/apoorvlathey/.hermes/cache/scratch/eth-seo-cdp-");
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless", "--disable-gpu", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], { stdio: "ignore", detached: true });
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const records = [];
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; } catch { await wait(100); }
  }
  if (!port) throw new Error("Chrome failed to start");
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  let errors = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown") {
      const detail = message.params.exceptionDetails;
      const description = (detail.exception?.description ?? detail.text).split("\n")[0].replace(/https?:\/\/[^\s)]+/g, (url) => { try { return new URL(url).origin; } catch { return "[URL]"; } });
      errors.push({ description, frames: detail.stackTrace?.callFrames?.slice(0, 6).map((frame) => frame.functionName) ?? [] });
    }
    if (!pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id); clearTimeout(timer);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  await call("Page.enable"); await call("Runtime.enable");
  const paths = ["/contract", "/determine-address", "/solidity/compiler", "/usdc-pay", "/orgs", "/calldata/decoder", "/calldata/encoder", "/uniswap/tick-to-price"];
  const selected = args.includes("--paths") ? args[args.indexOf("--paths") + 1].split(",") : paths;
  if (!selected.every((path) => paths.includes(path))) throw new Error("Unsupported smoke-check path");
  for (const path of selected) {
    errors = [];
    await call("Page.navigate", { url: base + path });
    let state = {};
    for (let attempt = 0; attempt < 75; attempt++) {
      await wait(200);
      const result = await call("Runtime.evaluate", { returnByValue: true, expression: `JSON.stringify({h1:[...document.querySelectorAll('h1')].filter(el=>el.getClientRects().length).map(el=>el.textContent.trim()), links:document.querySelectorAll('a[href]').length, loading:document.body?.innerText.includes('Loading interactive tool')??true, ready:document.readyState, reactRoot:Object.keys(document).some(key=>key.startsWith('__reactContainer$'))})` });
      state = JSON.parse(result.result.value ?? "{}");
      if (attempt >= 9 && state.h1?.length === 1 && !state.loading && state.reactRoot) break;
    }
    const record = { path, ...state, pageErrors: errors, passed: state.h1?.length === 1 && state.links > 0 && !state.loading && state.reactRoot && errors.length === 0 };
    records.push(record); console.log(JSON.stringify(record));
    await writeFile(output, JSON.stringify(records, null, 2) + "\n");
  }
  if (!records.every((record) => record.passed)) process.exitCode = 1;
} finally {
  socket?.close();
  try { process.kill(-chrome.pid, "SIGTERM"); } catch { /* Already exited. */ }
  await wait(200);
  await rm(profile, { recursive: true, force: true });
}
