import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: { environment: "jsdom", include: ["lib/revertDecoding.spec.ts", "lib/decoderShare.spec.ts", "components/decodedParams/revertTree.spec.tsx"], maxWorkers: 1 },
});
