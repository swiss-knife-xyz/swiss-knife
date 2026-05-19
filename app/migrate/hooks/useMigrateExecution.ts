"use client";

import { useCallback, useState } from "react";
import { Address } from "viem";
import { PortfolioToken } from "../lib/portfolioApi";

export interface PreparedTransfer {
  token: PortfolioToken;
  amountWei: bigint;
}

export interface ExecutionPlan {
  receiver: Address;
  chainId: number;
  transfers: PreparedTransfer[];
}

export type ExecutionMode = "batch" | "sequential";

export interface UseMigrateExecutionResult {
  plan: ExecutionPlan | null;
  mode: ExecutionMode | null;
  start: (plan: ExecutionPlan, supportsBatching: boolean) => void;
  switchToSequential: () => void;
  close: () => void;
}

/**
 * Tiny state holder that owns the live execution plan and selected execution
 * mode. The two modals consume it through props rendered by MigratePage.
 */
export function useMigrateExecution(): UseMigrateExecutionResult {
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [mode, setMode] = useState<ExecutionMode | null>(null);

  const start = useCallback(
    (next: ExecutionPlan, supportsBatching: boolean) => {
      setPlan(next);
      setMode(supportsBatching ? "batch" : "sequential");
    },
    []
  );

  const switchToSequential = useCallback(() => {
    setMode("sequential");
  }, []);

  const close = useCallback(() => {
    setPlan(null);
    setMode(null);
  }, []);

  return { plan, mode, start, switchToSequential, close };
}
