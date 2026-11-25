import { getMetadata } from "@/utils";
import { TraceLayout } from "./TraceLayout";

export const metadata = getMetadata({
  title: "Transaction Tracer | ETH.sh",
  description:
    "Inspect EVM transaction call trees, calldata, return values and reverts. Fetch a call trace from your RPC or import Geth callTracer JSON.",
  canonical: "https://trace.eth.sh/",
  images: "https://eth.sh/api/og/trace",
});

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TraceLayout>{children}</TraceLayout>;
}
