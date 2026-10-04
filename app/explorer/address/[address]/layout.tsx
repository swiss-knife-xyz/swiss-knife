import { getMetadata } from "@/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return getMetadata({
    canonical: `https://explorer.eth.sh/address/${address}`,
    title: `Address ${address} | ETH.sh`,
    description:
      "Quickly view any address/ens or transaction across ALL EVM explorers, in just a click!",
    images: `https://eth.sh/api/og?explorerType=${"address"}&value=${address}`,
  });
}

const AddressExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default AddressExplorerLayout;
