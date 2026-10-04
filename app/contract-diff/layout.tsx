import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Contract Diff | ETH.sh",
  description:
    "Compares and highlights differences between smart contracts deployed at two specified blockchain addresses.",
  canonical: "https://contract-diff.eth.sh/",
  images: "https://eth.sh/og/contract-diff.png",
});

const ContractAddressLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractAddressLayout;
