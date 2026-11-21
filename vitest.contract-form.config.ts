import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: [
      "components/fnParams/contractPrefill.spec.tsx",
      "components/fnParams/contractForm.spec.tsx",
      "components/fnParams/contractWidgets.spec.tsx",
      "app/contract/contractCallFlow.spec.tsx",
      "app/contract/contractProvenance.spec.tsx",
    ],
    maxWorkers: 1,
  },
});
