import { ConverterLayout as ConverterLayoutC } from "@/components/layouts/ConverterLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Converter | Swiss-Knife.xyz",
  description:
    "All your essential unit converters on one-page. Convert between wei, gwei, ether, hexadecimal, decimal, keccak256, 4 bytes selector and more.",
  images: "https://swiss-knife.xyz/og/converter.png",
});

const ConverterLayout = ({ children }: { children: React.ReactNode }) => {
  return <ConverterLayoutC>{children}</ConverterLayoutC>;
};

export default ConverterLayout;
