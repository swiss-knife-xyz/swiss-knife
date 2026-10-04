import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Determine Contract Address | ETH.sh",
  description:
    "Determine the contract address using CREATE or CREATE2 opcode. Calculate addresses from deployer address and nonce (CREATE) or bytecode and salt (CREATE2).",
  canonical: "https://determine-address.eth.sh/",
  images: "https://eth.sh/og/determine-address.png",
});

const DetermineAddressLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default DetermineAddressLayout;
