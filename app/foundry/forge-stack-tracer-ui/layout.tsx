import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Forge Stack Tracer UI | ETH.sh",
  description: "Easily visualize and collapse forge tests stack traces.",
  canonical: "https://foundry.eth.sh/forge-stack-tracer-ui",
  images: "https://eth.sh/api/og/foundry-forge-stack-tracer-ui",
});

const ForgeStackTracerUILayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default ForgeStackTracerUILayout;
