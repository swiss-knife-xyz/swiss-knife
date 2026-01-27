import type { Metadata } from "next";
import { fetchContractAbi, getMetadata } from "@/utils";
import { Layout } from "@/components/Layout";
// Putting the page into separate component as it uses "use client" which doesn't work with `generateMetadata`
import { ContractPage as ContractP } from "./ContractPage";
import { generateMetadata as layoutGenerateMetadata } from "./layout";
import { Box, Heading } from "@chakra-ui/react";

interface PageProps {
  params: Promise<{ address: string; chainId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { address, chainId } = await params;
  let title = `Contract ${address} | ETH.sh`;

  // add contract name to the title if possible
  let contractName = undefined as string | undefined;
  try {
    const fetchedAbi = await fetchContractAbi({
      address,
      chainId: parseInt(chainId),
    });
    contractName = fetchedAbi?.name;
  } catch {}

  if (contractName) {
    title = `${contractName} - ${address} | ETH.sh`;
  }

  const layoutMetadata = await layoutGenerateMetadata({
    params: Promise.resolve({ address }),
  });

  return getMetadata({
    title,
    description: layoutMetadata.description as string,
    images: layoutMetadata.openGraph?.images as string,
  });
}

const ContractPage = async ({
  params,
}: {
  params: Promise<{
    address: string;
    chainId: string;
  }>;
}) => {
  const { address, chainId } = await params;
  return (
    <Layout>
      <Heading mb={4} color={"custom.pale"}>
        Contract Explorer
      </Heading>
      <ContractP
        params={{
          address,
          chainId: parseInt(chainId),
        }}
      />
    </Layout>
  );
};
export default ContractPage;
