import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Solidity Compiler | Swiss-Knife.xyz",
  description: "Compile solidity contracts with the solc compiler.",
  images: "https://swiss-knife.xyz/og/",
});

const CompilerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default CompilerLayout;
