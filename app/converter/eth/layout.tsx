import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Ethereum Unit Converter | Swiss-Knife.xyz",
  description: "Convert Ether to Wei, Gwei and vice versa.",
  images: "https://swiss-knife.xyz/og/converter-eth.png",
});

const EthLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EthLayout;
