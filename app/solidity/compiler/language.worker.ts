import {
  SolidityLanguageService,
  type LanguageQuery,
} from "@/lib/solidity/language-service";
import type { SolidityFile } from "@/lib/solidity/workspace";
const service = new SolidityLanguageService();
const files = new Map<string, SolidityFile>();
self.addEventListener(
  "message",
  ({
    data,
  }: MessageEvent<{
    id: number;
    changed: SolidityFile[];
    removed: string[];
    query: LanguageQuery;
    remappings?: string[];
  }>) => {
    try {
      for (const path of data.removed) files.delete(path);
      for (const file of data.changed) files.set(file.name, file);
      service.setFiles([...files.values()], data.remappings);
      self.postMessage({ id: data.id, result: service.query(data.query) });
    } catch {
      self.postMessage({ id: data.id, result: { items: [] } });
    }
  }
);
