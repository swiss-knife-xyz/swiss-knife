export interface SelectionEntry {
  selected: boolean;
  /** Optional user override of the per-token transfer amount, in wei. */
  amountOverrideWei?: bigint;
}

export type SelectionMap = Map<string, SelectionEntry>;
