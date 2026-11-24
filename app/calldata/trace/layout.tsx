import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Transaction Tracer | ETH.sh",
  description:
    "Inspect EVM transaction call trees, calldata, return values and reverts. Fetch a call trace from your RPC or import Geth callTracer JSON.",
  canonical: "https://calldata.eth.sh/trace",
  images: "https://eth.sh/api/og/calldata-trace",
});

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
