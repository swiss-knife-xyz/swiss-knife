import { ENSHistoryLayout as ENSHistoryLayoutC } from "./ENSHistoryLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "ENS History | Swiss-Knife.xyz",
  description:
    "View ENS history & check IPFS content changes, ownership transfers and more.",
  images: "https://swiss-knife.xyz/og/ens-history.png",
});

const ENSHistoryLayout = ({ children }: { children: React.ReactNode }) => {
  return <ENSHistoryLayoutC>{children}</ENSHistoryLayoutC>;
};

export default ENSHistoryLayout;
