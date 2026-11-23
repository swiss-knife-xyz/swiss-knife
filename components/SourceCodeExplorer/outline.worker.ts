import { solidityOutline } from "@/lib/solidity/outline";
self.addEventListener(
  "message",
  ({ data }: MessageEvent<{ id: number; content: string }>) => {
    self.postMessage({ id: data.id, result: solidityOutline(data.content) });
  }
);
