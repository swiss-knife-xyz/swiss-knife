import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Forge Stack Tracer UI | Swiss-Knife.xyz",
  description: "Easily visualize and collapse forge tests stack traces.",
  images: "https://swiss-knife.xyz/og/foundry-forge-stack-tracer-ui.png",
});

const ForgeStackTracerUILayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default ForgeStackTracerUILayout;
