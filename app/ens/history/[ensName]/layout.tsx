import { getMetadata } from "@/utils";
import { decodeEnsRouteName } from "../lib/history";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ensName: string }>;
}) {
  const routeParams = await params;
  const ensName = decodeEnsRouteName(routeParams.ensName);
  return getMetadata({
    title: `${ensName} ENS History | ETH.sh`,
    description: `Explore ownership and content history for ${ensName} on Ethereum Name Service.`,
    canonical: `https://ens.eth.sh/history/${encodeURIComponent(ensName)}`,
    images: "https://eth.sh/og/ens-history.png",
  });
}

export default function ENSRecordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
