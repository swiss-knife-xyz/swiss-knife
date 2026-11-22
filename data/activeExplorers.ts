import type { ExplorersData } from "../types";
import { isRetiredChain } from "./retiredChains";

// Provider directories can retain historical network IDs. Hide those labels,
// and remove providers with no active networks instead of opening empty modals.
export function activeExplorers(definitions: ExplorersData): ExplorersData {
  return Object.fromEntries(
    Object.entries(definitions).flatMap(([name, data]) => {
      const chainIdToLabel = Object.fromEntries(
        Object.entries(data.chainIdToLabel).filter(
          ([id]) => !isRetiredChain(id)
        )
      );
      return Object.keys(chainIdToLabel).length
        ? [[name, { ...data, chainIdToLabel }]]
        : [];
    })
  );
}
