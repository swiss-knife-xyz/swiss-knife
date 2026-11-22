import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Hexadecimal Converter | ETH.sh",
  description: "Convert between Hexadecimal, decimal, text and binary.",
  canonical: "https://converter.eth.sh/hexadecimal",
  images: "https://eth.sh/api/og/converter-hexadecimal",
});

const HexadecimalLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default HexadecimalLayout;
