import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Determine Contract Address | Swiss-Knife.xyz",
  description:
    "Determine the contract address which will get deployed by an ethereum address at a particular nonce.",
  images: "https://swiss-knife.xyz/og/contract-address.png",
});

const ContractAddressLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractAddressLayout;
