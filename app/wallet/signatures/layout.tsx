import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Signatures | Swiss-Knife.xyz",
  description: "Sign and Verify any message or 712 Typed Data",
  images: "https://swiss-knife.xyz/og/wallet-signatures.png",
});

const WalletSignaturesLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default WalletSignaturesLayout;
