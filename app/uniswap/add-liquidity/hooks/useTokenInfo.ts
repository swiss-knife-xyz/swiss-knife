import { useState, useEffect } from "react";
import { Address, zeroAddress, erc20Abi } from "viem";
import { useReadContracts, useBalance } from "wagmi";

interface TokenInfoResult {
  currency0Symbol?: string;
  currency0Decimals?: number;
  currency0Balance?: bigint;
  currency1Symbol?: string;
  currency1Decimals?: number;
  currency1Balance?: bigint;
}

export const useTokenInfo = (
  address?: Address,
  currency0?: Address | string,
  currency1?: Address | string,
  currency0EthBalance?: bigint,
  currency1EthBalance?: bigint
): TokenInfoResult => {
  const [currency0Symbol, setCurrency0Symbol] = useState<string | undefined>();
  const [currency0Decimals, setCurrency0Decimals] = useState<
    number | undefined
  >();
  const [currency0Balance, setCurrency0Balance] = useState<
    bigint | undefined
  >();
  const [currency1Symbol, setCurrency1Symbol] = useState<string | undefined>();
  const [currency1Decimals, setCurrency1Decimals] = useState<
    number | undefined
  >();
  const [currency1Balance, setCurrency1Balance] = useState<
    bigint | undefined
  >();

  const { data: currencyInfo } = useReadContracts({
    contracts: [
      ...(currency0 && currency0 !== zeroAddress
        ? [
            {
              address: currency0 as Address,
              abi: erc20Abi,
              functionName: "symbol",
            },
            {
              address: currency0 as Address,
              abi: erc20Abi,
              functionName: "decimals",
            },
            {
              address: currency0 as Address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address!],
            },
          ]
        : []),
      ...(currency1 && currency1 !== zeroAddress
        ? [
            {
              address: currency1 as Address,
              abi: erc20Abi,
              functionName: "symbol",
            },
            {
              address: currency1 as Address,
              abi: erc20Abi,
              functionName: "decimals",
            },
            {
              address: currency1 as Address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address!],
            },
          ]
        : []),
    ],
    query: {
      enabled:
        !!address &&
        !!currency0 &&
        currency0.length > 0 &&
        !!currency1 &&
        currency1.length > 0,
    },
  });

  useEffect(() => {
    // Handle currency0
    if (currency0 === zeroAddress) {
      setCurrency0Symbol("ETH");
      setCurrency0Decimals(18);
      setCurrency0Balance(currency0EthBalance);
    } else if (currencyInfo && currency0 && currency0.length > 0) {
      const currency0InfoIndex = 0;
      setCurrency0Symbol(currencyInfo[currency0InfoIndex]?.result as string);
      setCurrency0Decimals(
        currencyInfo[currency0InfoIndex + 1]?.result as number
      );
      setCurrency0Balance(
        currencyInfo[currency0InfoIndex + 2]?.result as bigint
      );
    }

    // Handle currency1
    if (currency1 === zeroAddress) {
      setCurrency1Symbol("ETH");
      setCurrency1Decimals(18);
      setCurrency1Balance(currency1EthBalance);
    } else if (currencyInfo && currency1 && currency1.length > 0) {
      const currency1InfoIndex = currency0 && currency0 !== zeroAddress ? 3 : 0;
      if (currencyInfo.length > currency1InfoIndex) {
        setCurrency1Symbol(currencyInfo[currency1InfoIndex]?.result as string);
        setCurrency1Decimals(
          currencyInfo[currency1InfoIndex + 1]?.result as number
        );
        setCurrency1Balance(
          currencyInfo[currency1InfoIndex + 2]?.result as bigint
        );
      }
    }
  }, [
    currencyInfo,
    currency0,
    currency1,
    currency0EthBalance,
    currency1EthBalance,
    address,
  ]);

  return {
    currency0Symbol,
    currency0Decimals,
    currency0Balance,
    currency1Symbol,
    currency1Decimals,
    currency1Balance,
  };
};
