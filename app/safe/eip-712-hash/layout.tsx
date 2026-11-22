import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "EIP-712 Hash Verifier | ETH.sh",
  description:
    "Hash & Verify EIP-712 typed data: Domain Hash, Message Hash, and EIP-712 Signature Hash.",
  canonical: "https://safe.eth.sh/eip-712-hash",
  images: "https://eth.sh/api/og/safe-eip-712-hash",
});

const EIP712HashLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EIP712HashLayout;
