import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Hexadecimal Converter | Swiss-Knife.xyz",
  description: "Convert between Hexadecimal, decimal, text and binary.",
  images: "https://swiss-knife.xyz/og/converter-hexadecimal.png",
});

const HexadecimalLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default HexadecimalLayout;
