import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Send Transaction | ETH.sh",
  description: "Send custom calldata to a contract or deploy a contract with raw bytecode.",
  canonical: "https://transact.eth.sh/send-tx",
  images: "https://eth.sh/api/og/transact-send-tx",
});

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
