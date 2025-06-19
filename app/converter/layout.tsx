import { getMetadata } from "@/utils";
import { ConverterLayout as ConverterLayoutC } from "./ConverterLayout";

export const metadata = getMetadata({
  title: "Converter | ETH.sh",
  description:
    "All your essential unit converters on one-page. Convert between wei, gwei, ether, hexadecimal, decimal, keccak256, 4 bytes selector and more.",
  images: "https://eth.sh/og/converter.png",
});

const ConverterLayout = ({ children }: { children: React.ReactNode }) => {
  return <ConverterLayoutC>{children}</ConverterLayoutC>;
};

export default ConverterLayout;
