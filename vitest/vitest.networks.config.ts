import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: [
      "components/NetworkSelect.spec.tsx",
      "data/networks.spec.ts",
      "lib/rpcTransport.spec.ts",
      "lib/ethersProvider.spec.ts",
      "lib/customChains/*.spec.ts",
      "components/CustomChainModal.spec.tsx",
    ],
    maxWorkers: 1,
    testTimeout: 15000,
  },
});
