import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "EIP-712 Hash Verifier | Swiss-Knife.xyz",
  description:
    "Hash & Verify EIP-712 typed data: Domain Hash, Message Hash, and EIP-712 Signature Hash.",
  images: "https://swiss-knife.xyz/og/safe-eip-712-hash.png",
});

const EIP712HashLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EIP712HashLayout;
