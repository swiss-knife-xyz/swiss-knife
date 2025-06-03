import { Address } from "viem";
import { baseSepolia } from "viem/chains";

// Import shared constants from add-liquidity
export {
  StateViewAbi,
  StateViewAddress,
  Permit2Address,
  Permit2Abi,
} from "../../add-liquidity/lib/constants";

export { UniversalRouterAbi } from "@/lib/uniswap/abi/UniversalRouter";

// Universal Router contract addresses
export const UniversalRouterAddress: Record<number, Address> = {
  [baseSepolia.id]: "0x492E6456D9528771018DeB9E87ef7750EF184104",
};

// Default slippage in basis points (0.5% = 50 basis points)
export const DEFAULT_SLIPPAGE_BPS = 50;

// Maximum slippage in basis points (10% = 1000 basis points)
export const MAX_SLIPPAGE_BPS = 1000;
