import { getMetadata } from "@/utils";
import { FoundryLayout as FoundryLayoutC } from "./FoundryLayout";

export const metadata = getMetadata({
  title: "Foundry | ETH.sh",
  description:
    "Foundry tools to easily visualize and collapse stack traces, and more.",
  images: "https://eth.sh/og/foundry.png",
});

const FoundryLayout = ({ children }: { children: React.ReactNode }) => {
  return <FoundryLayoutC>{children}</FoundryLayoutC>;
};

export default FoundryLayout;
