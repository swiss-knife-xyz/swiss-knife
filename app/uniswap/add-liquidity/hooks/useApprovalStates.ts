import { useState, useCallback } from "react";
import { Address, zeroAddress, erc20Abi } from "viem";
import { usePublicClient } from "wagmi"; // Import usePublicClient to get its return type
import {
  Permit2Address,
  Permit2Abi,
  UniV4PositionManagerAddress,
} from "../lib/constants";
import { Chain } from "viem/chains";

// Define the type for publicClient based on usePublicClient hook
type PublicClientType = ReturnType<typeof usePublicClient>;

interface ApprovalStatesResult {
  currency0Approval?: bigint;
  currency1Approval?: bigint;
  currency0Permit2Allowance?: bigint;
  currency1Permit2Allowance?: bigint;
  isCheckingApprovals: boolean;
  checkApprovals: () => Promise<void>;
}

export const useApprovalStates = (
  publicClient: PublicClientType, // publicClient is required
  address: Address | undefined, // address can be undefined if not connected
  chain:
    | (Chain & { id: number; unsupported?: boolean | undefined })
    | undefined,
  currency0: Address | string | undefined,
  currency1: Address | string | undefined,
  isChainSupported: boolean | undefined
): ApprovalStatesResult => {
  const [currency0Approval, setCurrency0Approval] = useState<
    bigint | undefined
  >();
  const [currency1Approval, setCurrency1Approval] = useState<
    bigint | undefined
  >();
  const [currency0Permit2Allowance, setCurrency0Permit2Allowance] = useState<
    bigint | undefined
  >();
  const [currency1Permit2Allowance, setCurrency1Permit2Allowance] = useState<
    bigint | undefined
  >();
  const [isCheckingApprovals, setIsCheckingApprovals] =
    useState<boolean>(false);

  const checkApprovals = useCallback(async () => {
    if (!publicClient || !address || !chain?.id || !isChainSupported) return;

    setIsCheckingApprovals(true);
    try {
      const checks = [];
      const currentChainId = chain.id;

      if (currency0 && currency0 !== zeroAddress) {
        checks.push(
          publicClient.readContract({
            address: currency0 as Address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, Permit2Address[currentChainId]],
          })
        );
      }

      if (currency1 && currency1 !== zeroAddress) {
        checks.push(
          publicClient.readContract({
            address: currency1 as Address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, Permit2Address[currentChainId]],
          })
        );
      }

      if (currency0 && currency0 !== zeroAddress) {
        checks.push(
          publicClient.readContract({
            address: Permit2Address[currentChainId],
            abi: Permit2Abi,
            functionName: "allowance",
            args: [
              address,
              currency0 as Address,
              UniV4PositionManagerAddress[currentChainId],
            ],
          })
        );
      }

      if (currency1 && currency1 !== zeroAddress) {
        checks.push(
          publicClient.readContract({
            address: Permit2Address[currentChainId],
            abi: Permit2Abi,
            functionName: "allowance",
            args: [
              address,
              currency1 as Address,
              UniV4PositionManagerAddress[currentChainId],
            ],
          })
        );
      }

      const results = await Promise.all(checks);
      let resultIndex = 0;

      if (currency0 && currency0 !== zeroAddress) {
        setCurrency0Approval(results[resultIndex] as bigint);
        resultIndex++;
      } else {
        setCurrency0Approval(undefined);
      }

      if (currency1 && currency1 !== zeroAddress) {
        setCurrency1Approval(results[resultIndex] as bigint);
        resultIndex++;
      } else {
        setCurrency1Approval(undefined);
      }

      if (currency0 && currency0 !== zeroAddress) {
        const [amount] = results[resultIndex] as [bigint, number, number];
        setCurrency0Permit2Allowance(amount);
        resultIndex++;
      } else {
        setCurrency0Permit2Allowance(undefined);
      }

      if (currency1 && currency1 !== zeroAddress) {
        const [amount] = results[resultIndex] as [bigint, number, number];
        setCurrency1Permit2Allowance(amount);
      } else {
        setCurrency1Permit2Allowance(undefined);
      }
    } catch (error) {
      console.error("Error checking approvals:", error);
      // Optionally reset states or set error state here
      setCurrency0Approval(undefined);
      setCurrency1Approval(undefined);
      setCurrency0Permit2Allowance(undefined);
      setCurrency1Permit2Allowance(undefined);
    } finally {
      setIsCheckingApprovals(false);
    }
  }, [publicClient, address, chain, currency0, currency1, isChainSupported]);

  return {
    currency0Approval,
    currency1Approval,
    currency0Permit2Allowance,
    currency1Permit2Allowance,
    isCheckingApprovals,
    checkApprovals,
  };
};
