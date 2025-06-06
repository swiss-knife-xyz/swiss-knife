import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Signatures | Swiss-Knife.xyz",
  description: "View signatures",
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
