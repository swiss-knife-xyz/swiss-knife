import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Safe Calldata Decoder | Swiss-Knife.xyz",
  description:
    "Decode any Safe{Wallet} tx calldata, and view the parameters in a human-readable format, even without having the contract ABI.",
  images: "https://swiss-knife.xyz/og/safe-calldata-decoder.png",
});

const SafeCalldataDecoderLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default SafeCalldataDecoderLayout;
