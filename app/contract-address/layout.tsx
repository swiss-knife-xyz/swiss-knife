import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Determine Contract Address | ETH.sh",
  description:
    "Determine the contract address which will get deployed by an ethereum address at a particular nonce.",
  images: "https://eth.sh/og/contract-address.png",
});

const ContractAddressLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractAddressLayout;
