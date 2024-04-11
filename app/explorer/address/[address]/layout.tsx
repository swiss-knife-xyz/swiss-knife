import { getMetadata } from "@/utils";

export async function generateMetadata({
  params: { address },
}: {
  params: { address: string };
}) {
  return getMetadata({
    title: `Address ${address} | Swiss-Knife.xyz`,
    description:
      "Quickly view any address/ens or transaction across ALL EVM explorers, in just a click!",
    images: `https://swiss-knife.xyz/api/og?explorerType=${"address"}&value=${address}`,
  });
}

const AddressExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default AddressExplorerLayout;
