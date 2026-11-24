import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Contract Diff | ETH.sh",
  description:
    "Compare verified smart contract sources across networks or against a pinned GitHub repository commit.",
  canonical: "https://contract-diff.eth.sh/",
  images: "https://eth.sh/api/og/contract-diff",
});

const ContractAddressLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractAddressLayout;
