import { getMetadata } from "@/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string; chainId: string }>;
}) {
  const { address, chainId } = await params;
  return getMetadata({
    canonical: `https://contract.eth.sh/${chainId}/${address}`,
    title: `Contract ${address} | ETH.sh`,
    description:
      "Best UI to interact with smart contracts. Read & Write contract functions with human readable output!",
    images: "https://eth.sh/api/og/contract", // FIXME: add meta image for contract explorer page
  });
}

const ContractLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractLayout;
