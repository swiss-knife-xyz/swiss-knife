import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: [
      "lib/decoderShare.spec.ts",
      "app/calldata/decoder/decoderMetadata.spec.tsx",
      "app/calldata/decoder/universalRouter.spec.tsx",
      "components/decodedParams/parameterState.spec.tsx",
    ],
    maxWorkers: 1,
  },
});
