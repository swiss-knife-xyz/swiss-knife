import { getMetadata } from "@/utils";
import { CompilerLayout as CompilerLayoutC } from "@/components/layouts/CompilerLayout";

export const metadata = getMetadata({
  title: "Solidity | Swiss-Knife.xyz",
  description: "Solidity tools and utilities.",
  images: "https://swiss-knife.xyz/og/",
});

const SolidityLayout = ({ children }: { children: React.ReactNode }) => {
  return <CompilerLayoutC>{children}</CompilerLayoutC>;
};

export default SolidityLayout;
