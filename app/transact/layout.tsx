import { TransactLayout as TransactLayoutC } from "@/components/layouts/TransactLayout";
import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Transact | Swiss-Knife.xyz",
  description:
    "Send custom bytes calldata to transact with any contract, or leave the address blank to deploy a new contract.",
  images: "https://swiss-knife.xyz/og/transact.png",
});

const TransactLayout = ({ children }: { children: React.ReactNode }) => {
  return <TransactLayoutC>{children}</TransactLayoutC>;
};

export default TransactLayout;
