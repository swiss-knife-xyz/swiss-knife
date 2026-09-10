import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Epoch Converter | ETH.sh",
  description:
    "Convert unix timestamp to human-readable date or Get Ethereum block number for a given date & time.",
  images: "https://eth.sh/og/epoch-converter.png",
});

const EpochConverterLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default EpochConverterLayout;
