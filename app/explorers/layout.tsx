import { getMetadata } from "@/utils";
import { ExplorerLayout as ExplorerLayoutC } from "./ExplorerLayout";

export const metadata = getMetadata({
  title: "Explorer Directory | ETH.sh",
  description:
    "Quickly view any address/ens or transaction across ALL EVM explorers, in just a click!",
  canonical: "https://eth.sh/explorers",
  images: "https://eth.sh/api/og/explorers",
});

const ExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <ExplorerLayoutC>{children}</ExplorerLayoutC>;
};

export default ExplorerLayout;
