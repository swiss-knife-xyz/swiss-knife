import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Signatures | ETH.sh",
  description: "Sign and Verify any message or 712 Typed Data",
  canonical: "https://wallet.eth.sh/signatures",
  images: "https://eth.sh/og/wallet-signatures.png",
});

const WalletSignaturesLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default WalletSignaturesLayout;
