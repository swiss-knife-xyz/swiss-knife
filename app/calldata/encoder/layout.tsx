import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Calldata Encoder | ETH.sh",
  description: "Encode smart contract function arguments into Ethereum transaction calldata.",
  canonical: "https://calldata.eth.sh/encoder",
  images: "https://eth.sh/api/og/calldata-encoder",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
