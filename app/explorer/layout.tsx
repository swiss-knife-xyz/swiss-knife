import { getMetadata } from "@/utils";
import { ExplorerLayout as ExplorerLayoutC } from "./ExplorerLayout";

export const metadata = getMetadata({
  title: "Explorer | Swiss-Knife.xyz",
  description:
    "Quickly view any address/ens or transaction across ALL EVM explorers, in just a click!",
  images: "https://swiss-knife.xyz/og/explorer.png",
});

const ExplorerLayout = ({ children }: { children: React.ReactNode }) => {
  return <ExplorerLayoutC>{children}</ExplorerLayoutC>;
};

export default ExplorerLayout;
