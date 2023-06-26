import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const getPath = (subdomain: string) => {
  return process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
    ? `/${subdomain}/`
    : `https://${subdomain}.swiss-knife.xyz/`;
};

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});
