import { getMetadata } from "@/utils";
import { CalldataLayout as CalldataLayoutC } from "./CalldataLayout";

export const metadata = getMetadata({
  title: "Calldata Decoder | ETH.sh",
  description:
    "Decode any calldata, and view the parameters in a human-readable format, even without having the contract ABI with this Calldata Decoder.",
  canonical: "https://calldata.eth.sh/",
  images: "https://eth.sh/api/og/calldata-decoder",
});

const CalldataLayout = ({ children }: { children: React.ReactNode }) => {
  return <CalldataLayoutC>{children}</CalldataLayoutC>;
};

export default CalldataLayout;
