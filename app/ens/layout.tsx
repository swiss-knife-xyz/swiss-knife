import { ENSLayout as ENSLayoutC } from "@/components/layouts/ENSLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "ENS | Swiss-Knife.xyz",
  description:
    "Tools for Ethereum Name Service (ENS) - View content hash changes and more.",
  images: "https://swiss-knife.xyz/og/ens.png",
});

const ENSLayout = ({ children }: { children: React.ReactNode }) => {
  return <ENSLayoutC>{children}</ENSLayoutC>;
};

export default ENSLayout;
