import { getMetadata } from "@/utils";
import { CalldataLayout as CalldataLayoutC } from "./CalldataLayout";

export const metadata = getMetadata({
  title: "ETH Calldata Decoder | Swiss-Knife.xyz",
  description:
    "Decode any calldata, and view the parameters in a human-readable format, even without having the contract ABI with this Universal ETH Calldata Decoder.",
  images: "https://swiss-knife.xyz/og/calldata-decoder.png",
});

const CalldataLayout = ({ children }: { children: React.ReactNode }) => {
  return <CalldataLayoutC>{children}</CalldataLayoutC>;
};

export default CalldataLayout;
