import type { Address } from "viem";
import type { OftDeployment } from "./oft";

export type RegisteredOftDeployment = OftDeployment & {
  logo: string;
};

export const WCHAN_BASE_TOKEN =
  "0xba5ed0000e1ca9136a695f0a848012a16008b032" as Address;

export const ROBIN_TOKEN_REGISTRY: readonly RegisteredOftDeployment[] = [
  {
    baseToken: "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b" as Address,
    adapter: "0xe4bbb2d00aac984ccca26ac5abafd7de3afab8bf" as Address,
    robinToken: "0x178e54df3d091ee4d0b2534742ef9e3692b76526" as Address,
    name: "Bankr",
    symbol: "BNKR",
    baseDecimals: 18,
    logo: "/tokenIcons/bnkr.svg",
  },
  {
    baseToken: "0x5f980dcfc4c0fa3911554cf5ab288ed0eb13dba3" as Address,
    adapter: "0x3308384bc308d09b3eba9a8f11cc36e993a273a4" as Address,
    robinToken: "0xd1b0d44e4f6ed940fcc7a9f59bf30daf62ccfe3d" as Address,
    name: "gitlawb",
    symbol: "GITLAWB",
    baseDecimals: 18,
    logo: "/tokenIcons/gitlawb.svg",
  },
  {
    baseToken: WCHAN_BASE_TOKEN,
    adapter: "0x3225455a2b25771e0485f2dc4adc45a1d56c2f4b" as Address,
    robinToken: "0xc9f26ed5bf985f21d40bbe5b3da10ecd56e95849" as Address,
    name: "WalletChan",
    symbol: "WCHAN",
    baseDecimals: 18,
    logo: "/external/walletchan-icon.png",
  },
] as const;

export const DEFAULT_DEPLOYMENT = ROBIN_TOKEN_REGISTRY[0];

export const findRegisteredDeployment = (
  baseToken: Address,
  robinToken: Address
) =>
  ROBIN_TOKEN_REGISTRY.find(
    (deployment) =>
      deployment.baseToken.toLowerCase() === baseToken.toLowerCase() &&
      deployment.robinToken.toLowerCase() === robinToken.toLowerCase()
  );
