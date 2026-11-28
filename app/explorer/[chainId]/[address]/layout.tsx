import { getMetadata } from "@/utils";
import { getKnownContractSeo } from "@/lib/contractSeo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string; chainId: string }>;
}) {
  const { address, chainId } = await params;
  const knownContract = getKnownContractSeo(chainId, address);
  return {
    ...getMetadata({
      canonical:
        knownContract?.canonical ??
        `https://explorer.eth.sh/${chainId}/${address}`,
      title: knownContract?.title ?? `Contract ${address} | ETH.sh`,
      description:
        knownContract?.description ??
        "Best UI to interact with smart contracts. Read & Write contract functions with human readable output!",
      images: "https://eth.sh/api/og/contract", // FIXME: add meta image for contract explorer page
    }),
  };
}

const ContractLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractLayout;
