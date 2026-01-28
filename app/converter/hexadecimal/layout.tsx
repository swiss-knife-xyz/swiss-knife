import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Hexadecimal Converter | ETH.sh",
  description: "Convert between Hexadecimal, decimal, text and binary.",
  images: "https://eth.sh/og/converter-hexadecimal.png",
});

const HexadecimalLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default HexadecimalLayout;
