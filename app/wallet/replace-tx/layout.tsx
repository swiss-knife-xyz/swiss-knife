import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Replace Pending Transaction | ETH.sh",
  description:
    "Cancel or speed up pending EVM transactions by submitting a same-nonce replacement transaction.",
  images: "https://eth.sh/og/wallet-bridge.png",
});

const ReplaceTxLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ReplaceTxLayout;
