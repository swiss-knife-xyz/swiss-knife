import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Forge Stack Tracer UI | ETH.sh",
  description: "Easily visualize and collapse forge tests stack traces.",
  images: "https://eth.sh/og/foundry-forge-stack-tracer-ui.png",
});

const ForgeStackTracerUILayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default ForgeStackTracerUILayout;
