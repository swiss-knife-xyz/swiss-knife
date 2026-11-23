import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["lib/unixTimestamp.spec.ts", "app/epoch-converter/page.spec.tsx"],
    maxWorkers: 1,
  },
});
