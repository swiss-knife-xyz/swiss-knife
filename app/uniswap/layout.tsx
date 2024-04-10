import { UniswapLayout as UniswapLayoutC } from "@/components/layouts/UniswapLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "UniswapV3 | Swiss-Knife.xyz",
  description:
    "Calculator to convert UniswapV3 tick to price for any token pair addresses.",
  images: "https://swiss-knife.xyz/og/uniswap.png",
});

const UniswapLayout = ({ children }: { children: React.ReactNode }) => {
  return <UniswapLayoutC>{children}</UniswapLayoutC>;
};

export default UniswapLayout;
