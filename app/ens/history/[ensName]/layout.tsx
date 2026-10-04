import { getMetadata } from "@/utils";

export async function generateMetadata({ params }: { params: Promise<{ ensName: string }> }) {
  const { ensName } = await params;
  return getMetadata({
    title: `${ensName} ENS History | ETH.sh`,
    description: `Explore ownership and content history for ${ensName} on Ethereum Name Service.`,
    canonical: `https://ens.eth.sh/history/${encodeURIComponent(ensName)}`,
    images: "https://eth.sh/og/ens-history.png",
  });
}

export default function ENSRecordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
