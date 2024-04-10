import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Padding | Swiss-Knife.xyz",
  description: "Left or Right pad any hex value by 32 bytes.",
  images: "https://swiss-knife.xyz/og/converter-padding.png",
});

const PaddingLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PaddingLayout;
