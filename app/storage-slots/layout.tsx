import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Storage Slots | ETH.sh",
  description:
    "Query custom, EIP-1967, or ERC-7201 storage slots for any EVM smart contract.",
  images: "https://eth.sh/og/storage-slots.png",
});

const StorageSlotsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default StorageSlotsLayout;
