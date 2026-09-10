import { getMetadata } from "@/utils";
import { Metadata } from "next";

const _metadataInfo = {
  title: "Migrate Tokens | ETH.sh",
  description:
    "Sweep tokens out of any wallet to a single receiver address in one click. Batches transfers via ERC-5792 when supported.",
  images: "https://eth.sh/og/migrate.png",
};

export const metadata: Metadata = {
  ...getMetadata(_metadataInfo),
};

const MigrateLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default MigrateLayout;
