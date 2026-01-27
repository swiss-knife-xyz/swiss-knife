import { getMetadata } from "@/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return getMetadata({
    title: `Contract ${address} | ETH.sh`,
    description:
      "Best UI to interact with smart contracts. Read & Write contract functions with human readable output!",
    images: `https://eth.sh/og/contract.png`, // FIXME: add meta image for contract explorer page
  });
}

const ContractLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ContractLayout;
