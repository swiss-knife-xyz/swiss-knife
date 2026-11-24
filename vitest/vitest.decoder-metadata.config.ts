import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: [
      "lib/decoderShare.spec.ts",
      "lib/revertDecoding.spec.ts",
      "components/decodedParams/revertTree.spec.tsx",
      "components/ContentSizedEditor.spec.tsx",
      "components/ResizableImage.spec.tsx",
      "app/calldata/decoder/decoderMetadata.spec.tsx",
      "app/calldata/decoder/universalRouter.spec.tsx",
      "components/decodedParams/parameterState.spec.tsx",
      "components/decodedParams/richString.spec.tsx",
      "components/decodedParams/calldataOutput.spec.tsx",
      "components/decodedParams/parameterDispatch.spec.tsx",
    ],
    maxWorkers: 1,
  },
});
