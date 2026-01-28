import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Keccak256 Converter | ETH.sh",
  description: "Convert string or hex to keccack256 and 4 bytes selector.",
  images: "https://eth.sh/og/converter-keccak256.png",
});

const Keccak256Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Keccak256Layout;
