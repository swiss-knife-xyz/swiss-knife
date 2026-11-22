import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["components/decodedParams/TupleParam.test.tsx"],
    maxWorkers: 1,
  },
});
