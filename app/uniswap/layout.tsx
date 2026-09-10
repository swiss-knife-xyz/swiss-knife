import { getMetadata } from "@/utils";
import { UniswapLayout as UniswapLayoutC } from "./UniswapLayout";

export const metadata = getMetadata({
  title: "Uniswap V4 | ETH.sh",
  description:
    "Calculator to convert Uniswap V4 tick to price for any token pair addresses.",
  images: "https://eth.sh/og/uniswap.png",
});

const UniswapLayout = ({ children }: { children: React.ReactNode }) => {
  return <UniswapLayoutC>{children}</UniswapLayoutC>;
};

export default UniswapLayout;
