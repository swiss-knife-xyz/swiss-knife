import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["app/contract/contractLoad.spec.tsx", "app/contract/contractProvenance.spec.tsx"],
    maxWorkers: 1,
  },
});
