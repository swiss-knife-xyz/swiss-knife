import { getMetadata } from "@/utils";
import { TransactLayout as TransactLayoutC } from "./TransactLayout";

export const metadata = getMetadata({
  title: "Transact | ETH.sh",
  description:
    "Send custom bytes calldata to transact with any contract, or leave the address blank to deploy a new contract.",
  canonical: "https://tx.eth.sh/",
  images: "https://eth.sh/api/og/tx",
});

const TransactLayout = ({ children }: { children: React.ReactNode }) => {
  return <TransactLayoutC>{children}</TransactLayoutC>;
};

export default TransactLayout;
