import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Padding | ETH.sh",
  description: "Left or Right pad any hex value by 32 bytes.",
  images: "https://eth.sh/og/converter-padding.png",
});

const PaddingLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PaddingLayout;
