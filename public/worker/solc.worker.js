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
// Keep only discovery references, bounded by the serialized source/settings key.
const referenceCache = new Map();
let referenceBytes = 0;
function libraryReferences(output) {
  const result = {};
  for (const [path, contracts] of Object.entries(output.contracts || {})) {
    result[path] = {};
    for (const [name, artifact] of Object.entries(contracts)) {
      const refs = new Map();
      for (const links of [artifact.evm?.bytecode?.linkReferences, artifact.evm?.deployedBytecode?.linkReferences]) {
        for (const [sourcePath, names] of Object.entries(links || {})) {
          for (const library of Object.keys(names)) {
            refs.set(JSON.stringify([sourcePath,library]), {sourcePath,name:library});
          }
        }
      }
      result[path][name] = [...refs.values()];
    }
  }
  return result;
}
function rememberReferences(key, refs) {
  if (key.length > 16 * 1024 * 1024) return;
  if (referenceCache.has(key)) referenceBytes -= key.length;
  referenceCache.delete(key);
  referenceCache.set(key, refs); referenceBytes += key.length;
  while (referenceCache.size > 10 || referenceBytes > 16 * 1024 * 1024) {
    const first = referenceCache.keys().next().value;
    referenceBytes -= first.length; referenceCache.delete(first);
  }
}
self.addEventListener("message", function (e) {
  const { input, id } = e.data;
  try {
    if (!compilerReady) throw new Error("Compiler is still loading.");
    const compile = (value) => JSON.parse(Module.cwrap("solidity_compile", "string", ["string", "number"])(JSON.stringify(value),0));
    const hasLibraries = Object.values(input.settings?.libraries || {}).some(names => Object.keys(names).length);
    const {libraries: _libraries, ...baseSettings} = input.settings || {};
    const baseInput = {...input,settings:baseSettings};
    const key = JSON.stringify(baseInput);
    let refs = referenceCache.get(key);
    let output;
    if (hasLibraries && !refs) {
      const discovery = compile(baseInput);
      refs = libraryReferences(discovery);
      rememberReferences(key,refs);
    }
    output = compile(input);
    if (!hasLibraries) {
      refs = libraryReferences(output); rememberReferences(key,refs);
    }
    // Actual linked output remains unmodified for verification/downloads.
    const response = {id,success:true,output};
    if (Object.keys(refs || {}).length) response.libraryReferences = refs;
    self.postMessage(response);
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
});
