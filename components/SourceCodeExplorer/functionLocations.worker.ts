import { buildFunctionLocations } from "./functionLocations";

self.addEventListener(
  "message",
  ({
    data,
  }: MessageEvent<{
    sources: Record<string, string>;
    contractName: string;
  }>) => {
    self.postMessage(buildFunctionLocations(data.sources, data.contractName));
  }
);
