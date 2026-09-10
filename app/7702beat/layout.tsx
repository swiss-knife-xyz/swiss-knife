import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "7702 Beat | ETH.sh",
  description: "Stats about 7702 adoption across EVM chains, Wallets and Dapps",
  images: "https://eth.sh/og/7702beat.png",
});

const SevenSevenZeroTwoBeatLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default SevenSevenZeroTwoBeatLayout;
