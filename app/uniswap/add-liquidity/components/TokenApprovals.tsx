import { Box, Button, Divider, Heading, Td, Text, Tr } from "@chakra-ui/react";
import { zeroAddress, parseUnits, Address } from "viem";
import { ApprovalInfoRow } from "./ApprovalInfoRow";

interface TokenApprovalsProps {
  checkApprovals: () => void;
  isCheckingApprovals: boolean;
  address?: Address;
  isChainSupported?: boolean;
  currency0: string;
  currency1: string;
  currency0Symbol?: string;
  currency1Symbol?: string;
  amount0: string;
  amount1: string;
  currency0Decimals?: number;
  currency1Decimals?: number;
  currency0Approval?: bigint;
  currency1Approval?: bigint;
  currency0Permit2Allowance?: bigint;
  currency1Permit2Allowance?: bigint;
}

export const TokenApprovals: React.FC<TokenApprovalsProps> = ({
  checkApprovals,
  isCheckingApprovals,
  address,
  isChainSupported,
  currency0,
  currency1,
  currency0Symbol,
  currency1Symbol,
  amount0,
  amount1,
  currency0Decimals,
  currency1Decimals,
  currency0Approval,
  currency1Approval,
  currency0Permit2Allowance,
  currency1Permit2Allowance,
}) => {
  const getStatus = (
    isToken: boolean,
    isPermit2: boolean,
    tokenApproval?: bigint,
    permit2Allowance?: bigint,
    requiredAmountStr?: string,
    decimals?: number
  ) => {
    if (
      !requiredAmountStr ||
      !decimals ||
      requiredAmountStr === "" ||
      requiredAmountStr === "0"
    ) {
      return { text: "-", color: "gray.400" };
    }
    try {
      const requiredAmount = parseUnits(requiredAmountStr, decimals);
      if (isToken) {
        if (tokenApproval === undefined)
          return { text: "-", color: "gray.400" };
        if (tokenApproval >= requiredAmount)
          return { text: "✅ Approved", color: "green.400" };
        return { text: "⚠️ Approval needed", color: "orange.400" }; // Simplified message
      }
      if (isPermit2) {
        if (permit2Allowance === undefined)
          return { text: "-", color: "gray.400" };
        if (permit2Allowance >= requiredAmount)
          return { text: "✅ Allowed", color: "green.400" };
        return { text: "⚠️ Permit2 approval needed", color: "purple.400" }; // Simplified message
      }
    } catch {
      return { text: "Invalid Amount", color: "red.400" };
    }
    return { text: "-", color: "gray.400" };
  };

  const currency0StatusToPermit2 = getStatus(
    true,
    false,
    currency0Approval,
    undefined,
    amount0,
    currency0Decimals
  );
  const currency1StatusToPermit2 = getStatus(
    true,
    false,
    currency1Approval,
    undefined,
    amount1,
    currency1Decimals
  );
  const currency0StatusPermit2ToPM = getStatus(
    false,
    true,
    undefined,
    currency0Permit2Allowance,
    amount0,
    currency0Decimals
  );
  const currency1StatusPermit2ToPM = getStatus(
    false,
    true,
    undefined,
    currency1Permit2Allowance,
    amount1,
    currency1Decimals
  );

  // Determine if any approval rows should be shown based on whether the token addresses are valid (not zeroAddress)
  // and if amounts are defined (relevant for parseUnits call inside getStatus).
  const shouldShowCurrency0Approvals =
    currency0 !== zeroAddress &&
    amount0 !== undefined &&
    currency0Decimals !== undefined;
  const shouldShowCurrency1Approvals =
    currency1 !== zeroAddress &&
    amount1 !== undefined &&
    currency1Decimals !== undefined;

  const showAnyApprovalRows =
    shouldShowCurrency0Approvals || shouldShowCurrency1Approvals;

  return (
    <>
      <Tr>
        <Td colSpan={2}>
          <Divider />
        </Td>
      </Tr>
      <Tr>
        <Td colSpan={2}>
          <Heading size={"md"} mb={4}>
            Token Approvals:
          </Heading>
          <Button
            colorScheme="blue"
            onClick={checkApprovals}
            mb={4}
            isLoading={isCheckingApprovals}
            loadingText="Checking approvals..."
            isDisabled={!address || !isChainSupported}
          >
            Check Approvals
          </Button>
        </Td>
      </Tr>
      {showAnyApprovalRows && (
        <>
          {shouldShowCurrency0Approvals && (
            <>
              <ApprovalInfoRow
                label={`${currency0Symbol || "Currency0"} → Permit2`}
                statusText={currency0StatusToPermit2.text}
                statusColor={currency0StatusToPermit2.color}
              />
              <ApprovalInfoRow
                label={`Permit2 → Position Manager (${
                  currency0Symbol || "Currency0"
                })`}
                statusText={currency0StatusPermit2ToPM.text}
                statusColor={currency0StatusPermit2ToPM.color}
              />
            </>
          )}
          {shouldShowCurrency1Approvals && (
            <>
              <ApprovalInfoRow
                label={`${currency1Symbol || "Currency1"} → Permit2`}
                statusText={currency1StatusToPermit2.text}
                statusColor={currency1StatusToPermit2.color}
              />
              <ApprovalInfoRow
                label={`Permit2 → Position Manager (${
                  currency1Symbol || "Currency1"
                })`}
                statusText={currency1StatusPermit2ToPM.text}
                statusColor={currency1StatusPermit2ToPM.color}
              />
            </>
          )}
        </>
      )}
    </>
  );
};
