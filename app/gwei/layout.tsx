import { Metadata } from "next";
import { getMetadata } from "@/utils";

const metadataInfo = {
  title: "Gwei Name Migration | ETH.sh",
  description:
    "Register a .gwei name and migrate ENS website, avatar, and primary identity records.",
  images: "https://eth.sh/api/og/gwei",
};

export const metadata: Metadata = {
  ...getMetadata(metadataInfo),
};

const GweiLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default GweiLayout;
