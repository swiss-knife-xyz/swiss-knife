import { importDeclarations } from "@/lib/solidity/compilation";
import { functionSelectors } from "@/lib/solidity/functionSelectors";
self.addEventListener(
  "message",
  ({ data }: MessageEvent<{ id: number; content: string }>) => {
    self.postMessage({
      id: data.id,
      selectors: functionSelectors(data.content),
      imports: importDeclarations(data.content),
    });
  }
);
