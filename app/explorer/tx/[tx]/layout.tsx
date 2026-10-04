import { getMetadata } from "@/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tx: string }>;
}) {
  const { tx } = await params;
  return getMetadata({
    canonical: `https://explorer.eth.sh/tx/${tx}`,
    title: `Transaction ${tx} | ETH.sh`,
    description:
      "Quickly view any address/ens or transaction across ALL EVM explorers, in just a click!",
    images: `https://eth.sh/api/og?explorerType=${"tx"}&value=${tx}`,
  });
}

const TransactionExplorerLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default TransactionExplorerLayout;
