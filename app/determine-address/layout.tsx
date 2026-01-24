import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Determine Contract Address | Swiss-Knife.xyz",
  description:
    "Determine the contract address using CREATE or CREATE2 opcode. Calculate addresses from deployer address and nonce (CREATE) or bytecode and salt (CREATE2).",
  images: "https://swiss-knife.xyz/og/determine-address.png",
});

const DetermineAddressLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default DetermineAddressLayout;
