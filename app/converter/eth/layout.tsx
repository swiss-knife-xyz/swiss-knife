import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Ethereum Unit Converter | ETH.sh",
  description: "Convert Ether to Wei, Gwei and vice versa.",
  canonical: "https://converter.eth.sh/eth",
  images: "https://eth.sh/og/converter-eth.png",
});

const EthLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EthLayout;
