import { getMetadata } from "@/utils";
import { CompilerLayout as CompilerLayoutC } from "@/components/layouts/CompilerLayout";

export const metadata = getMetadata({
  title: "Compiler | Swiss-Knife.xyz",
  description: "Compile solidity contracts with the solc compiler.",
  images: "https://swiss-knife.xyz/og/",
});

const CompilerLayout = ({ children }: { children: React.ReactNode }) => {
  return <CompilerLayoutC>{children}</CompilerLayoutC>;
};

export default CompilerLayout;
