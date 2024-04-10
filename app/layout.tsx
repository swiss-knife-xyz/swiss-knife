import { IndexLayout as IndexLayoutC } from "@/components/layouts/IndexLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Swiss-Knife.xyz | All your Ethereum dev tools at one place!",
  description: "All your Ethereum dev tools at one place!",
  images: "https://swiss-knife.xyz/og/index.png",
});

const IndexLayout = ({ children }: { children: React.ReactNode }) => {
  return <IndexLayoutC>{children}</IndexLayoutC>;
};

export default IndexLayout;
