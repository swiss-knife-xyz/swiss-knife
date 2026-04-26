import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Contract | ETH.sh",
  description:
    "Interact with any smart contract - read & write functions, storage slots, and raw calldata. Works with both verified and unverified contracts.",
  images: "https://eth.sh/og/contract.png",
});

const ContractLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractLayout;
