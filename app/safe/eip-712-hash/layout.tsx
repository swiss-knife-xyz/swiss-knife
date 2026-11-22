import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Safe Transaction & EIP-712 Hash Verifier | ETH.sh",
  description:
    "Calculate Safe 1.3.0 / 1.4.1 transaction hashes locally from manual parameters, or verify arbitrary EIP-712 typed data, domain and message hashes.",
  canonical: "https://safe.eth.sh/eip-712-hash",
  images: "https://eth.sh/api/og/safe-eip-712-hash",
});

const EIP712HashLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EIP712HashLayout;
