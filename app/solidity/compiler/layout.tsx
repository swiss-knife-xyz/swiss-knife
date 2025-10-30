import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Solidity Compiler | Swiss-Knife.xyz",
  description: "Compile solidity contracts & quickly generate ABI.",
  images: "https://swiss-knife.xyz/og/solidity-compiler.png",
});

const CompilerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default CompilerLayout;
