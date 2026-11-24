import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["components/fnParams/*.spec.tsx"],
    maxWorkers: 1,
  },
});
