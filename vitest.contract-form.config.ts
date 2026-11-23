import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: [
      "components/fnParams/contractPrefill.spec.tsx",
      "components/fnParams/historicalQuery.spec.tsx",
      "components/fnParams/historicalDateTimePicker.spec.tsx",
      "lib/historicalQuery.spec.ts",
      "components/fnParams/contractForm.spec.tsx",
      "components/fnParams/contractWidgets.spec.tsx",
      "app/explorer/contractCallFlow.spec.tsx",
      "app/explorer/contractProvenance.spec.tsx",
    ],
    maxWorkers: 1,
  },
});
