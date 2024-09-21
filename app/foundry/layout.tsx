import { FoundryLayout as FoundryLayoutC } from "@/components/layouts/FoundryLayout";
import { getMetadata } from "@/utils";

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
