import { useState, useEffect, useMemo } from "react";
import { useReadContracts } from "wagmi";
import { erc20Abi, zeroAddress, Address } from "viem";

interface UseCurrencyInfoProps {
  fromCurrency: Address;
  toCurrency: Address;
  availableCurrencies: Address[];
}

interface CurrencyInfo {
  symbol?: string;
  decimals?: number;
}

interface UseCurrencyInfoResult {
  fromCurrencyInfo: CurrencyInfo;
  toCurrencyInfo: CurrencyInfo;
  currencyInfoMap: Map<Address, CurrencyInfo>;
  isLoadingCurrencyInfo: boolean;
  currencyInfoError: boolean;
}

export function useCurrencyInfo({
  fromCurrency,
  toCurrency,
  availableCurrencies,
}: UseCurrencyInfoProps): UseCurrencyInfoResult {
  const [currencyInfoMap, setCurrencyInfoMap] = useState<
    Map<Address, CurrencyInfo>
  >(new Map());

  // Memoize validERC20Currencies to prevent recalculation on every render
  const validERC20Currencies = useMemo(() => {
    return availableCurrencies.filter(
      (currency) => currency !== zeroAddress && currency.length === 42
    );
  }, [availableCurrencies]);

  // Memoize contracts to prevent recalculation on every render
  const contracts = useMemo(() => {
    return validERC20Currencies.flatMap((currency) => [
      {
        address: currency as Address,
        abi: erc20Abi,
        functionName: "symbol" as const,
      },
      {
        address: currency as Address,
        abi: erc20Abi,
        functionName: "decimals" as const,
      },
    ]);
  }, [validERC20Currencies]);

  const { data: currencyData, refetch: refetchCurrencyInfo } = useReadContracts(
    {
      contracts,
      query: {
        enabled: validERC20Currencies.length > 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    }
  );

  // Process currency data and update map
  useEffect(() => {
    const newMap = new Map<Address, CurrencyInfo>();

    // Always add ETH info
    newMap.set(zeroAddress, { symbol: "ETH", decimals: 18 });

    // Process ERC20 token data
    if (currencyData && validERC20Currencies.length > 0) {
      validERC20Currencies.forEach((currency, index) => {
        const symbolIndex = index * 2;
        const decimalsIndex = index * 2 + 1;

        const symbolResult = currencyData[symbolIndex];
        const decimalsResult = currencyData[decimalsIndex];

        if (
          symbolResult?.status === "success" &&
          decimalsResult?.status === "success"
        ) {
          newMap.set(currency, {
            symbol: symbolResult.result as string,
            decimals: decimalsResult.result as number,
          });
        }
      });
    }

    setCurrencyInfoMap(newMap);
  }, [currencyData, validERC20Currencies]);

  // Refetch when available currencies change (remove refetchCurrencyInfo from dependencies)
  useEffect(() => {
    if (validERC20Currencies.length > 0) {
      refetchCurrencyInfo();
    }
  }, [availableCurrencies]); // Only depend on availableCurrencies, not refetchCurrencyInfo

  // Get info for specific currencies
  const fromCurrencyInfo = currencyInfoMap.get(fromCurrency) || {};
  const toCurrencyInfo = currencyInfoMap.get(toCurrency) || {};

  return {
    fromCurrencyInfo,
    toCurrencyInfo,
    currencyInfoMap,
    isLoadingCurrencyInfo:
      currencyData === undefined && validERC20Currencies.length > 0,
    currencyInfoError:
      currencyData?.some((c) => c.status === "failure") || false,
  };
}
