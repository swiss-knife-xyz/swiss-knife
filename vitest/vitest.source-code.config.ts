import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["components/SourceCodeExplorer/*.spec.tsx", "app/contract-diff/*.spec.tsx", "lib/sourceCode.spec.ts"],
    maxWorkers: 1,
  },
});
