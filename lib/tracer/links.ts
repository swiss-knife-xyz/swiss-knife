import { txExplorers } from "@/data/txExplorers";
import { generateUrl } from "@/utils";
import { ExplorerType } from "@/types";
import { HASH } from "./model";

export function getTraceExplorerLinks(chainId: number, hash: string) {
  if (!HASH.test(hash)) return [];
  return (["Tenderly", "Phalcon"] as const).flatMap((name) => {
    const provider = txExplorers[name];
    const label = provider?.chainIdToLabel[chainId];
    return label === undefined
      ? []
      : [
          {
            name,
            href: generateUrl(provider.urlLayout, label, hash, ExplorerType.TX),
          },
        ];
  });
}
