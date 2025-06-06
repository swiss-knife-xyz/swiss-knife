import { getMetadata } from "@/utils";
import { FoundryLayout as FoundryLayoutC } from "./FoundryLayout";

export const metadata = getMetadata({
  title: "Foundry | Swiss-Knife.xyz",
  description:
    "Foundry tools to easily visualize and collapse stack traces, and more.",
  images: "https://swiss-knife.xyz/og/foundry.png",
});

const FoundryLayout = ({ children }: { children: React.ReactNode }) => {
  return <FoundryLayoutC>{children}</FoundryLayoutC>;
};

export default FoundryLayout;
