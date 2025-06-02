import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "7702 Beat | Swiss-Knife.xyz",
  description: "Stats about 7702 adoption across EVM chains, Wallets and Dapps",
  images: "https://swiss-knife.xyz/og/7702beat.png",
});

const SevenSevenZeroTwoBeatLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default SevenSevenZeroTwoBeatLayout;
