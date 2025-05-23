import { SafeLayout as SafeLayoutC } from "@/components/layouts/SafeLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Safe | Swiss-Knife.xyz",
  description:
    "Tools for the Safe{Wallet} - MultiSend Calldata Decoder and EIP-712 Hash Visualizer",
  images: "https://swiss-knife.xyz/og/safe.png",
});

const SafeLayout = ({ children }: { children: React.ReactNode }) => {
  return <SafeLayoutC>{children}</SafeLayoutC>;
};

export default SafeLayout;
