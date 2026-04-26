import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Constants | ETH.sh",
  description:
    "Frequently used ethereum constants in one place like zero address, max uint256 value and more.",
  images: "https://eth.sh/og/constants.png",
});

const ConstantsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ConstantsLayout;
