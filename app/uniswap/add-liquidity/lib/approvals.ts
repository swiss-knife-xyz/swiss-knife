export interface Permit2AllowanceState {
  amount: bigint;
  expiration: number;
  nonce: number;
}

export const isPermit2AllowanceSufficient = (
  allowance: Permit2AllowanceState | undefined,
  requiredAmount: bigint,
  requiredUntil: number
): boolean =>
  allowance !== undefined &&
  allowance.amount >= requiredAmount &&
  allowance.expiration >= requiredUntil;

export const isErc20AllowanceSufficient = (
  allowance: bigint | undefined,
  requiredAmount: bigint
): boolean => allowance !== undefined && allowance >= requiredAmount;

export const getErc20ApprovalAmounts = (
  allowance: bigint | undefined,
  requiredAmount: bigint,
  approvalAmount: bigint
): bigint[] => {
  if (requiredAmount < 0n || approvalAmount < requiredAmount) {
    throw new RangeError("Approval must cover a non-negative required amount.");
  }
  if (
    requiredAmount === 0n ||
    isErc20AllowanceSufficient(allowance, requiredAmount)
  ) {
    return [];
  }

  // Unknown or nonzero insufficient state gets an explicit reset for
  // zero-first tokens. A known zero allowance can be set directly.
  return allowance === 0n ? [approvalAmount] : [0n, approvalAmount];
};
