import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Ethereum Unit Converter | ETH.sh",
  description: "Convert Ether to Wei, Gwei and vice versa.",
  images: "https://eth.sh/og/converter-eth.png",
});

const EthLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EthLayout;
