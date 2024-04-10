import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Keccak256 Converter | Swiss-Knife.xyz",
  description: "Convert string or hex to keccack256 and 4 bytes selector.",
  images: "https://swiss-knife.xyz/og/converter-keccak256.png",
});

const Keccak256Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Keccak256Layout;
