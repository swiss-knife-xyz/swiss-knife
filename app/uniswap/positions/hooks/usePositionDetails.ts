import { useState, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits, Address } from "viem";
import {
  UniV4PositionManagerAbi as PositionManagerAbi,
  UniV4PositionManagerAddress,
  ERC20Abi,
  NATIVE_ETH,
} from "../../lib/constants";
import {
  parsePositionInfo,
  calculatePriceRange,
  ParsedPositionInfo,
  formatPrice,
} from "../lib/utils";

export interface PositionInfo extends ParsedPositionInfo {
  // Extending the parsed position info
}

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

export interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
}

export interface PriceInfo {
  priceLower: number;
  priceUpper: number;
  formattedPriceLower: string;
  formattedPriceUpper: string;
  token0PerToken1: number;
  token1PerToken0: number;
}

export interface PositionDetails {
  tokenId: string;
  owner: Address;
  liquidity: string;
  positionInfo: PositionInfo;
  poolKey: PoolKey;
  token0: TokenInfo;
  token1: TokenInfo;
  tokenURI: string;
  priceInfo: PriceInfo;
}

export const usePositionDetails = () => {
  const { address: userAddress, chain } = useAccount();
  const publicClient = usePublicClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positionDetails, setPositionDetails] =
    useState<PositionDetails | null>(null);

  const fetchPositionDetails = useCallback(
    async (tokenId: string) => {
      if (!publicClient || !chain?.id || !tokenId) {
        setError("Missing required parameters");
        return;
      }

      const positionManagerAddress = UniV4PositionManagerAddress[chain.id];
      if (!positionManagerAddress) {
        setError("Position Manager not supported on this chain");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch basic position info using multicall
        const results = await publicClient.multicall({
          contracts: [
            {
              address: positionManagerAddress,
              abi: PositionManagerAbi,
              functionName: "getPoolAndPositionInfo",
              args: [BigInt(tokenId)],
            },
            {
              address: positionManagerAddress,
              abi: PositionManagerAbi,
              functionName: "ownerOf",
              args: [BigInt(tokenId)],
            },
            {
              address: positionManagerAddress,
              abi: PositionManagerAbi,
              functionName: "getPositionLiquidity",
              args: [BigInt(tokenId)],
            },
            {
              address: positionManagerAddress,
              abi: PositionManagerAbi,
              functionName: "tokenURI",
              args: [BigInt(tokenId)],
            },
          ],
        });

        // Extract results and handle potential errors
        const poolAndPositionInfo =
          results[0].status === "success" ? results[0].result : null;
        const owner =
          results[1].status === "success" ? results[1].result : null;
        const liquidity =
          results[2].status === "success" ? results[2].result : null;
        const tokenURI =
          results[3].status === "success" ? results[3].result : null;

        if (!poolAndPositionInfo || !owner || !liquidity || !tokenURI) {
          throw new Error("Failed to fetch position basic info");
        }

        // Extract pool key and position info from the result
        const [poolKey, packedPositionInfo] = poolAndPositionInfo as [
          any,
          bigint
        ];
        const positionInfo = parsePositionInfo(packedPositionInfo);

        // Fetch token information
        const getTokenInfo = async (
          tokenAddress: Address
        ): Promise<TokenInfo> => {
          if (tokenAddress === NATIVE_ETH) {
            // Handle native ETH
            const balance = userAddress
              ? await publicClient.getBalance({ address: userAddress })
              : 0n;
            return {
              address: tokenAddress,
              symbol: "ETH",
              decimals: 18,
              balance: balance.toString(),
              formattedBalance: formatUnits(balance, 18),
            };
          } else {
            // Handle ERC20 tokens using multicall
            const contracts = [
              {
                address: tokenAddress,
                abi: ERC20Abi,
                functionName: "symbol" as const,
              },
              {
                address: tokenAddress,
                abi: ERC20Abi,
                functionName: "decimals" as const,
              },
            ];

            // Only add balance query if user address exists
            if (userAddress) {
              contracts.push({
                address: tokenAddress,
                abi: ERC20Abi,
                functionName: "balanceOf" as const,
                args: [userAddress],
              } as any);
            }

            const results = await publicClient.multicall({ contracts });

            const symbol =
              results[0].status === "success"
                ? (results[0].result as string)
                : "UNKNOWN";
            const decimals =
              results[1].status === "success"
                ? (results[1].result as number)
                : 18;
            const balance =
              userAddress && results[2]?.status === "success"
                ? (results[2].result as unknown as bigint)
                : 0n;

            return {
              address: tokenAddress,
              symbol,
              decimals,
              balance: balance.toString(),
              formattedBalance: formatUnits(balance, decimals),
            };
          }
        };

        const [token0Info, token1Info] = await Promise.all([
          getTokenInfo(poolKey.currency0),
          getTokenInfo(poolKey.currency1),
        ]);

        // Calculate price range
        const priceRange = calculatePriceRange(
          positionInfo.tickLower,
          positionInfo.tickUpper,
          token0Info.decimals,
          token1Info.decimals
        );

        const priceInfo: PriceInfo = {
          priceLower: priceRange.priceLower,
          priceUpper: priceRange.priceUpper,
          formattedPriceLower: formatPrice(priceRange.priceLower),
          formattedPriceUpper: formatPrice(priceRange.priceUpper),
          token0PerToken1: priceRange.priceLower, // Price at lower tick
          token1PerToken0: 1 / priceRange.priceLower, // Inverse
        };

        const details: PositionDetails = {
          tokenId,
          owner,
          liquidity: liquidity.toString(),
          positionInfo,
          poolKey,
          token0: token0Info,
          token1: token1Info,
          tokenURI,
          priceInfo,
        };

        setPositionDetails(details);
      } catch (err) {
        console.error("Error fetching position details:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch position details"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [publicClient, chain?.id, userAddress]
  );

  return {
    fetchPositionDetails,
    positionDetails,
    isLoading,
    error,
    clearPosition: () => {
      setPositionDetails(null);
      setError(null);
    },
  };
};
