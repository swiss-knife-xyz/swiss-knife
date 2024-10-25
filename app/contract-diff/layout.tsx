import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Contract Diff | Swiss-Knife.xyz",
  description:
    "Compares and highlights differences between smart contracts deployed at two specified blockchain addresses.",
  images: "https://swiss-knife.xyz/og/contract-diff.png",
});

const ContractAddressLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractAddressLayout;
