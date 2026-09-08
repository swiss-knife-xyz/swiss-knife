import type { Metadata } from "next";
import { fetchContractAbi, getMetadata } from "@/utils";
import { Layout } from "@/components/Layout";
// Putting the page into separate component as it uses "use client" which doesn't work with `generateMetadata`
import { ContractPage as ContractP } from "./ContractPage";
import { generateMetadata as layoutGenerateMetadata } from "./layout";
import { Box, Heading } from "@chakra-ui/react";
import NextLink from "next/link";

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
      <Box w="full" maxW="70rem" mx="auto">
        <NextLink href="/contract">
          <Heading mb={4} color={"custom.pale"} _hover={{ opacity: 0.8 }} cursor="pointer">
            Contract Explorer
          </Heading>
        </NextLink>
      </Box>
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
