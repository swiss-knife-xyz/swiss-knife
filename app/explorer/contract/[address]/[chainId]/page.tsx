import type { Metadata } from "next";
import { fetchContractAbi, getMetadata } from "@/utils";
// Putting the page into separate component as it uses "use client" which doesn't work with `generateMetadata`
import { ContractPage as ContractP } from "@/components/pages/ContractPage";
import { generateMetadata as layoutGenerateMetadata } from "./layout";

interface PageProps {
  params: { address: string; chainId: number };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({
  params: { address, chainId },
}: PageProps): Promise<Metadata> {
  let title = `Contract ${address} | Swiss-Knife.xyz`;

  // add contract name to the title if possible
  let contractName = undefined as string | undefined;
  try {
    const fetchedAbi = await fetchContractAbi({
      address,
      chainId,
    });
    contractName = fetchedAbi?.name;
  } catch {}

  if (contractName) {
    title = `${contractName} - ${address} | Swiss-Knife.xyz`;
  }

  const layoutMetadata = await layoutGenerateMetadata({ params: { address } });

  return getMetadata({
    title,
    description: layoutMetadata.description as string,
    images: layoutMetadata.openGraph?.images as string,
  });
}

const ContractPage = ({
  params,
}: {
  params: {
    address: string;
    chainId: string;
  };
}) => {
  return (
    <ContractP
      params={{
        address: params.address,
        chainId: parseInt(params.chainId),
      }}
    />
  );
};
export default ContractPage;
