import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: [
      "lib/tracer/*.spec.ts",
      "components/tracer/*.spec.tsx",
      "app/calldata/trace/*.spec.tsx",
      "components/decodedParams/ParameterTree.test.tsx",
    ],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
