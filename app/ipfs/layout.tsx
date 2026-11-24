import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "IPFS Gateways | ETH.sh",
  description:
    "Open an IPFS hash, ipfs:// link, or gateway URL through multiple public gateways. Supports CIDv0, CIDv1, and file paths.",
  canonical: "https://ipfs.eth.sh/",
  images: "https://eth.sh/api/og/ipfs",
});

export default function IPFSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
