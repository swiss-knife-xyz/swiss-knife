import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Solidity Compiler | ETH.sh",
  description: "Compile solidity contracts & quickly generate ABI.",
  canonical: "https://solidity.eth.sh/compiler",
  images: "https://eth.sh/og/solidity-compiler.png",
});

const CompilerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default CompilerLayout;
