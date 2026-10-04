import { getMetadata } from "@/utils";
import { CompilerLayout as CompilerLayoutC } from "@/components/layouts/CompilerLayout";

export const metadata = getMetadata({
  title: "Solidity | ETH.sh",
  description: "Solidity tools and utilities.",
  canonical: "https://solidity.eth.sh/",
  images: "https://eth.sh/og/solidity-compiler.png",
});

const SolidityLayout = ({ children }: { children: React.ReactNode }) => {
  return <CompilerLayoutC>{children}</CompilerLayoutC>;
};

export default SolidityLayout;
