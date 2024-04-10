import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Calldata Decoder | Swiss-Knife.xyz",
  description:
    "Decode any calldata, and view the parameters in a human-readable format, even without having the contract ABI.",
  images: "https://swiss-knife.xyz/og/calldata-decoder.png",
});

const CalldataDecoderLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default CalldataDecoderLayout;
