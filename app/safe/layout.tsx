import { SafeLayout as SafeLayoutC } from "@/components/layouts/SafeLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Safe | ETH.sh",
  description:
    "Tools for the Safe{Wallet} - MultiSend Calldata Decoder and EIP-712 Hash Visualizer",
  images: "https://eth.sh/og/safe.png",
});

const SafeLayout = ({ children }: { children: React.ReactNode }) => {
  return <SafeLayoutC>{children}</SafeLayoutC>;
};

export default SafeLayout;
