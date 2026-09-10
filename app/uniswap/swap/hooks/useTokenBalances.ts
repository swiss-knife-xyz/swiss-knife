import { useState, useEffect } from "react";
import { Address, zeroAddress, erc20Abi } from "viem";
import { useReadContracts, useBalance } from "wagmi";

interface TokenBalancesResult {
  fromBalance?: bigint;
  toBalance?: bigint;
  isLoading: boolean;
}

export const useTokenBalances = (
  userAddress?: Address,
  fromCurrency?: Address,
  toCurrency?: Address
): TokenBalancesResult => {
  const [fromBalance, setFromBalance] = useState<bigint | undefined>();
  const [toBalance, setToBalance] = useState<bigint | undefined>();

  // Get ETH balance for the user
  const { data: ethBalance } = useBalance({
    address: userAddress,
    query: {
      enabled: !!userAddress,
    },
  });

  // Prepare contracts for reading ERC20 balances
  const contracts = [];
  let fromIsEth = false;
  let toIsEth = false;

  if (fromCurrency && fromCurrency !== zeroAddress) {
    contracts.push({
      address: fromCurrency,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress!],
    });
  } else if (fromCurrency === zeroAddress) {
    fromIsEth = true;
  }

  if (toCurrency && toCurrency !== zeroAddress) {
    contracts.push({
      address: toCurrency,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress!],
    });
  } else if (toCurrency === zeroAddress) {
    toIsEth = true;
  }

  const { data: tokenBalances, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: !!userAddress && contracts.length > 0,
    },
  });

  useEffect(() => {
    if (!userAddress) {
      setFromBalance(undefined);
      setToBalance(undefined);
      return;
    }

    // Handle fromCurrency balance
    if (fromIsEth && ethBalance) {
      setFromBalance(ethBalance.value);
    } else if (
      !fromIsEth &&
      tokenBalances &&
      fromCurrency &&
      fromCurrency !== zeroAddress
    ) {
      const fromIndex = 0;
      setFromBalance(tokenBalances[fromIndex]?.result as bigint);
    }

    // Handle toCurrency balance
    if (toIsEth && ethBalance) {
      setToBalance(ethBalance.value);
    } else if (
      !toIsEth &&
      tokenBalances &&
      toCurrency &&
      toCurrency !== zeroAddress
    ) {
      const toIndex = fromCurrency && fromCurrency !== zeroAddress ? 1 : 0;
      if (tokenBalances.length > toIndex) {
        setToBalance(tokenBalances[toIndex]?.result as bigint);
      }
    }
  }, [
    userAddress,
    fromCurrency,
    toCurrency,
    ethBalance,
    tokenBalances,
    fromIsEth,
    toIsEth,
  ]);

  return {
    fromBalance,
    toBalance,
    isLoading,
  };
};
