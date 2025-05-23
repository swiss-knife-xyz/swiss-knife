import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "712 Hash | Swiss-Knife.xyz",
  description:
    "Verify and inspect EIP-712 typed data hashes for secure message signing and validation.",
  images: "https://swiss-knife.xyz/og/712hash.png",
});

const SevenOneTwoHashLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default SevenOneTwoHashLayout;
