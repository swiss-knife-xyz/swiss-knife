// Each compiler version gets its own worker and immutable binary cache entry.
// User source files remain in IndexedDB, separate from disposable downloads.
const filename =
  new URL(self.location.href).searchParams.get("version") ||
  "soljson-v0.8.30+commit.73712a01.js";
let compilerReady = false;
async function loadCompiler() {
  if (!/^soljson-v\d+\.\d+\.\d+\+commit\.[a-f0-9]{8}\.js$/.test(filename))
    throw new Error("Invalid compiler version.");
  const url = `https://binaries.soliditylang.org/bin/${filename}`;
  let cache;
  try {
    cache = await caches.open("ethsh-solc-binaries-v1");
  } catch {}
  let response;
  try {
    response = await cache?.match(url);
  } catch {}
  // Cache and blob-loading failures must not block classic script loading.
  try {
    if (!response) {
      response = await fetch(url);
      if (!response.ok) throw new Error("Compiler download failed.");
      try {
        await cache?.put(url, response.clone());
        // Keep disposable compiler binaries bounded; never touch user sources.
        const entries = await cache?.keys();
        for (const entry of (entries ?? []).slice(0, -3))
          await cache.delete(entry);
      } catch {}
    }
    const blob = URL.createObjectURL(
      new Blob([await response.text()], { type: "application/javascript" })
    );
    try {
      importScripts(blob);
    } finally {
      URL.revokeObjectURL(blob);
    }
  } catch {
    importScripts(url);
  }
  compilerReady = true;
  self.postMessage({ type: "ready" });
}
loadCompiler().catch((error) =>
  self.postMessage({ type: "load-error", error: error.message })
);
self.addEventListener("message", function (e) {
  const { input, id } = e.data;
  try {
    if (!compilerReady) throw new Error("Compiler is still loading.");
    const output = JSON.parse(
      Module.cwrap("solidity_compile", "string", ["string", "number"])(
        JSON.stringify(input),
        0
      )
    );
    self.postMessage({ id, success: true, output });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
});
