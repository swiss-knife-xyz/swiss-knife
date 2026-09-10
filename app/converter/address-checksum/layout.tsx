import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Address Checksum | ETH.sh",
  description:
    "Convert Ethereum address from lowercase to checksum address and vice versa.",
  images: "https://eth.sh/og/converter-address-checksum.png",
});

const AddressChecksumLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default AddressChecksumLayout;
