import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Storage Slots | Swiss-Knife.xyz",
  description:
    "Query custom storage slots or EIP-1967 slots for any EVM smart contract.",
  images: "https://swiss-knife.xyz/og/storage-slots.png",
});

const StorageSlotsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default StorageSlotsLayout;
